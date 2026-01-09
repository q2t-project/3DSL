Option Explicit

' =========================================================
' 3DSS xlsx <-> json  (v4: raw_json + mapping sheet + diff overwrite)
'
' - points/lines: row1 = UI headers, row4.. = data
' - raw_json: stores original node json per row (hidden)
' - touch_mask: export-time debug info (hidden)
' - mapping sheet: "mapping" (hidden) defines UI<->json paths
'
' Export policy:
' - empty cell = do not touch (keep raw_json value)
' - literal "null" (case-insensitive) = write null
' - literal "__UNSET__" = delete property (object keys only)
'
' NOTE: This module requires VBA-JSON (JsonConverter.bas).
' =========================================================

Private Const SHEET_POINTS As String = "points"
Private Const SHEET_LINES  As String = "lines"
Private Const SHEET_AUX    As String = "aux"
Private Const SHEET_DOCMETA As String = "document_meta"
Private Const SHEET_MAPPING As String = "mapping"
Private Const SHEET_AUDIT  As String = "touch_audit"

Private Const AUDIT_VALUE_MAX As Long = 1500

Private Const HDR_ROW As Long = 1
Private Const FIRST_DATA_ROW As Long = 4

Private Const COL_RAW_JSON As String = "raw_json"
Private Const COL_TOUCH_MASK As String = "touch_mask"

' ---------- Warnings (non-blocking) ----------
Private gWarnings As Collection

' ---------- GUID (module-level declarations must appear before any procedures) ----------

#If VBA7 Then
  Private Declare PtrSafe Function CoCreateGuid Lib "ole32" (ByRef pguid As GUID) As Long
  Private Declare PtrSafe Function StringFromGUID2 Lib "ole32" (ByRef rguid As GUID, ByVal lpstrClsId As LongPtr, ByVal cbMax As Long) As Long
#Else
  Private Declare Function CoCreateGuid Lib "ole32" (ByRef pguid As GUID) As Long
  Private Declare Function StringFromGUID2 Lib "ole32" (ByRef rguid As GUID, ByVal lpstrClsId As Long, ByVal cbMax As Long) As Long
#End If

Private Type GUID
  Data1 As Long
  Data2 As Integer
  Data3 As Integer
  Data4(0 To 7) As Byte
End Type

Private Sub ResetWarnings()
  Set gWarnings = New Collection
End Sub

Private Sub WarnAt(ByVal ws As Worksheet, ByVal r As Long, ByVal msg As String)
  If gWarnings Is Nothing Then Set gWarnings = New Collection
  gWarnings.Add ws.Name & " row " & CStr(r) & ": " & msg
End Sub

Private Function WarningsToText(Optional ByVal maxLines As Long = 25) As String
  If gWarnings Is Nothing Then Exit Function
  Dim i As Long, n As Long
  n = gWarnings.Count
  Dim lim As Long: lim = n
  If maxLines > 0 And lim > maxLines Then lim = maxLines
  Dim out As String: out = ""
  For i = 1 To lim
    out = out & " - " & CStr(gWarnings(i)) & vbCrLf
  Next i
  If lim < n Then out = out & " ... (" & CStr(n - lim) & " more)" & vbCrLf
  WarningsToText = out
End Function

Private Function IsRelationKindAllowed(ByVal k As String) As Boolean
  Select Case LCase$(Trim$(k))
    Case "structural", "dynamic", "logical", "temporal", "meta"
      IsRelationKindAllowed = True
  End Select
End Function


' ---------- Public API ----------


' ---- No-arg wrappers (shown in Macro dialog) ----
Public Sub Import3DSSJson_Run()
  ' default: workbook folder + in.3dss.json
  Call Import3DSSJson("")
End Sub

Public Sub Export3DSSJson_Run()
  ' default: workbook folder + out.3dss.json
  Call Export3DSSJson("")
End Sub

' ---- Pick file wrappers (also shown in Macro dialog) ----
Public Sub Import3DSSJson_PickFile()
  Dim fd As Object
  Set fd = Application.FileDialog(3) ' 3 = msoFileDialogFilePicker
  With fd
    .Title = "Select 3DSS JSON to import"
    .AllowMultiSelect = False
    .Filters.Clear
    .Filters.Add "JSON", "*.json"
    If .Show <> -1 Then Exit Sub
    Call Import3DSSJson(.SelectedItems(1))
  End With
End Sub

Public Sub Export3DSSJson_PickFile()
  Dim fd As Object
  Set fd = Application.FileDialog(2) ' 2 = msoFileDialogSaveAs
  With fd
    .Title = "Save 3DSS JSON as"
    .InitialFileName = ThisWorkbook.Path & Application.PathSeparator & "out.3dss.json"
    If .Show <> -1 Then Exit Sub
    Call Export3DSSJson(.SelectedItems(1))
  End With
End Sub
Public Sub Import3DSSJson(Optional ByVal jsonPath As String = "")
  Dim baseDir As String: baseDir = ThisWorkbook.Path
  If Len(jsonPath) = 0 Then jsonPath = baseDir & Application.PathSeparator & "in.3dss.json"

  Dim txt As String: txt = LoadTextFileUtf8(jsonPath)
  Dim doc As Object: Set doc = JsonConverter.ParseJson(txt)

  WriteDocumentMeta doc
  WritePoints doc
  WriteLines doc
  WriteAux doc

  MsgBox "Import OK: " & jsonPath, vbInformation
End Sub

Public Sub Export3DSSJson(Optional ByVal jsonPath As String = "")
  Dim baseDir As String: baseDir = ThisWorkbook.Path
  ResetWarnings
  If UI_GetFlag("UI_DEBUG_ON", False) Then Audit_Reset

  If Len(jsonPath) = 0 Then jsonPath = baseDir & Application.PathSeparator & "out.3dss.json"

  Dim doc As Object: Set doc = CreateDict()

  ' Dictionary may store objects; use Set for object values (Runtime 450 guard)
  Dim dm As Object: Set dm = ReadDocumentMeta()
  Dim pts As Object: Set pts = ReadPoints()
  Dim lns As Object: Set lns = ReadLines()
  Dim ax As Object: Set ax = ReadAux()
  Set doc("document_meta") = dm
  Set doc("points") = pts
  Set doc("lines") = lns
  Set doc("aux") = ax

  Dim outTxt As String: outTxt = JsonConverter.ConvertToJson(doc, Whitespace:=2)
  SaveTextFileUtf8 jsonPath, outTxt

  Dim msg As String: msg = "Export OK: " & jsonPath
  Dim icon As VbMsgBoxStyle: icon = vbInformation
  If Not gWarnings Is Nothing Then
    If gWarnings.Count > 0 Then
      msg = msg & vbCrLf & vbCrLf & "Warnings:" & vbCrLf & WarningsToText(25)
      icon = vbExclamation
    End If
  End If

  MsgBox msg, icon
End Sub

' ---------- Document Meta (key/value rows) ----------

Private Sub WriteDocumentMeta(ByVal doc As Object)
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_DOCMETA)

  If Not HasKey(doc, "document_meta") Then Exit Sub
  Dim meta As Object: Set meta = doc("document_meta")

  Dim r As Long: r = 2
  Do While Len(CStr(ws.Cells(r, 1).Value)) > 0
    Dim k As String: k = CStr(ws.Cells(r, 1).Value)
    If HasKey(meta, k) Then
      ws.Cells(r, 2).Value = JsonValueToCell(meta(k))
    End If
    r = r + 1
  Loop
End Sub

Private Function ReadDocumentMeta() As Object
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_DOCMETA)
  Dim meta As Object: Set meta = CreateDict()

  Dim r As Long: r = 2
  Do While Len(CStr(ws.Cells(r, 1).Value)) > 0
    Dim k As String: k = CStr(ws.Cells(r, 1).Value)
    Dim v As Variant: v = ws.Cells(r, 2).Value

    If Not IsEmpty(v) And Len(Trim(CStr(v))) > 0 Then
      Dim tmp As Variant
      CellToJsonValueAny CStr(v), tmp
      If IsObject(tmp) Then
        Set meta(k) = tmp
      Else
        meta(k) = tmp
      End If
    End If
    r = r + 1
  Loop

  Set ReadDocumentMeta = meta
End Function

' ---------- Aux (raw json per row) ----------

Private Sub WriteAux(ByVal doc As Object)
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_AUX)
  ClearDataRows ws, 1

  If Not HasKey(doc, "aux") Then Exit Sub

  Dim aux As Object
  Set aux = doc("aux")

  Dim r As Long: r = FIRST_DATA_ROW
  Dim i As Long
  For i = 1 To aux.Count
    ws.Cells(r, 1).Value = JsonConverter.ConvertToJson(aux(i), Whitespace:=0)
    r = r + 1
  Next i
End Sub

Private Function ReadAux() As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_AUX)
  Dim out As New Collection

  Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
  Dim r As Long
  For r = FIRST_DATA_ROW To lastRow
    Dim s As String: s = Trim(CStr(ws.Cells(r, 1).Value))
    If Len(s) > 0 Then out.Add JsonConverter.ParseJson(s)
  Next r

  Set ReadAux = out
End Function

' ---------- Points / Lines (mapping-driven) ----------

Private Sub WritePoints(ByVal doc As Object)
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_POINTS)
  ClearDataRows ws, 200

  If Not HasKey(doc, "points") Then Exit Sub
  Dim arr As Object: Set arr = doc("points")

  Dim cols As Object: Set cols = BuildColIndex(ws)
  EnsureColumn ws, cols, COL_RAW_JSON
  EnsureColumn ws, cols, COL_TOUCH_MASK

  Dim map As Collection: Set map = GetMappingsForSheet(SHEET_POINTS)
  Dim r As Long: r = FIRST_DATA_ROW

  Dim i As Long
  For i = 1 To arr.Count
    Dim node As Object: Set node = arr(i)

    PutByHeader ws, cols, r, COL_RAW_JSON, JsonConverter.ConvertToJson(node, Whitespace:=0)
    PutByHeader ws, cols, r, COL_TOUCH_MASK, "{}"

    WriteNodeByMapping ws, cols, r, node, map
    r = r + 1
  Next i
End Sub

Private Sub WriteLines(ByVal doc As Object)
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_LINES)
  ClearDataRows ws, 400

  If Not HasKey(doc, "lines") Then Exit Sub
  Dim arr As Object: Set arr = doc("lines")

  Dim cols As Object: Set cols = BuildColIndex(ws)
  EnsureColumn ws, cols, COL_RAW_JSON
  EnsureColumn ws, cols, COL_TOUCH_MASK

  Dim map As Collection: Set map = GetMappingsForSheet(SHEET_LINES)
  Dim r As Long: r = FIRST_DATA_ROW

  Dim i As Long
  For i = 1 To arr.Count
    Dim node As Object: Set node = arr(i)

    PutByHeader ws, cols, r, COL_RAW_JSON, JsonConverter.ConvertToJson(node, Whitespace:=0)
    PutByHeader ws, cols, r, COL_TOUCH_MASK, "{}"

    WriteNodeByMapping ws, cols, r, node, map
    r = r + 1
  Next i
End Sub

Private Function ReadPoints() As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_POINTS)
  Dim cols As Object: Set cols = BuildColIndex(ws)
  EnsureColumn ws, cols, COL_RAW_JSON
  EnsureColumn ws, cols, COL_TOUCH_MASK

  Dim map As Collection: Set map = GetMappingsForSheet(SHEET_POINTS)
  Dim out As New Collection

  Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
  Dim r As Long
  For r = FIRST_DATA_ROW To lastRow
    Dim uuid As String: uuid = Trim(CStr(GetByHeader(ws, cols, r, "uuid")))
    Dim raw As String: raw = Trim(CStr(GetByHeader(ws, cols, r, COL_RAW_JSON)))

    If Len(uuid) = 0 And Len(raw) = 0 Then GoTo NextRow

    Dim node As Object
    If Len(raw) > 0 Then
      Set node = JsonConverter.ParseJson(raw)
    Else
      Set node = MakeEmptyPoint(uuid)
    End If

    Dim touched As Object: Set touched = CreateDict()
    ApplyEditsByMapping ws, cols, r, node, map, touched, "point", (Len(raw) = 0)
    PutByHeader ws, cols, r, COL_TOUCH_MASK, JsonConverter.ConvertToJson(touched, Whitespace:=0)
    If UI_GetFlag("UI_DEBUG_ON", False) Then Audit_LogTouchedRow ws.Name, uuid, raw, node, touched, map

    out.Add node
NextRow:
  Next r

  Set ReadPoints = out
End Function

Private Function ReadLines() As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_LINES)
  Dim cols As Object: Set cols = BuildColIndex(ws)
  EnsureColumn ws, cols, COL_RAW_JSON
  EnsureColumn ws, cols, COL_TOUCH_MASK

  Dim map As Collection: Set map = GetMappingsForSheet(SHEET_LINES)
  Dim out As New Collection

  Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
  Dim r As Long
  For r = FIRST_DATA_ROW To lastRow
    Dim uuid As String: uuid = Trim(CStr(GetByHeader(ws, cols, r, "uuid")))
    Dim raw As String: raw = Trim(CStr(GetByHeader(ws, cols, r, COL_RAW_JSON)))

    If Len(uuid) = 0 And Len(raw) = 0 Then GoTo NextRow

    Dim node As Object
    If Len(raw) > 0 Then
      Set node = JsonConverter.ParseJson(raw)
    Else
      Set node = MakeEmptyLine(uuid)
    End If

    Dim touched As Object: Set touched = CreateDict()
    ApplyEditsByMapping ws, cols, r, node, map, touched, "line", (Len(raw) = 0)
    PutByHeader ws, cols, r, COL_TOUCH_MASK, JsonConverter.ConvertToJson(touched, Whitespace:=0)
    If UI_GetFlag("UI_DEBUG_ON", False) Then Audit_LogTouchedRow ws.Name, uuid, raw, node, touched, map

    ' skip line if endpoints still missing (avoid obvious invalid output)
    If Not HasPath(node, "appearance.end_a") Or Not HasPath(node, "appearance.end_b") Then GoTo NextRow

    out.Add node
NextRow:
  Next r

  Set ReadLines = out
End Function

' ---------- Mapping engine ----------

Private Sub WriteNodeByMapping(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal map As Collection)
  Dim i As Long
  For i = 1 To map.Count
    Dim m As Object: Set m = map(i)
    Dim uiKey As String: uiKey = CStr(m("ui_key"))
    Dim path As String: path = CStr(m("json_path"))
    Dim vType As String: vType = CStr(m("value_type"))
    Dim handler As String: handler = ""
    On Error Resume Next
    handler = CStr(m("handler"))
    On Error GoTo 0

    If uiKey = COL_RAW_JSON Or uiKey = COL_TOUCH_MASK Then GoTo ContinueLoop

    Dim h As String: h = LCase$(Trim$(handler))
    Dim vt As String: vt = LCase$(Trim$(vType))

    ' group-handled (localized / relation / endpoints)
    If h = "localized" Or h = "relation" Or h = "endpoint" Then GoTo ContinueLoop
    If Left$(vt, 9) = "localized" Then GoTo ContinueLoop
    If Left$(vt, 9) = "endpoint_" Then GoTo ContinueLoop
    If Left$(uiKey, 9) = "relation_" Then GoTo ContinueLoop

    If h = "frames" Or uiKey = "frames_json" Then
      Dim vF As Variant: JsonGetByPathAny node, path, vF
      If Not IsEmpty(vF) Then PutByHeader ws, cols, r, uiKey, FramesToCell(vF)
    Else
      Dim v As Variant: JsonGetByPathAny node, path, v
      If Not IsEmpty(v) Then PutByHeader ws, cols, r, uiKey, JsonValueToCell(v)
    End If

ContinueLoop:
  Next i

  ' localized groups (points: name, lines: caption)
  WriteLocalizedGroup ws, cols, r, node, "name", "signification.name"
  WriteLocalizedGroup ws, cols, r, node, "caption", "signification.caption"

  ' relation group (lines)
  WriteRelationGroup ws, cols, r, node

  ' endpoints group (lines)
  WriteEndpointGroup ws, cols, r, node, "end_a"
  WriteEndpointGroup ws, cols, r, node, "end_b"
End Sub

Private Sub ApplyEditsByMapping(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal map As Collection, ByVal touched As Object, ByVal nodeKind As String, ByVal isNewNode As Boolean)
  ' 1) direct / json / frames (group-handled keys are skipped)
  Dim i As Long
  For i = 1 To map.Count
    Dim m As Object: Set m = map(i)
    Dim uiKey As String: uiKey = CStr(m("ui_key"))
    Dim path As String: path = CStr(m("json_path"))
    Dim vType As String: vType = CStr(m("value_type"))
    Dim handler As String: handler = ""
    On Error Resume Next
    handler = CStr(m("handler"))
    On Error GoTo 0

    If uiKey = COL_RAW_JSON Or uiKey = COL_TOUCH_MASK Then GoTo ContinueLoop

    Dim h As String: h = LCase$(Trim$(handler))
    Dim vt As String: vt = LCase$(Trim$(vType))

    ' group-handled (localized / relation / endpoints)
    If h = "localized" Or h = "relation" Or h = "endpoint" Then GoTo ContinueLoop
    If Left$(vt, 9) = "localized" Then GoTo ContinueLoop
    If Left$(vt, 9) = "endpoint_" Then GoTo ContinueLoop
    If Left$(uiKey, 9) = "relation_" Then GoTo ContinueLoop

    Dim cellS As String: cellS = Trim(CStr(GetByHeader(ws, cols, r, uiKey)))
    If Len(cellS) = 0 Then GoTo ContinueLoop

    Dim sentinel As String: sentinel = UCase$(cellS)
    If sentinel = "__UNSET__" Then
      JsonDeleteByPath node, path
      touched(uiKey) = "__UNSET__"
      GoTo ContinueLoop
    End If

    Dim value As Variant
    If h = "frames" Or uiKey = "frames_json" Then
      ParseFramesCellAny cellS, value
    ElseIf h = "json" Or vt = "json" Or vt = "tags_json" Then
      CellToJsonValueAny cellS, value
    Else
      Dim t As String: t = TrimAllWs(cellS)
If Len(t) > 0 And (Left$(t, 1) = "[" Or Left$(t, 1) = "{") Then
  Call CellToJsonValueAny(t, value)
Else
  value = CellToTypedValue(t, vType)
End If
    End If

    If IsNull(value) Then
      JsonSetByPath node, path, Null
      touched(uiKey) = "null"
    Else
      JsonSetByPath node, path, value
      touched(uiKey) = cellS
    End If

ContinueLoop:
  Next i

  ' 2) localized groups
  ApplyLocalizedGroup ws, cols, r, node, "name", "signification.name", touched
  ApplyLocalizedGroup ws, cols, r, node, "caption", "signification.caption", touched

  ' 3) relation group
  ApplyRelationGroup ws, cols, r, node, touched

  ' 4) endpoints group
  ApplyEndpointGroup ws, cols, r, node, "end_a", touched
  ApplyEndpointGroup ws, cols, r, node, "end_b", touched

  ' 5) minimal defaults (when creating new)
  ' Minimal defaults are only applied when creating a NEW node (no raw_json)
  If isNewNode Then
    Dim k As String: k = LCase$(Trim$(nodeKind))
    If k = "point" Or k = "points" Then
      EnsureDefaultsPoint node
    ElseIf k = "line" Or k = "lines" Then
      EnsureDefaultsLine node
    End If
  End If
End Sub

' ---------- Group handlers ----------

Private Sub WriteLocalizedGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal baseKey As String, ByVal basePath As String)
  If Not HeaderExists(cols, baseKey) And Not HeaderExists(cols, baseKey & "_ja") And Not HeaderExists(cols, baseKey & "_en") Then Exit Sub
  Dim v As Variant: JsonGetByPathAny node, basePath, v
  If IsEmpty(v) Then Exit Sub

  If IsObject(v) Then
    PutByHeader ws, cols, r, baseKey & "_ja", GetDictString(v, "ja")
    PutByHeader ws, cols, r, baseKey & "_en", GetDictString(v, "en")
    ' baseKey is optional; keep empty to avoid width pressure
  Else
    PutByHeader ws, cols, r, baseKey, CStr(v)
  End If
End Sub

Private Sub ApplyLocalizedGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal baseKey As String, ByVal basePath As String, ByVal touched As Object)
  If Not HeaderExists(cols, baseKey) And Not HeaderExists(cols, baseKey & "_ja") And Not HeaderExists(cols, baseKey & "_en") Then Exit Sub

  Dim sBase As String: sBase = Trim(CStr(GetByHeader(ws, cols, r, baseKey)))
  Dim sJa As String: sJa = Trim(CStr(GetByHeader(ws, cols, r, baseKey & "_ja")))
  Dim sEn As String: sEn = Trim(CStr(GetByHeader(ws, cols, r, baseKey & "_en")))

  If Len(sBase) = 0 And Len(sJa) = 0 And Len(sEn) = 0 Then Exit Sub

  ' special tokens
  If UCase$(sBase) = "__UNSET__" Then
    JsonDeleteByPath node, basePath
    touched(baseKey) = "__UNSET__"
    Exit Sub
  End If
  If LCase$(sBase) = "null" Then
    JsonSetByPath node, basePath, Null
    touched(baseKey) = "null"
    Exit Sub
  End If

  If Len(sJa) > 0 Or Len(sEn) > 0 Then
    Dim o As Object: Set o = CreateDict()
    If Len(sJa) > 0 Then o("ja") = sJa
    If Len(sEn) > 0 Then o("en") = sEn
    JsonSetByPath node, basePath, o
    touched(baseKey & "_ja") = sJa
    touched(baseKey & "_en") = sEn
  Else
    JsonSetByPath node, basePath, sBase
    touched(baseKey) = sBase
  End If
End Sub

Private Sub WriteRelationGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object)
  If Not HeaderExists(cols, "relation_kind") And Not HeaderExists(cols, "relation_value") Then Exit Sub
  Dim rel As Variant: JsonGetByPathAny node, "signification.relation", rel
  If IsEmpty(rel) Or (Not IsObject(rel)) Then Exit Sub

  Dim k As String: k = FirstDictKey(rel)
  If Len(k) = 0 Then Exit Sub
  PutByHeader ws, cols, r, "relation_kind", k
  PutByHeader ws, cols, r, "relation_value", CStr(rel(k))
End Sub

Private Sub ApplyRelationGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal touched As Object)
  If Not HeaderExists(cols, "relation_kind") And Not HeaderExists(cols, "relation_value") Then Exit Sub

  Dim k As String: k = Trim(CStr(GetByHeader(ws, cols, r, "relation_kind")))
  Dim v As String: v = Trim(CStr(GetByHeader(ws, cols, r, "relation_value")))

  If Len(k) = 0 And Len(v) = 0 Then Exit Sub

  ' explicit unset (either column)
  If UCase$(k) = "__UNSET__" Or UCase$(v) = "__UNSET__" Then
    JsonDeleteByPath node, "signification.relation"
    touched("relation_kind") = "__UNSET__"
    touched("relation_value") = "__UNSET__"
    Exit Sub
  End If

  ' partial input => keep raw_json, only warn
  If (Len(k) = 0 And Len(v) > 0) Or (Len(k) > 0 And Len(v) = 0) Then
    Dim miss As String
    If Len(k) = 0 Then miss = "relation_kind" Else miss = "relation_value"
    WarnAt ws, r, "relation is partial (" & miss & " missing) -> kept raw_json"
    Exit Sub
  End If

  If Not IsRelationKindAllowed(k) Then
    WarnAt ws, r, "unknown relation_kind '" & k & "' -> exported as-is (final validator may fail)"
  End If

  Dim rel As Object: Set rel = CreateDict()
  rel(k) = v
  JsonSetByPath node, "signification.relation", rel
  touched("relation_kind") = k
  touched("relation_value") = v
End Sub

Private Sub WriteEndpointGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal whichEnd As String)
  Dim basePath As String: basePath = "appearance." & whichEnd
  Dim ep As Variant: JsonGetByPathAny node, basePath, ep
  If IsEmpty(ep) Or (Not IsObject(ep)) Then Exit Sub

  If HasKey(ep, "ref") Then
    PutByHeader ws, cols, r, whichEnd & "_ref", CStr(ep("ref"))
  End If
  If HasKey(ep, "coord") And IsObject(ep("coord")) Then
    Dim c As Object: Set c = ep("coord")
    If c.Count >= 3 Then
      PutByHeader ws, cols, r, whichEnd & "_x", c(1)
      PutByHeader ws, cols, r, whichEnd & "_y", c(2)
      PutByHeader ws, cols, r, whichEnd & "_z", c(3)
    End If
  End If
End Sub

Private Sub ApplyEndpointGroup(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal node As Object, ByVal whichEnd As String, ByVal touched As Object)
  Dim refS As String: refS = Trim(CStr(GetByHeader(ws, cols, r, whichEnd & "_ref")))
  Dim sx As String: sx = Trim(CStr(GetByHeader(ws, cols, r, whichEnd & "_x")))
  Dim sy As String: sy = Trim(CStr(GetByHeader(ws, cols, r, whichEnd & "_y")))
  Dim sz As String: sz = Trim(CStr(GetByHeader(ws, cols, r, whichEnd & "_z")))

  If Len(refS) = 0 And Len(sx) = 0 And Len(sy) = 0 And Len(sz) = 0 Then Exit Sub

  Dim basePath As String: basePath = "appearance." & whichEnd

  If UCase$(refS) = "__UNSET__" Then
    JsonDeleteByPath node, basePath
    touched(whichEnd & "_ref") = "__UNSET__"
    Exit Sub
  End If

  Dim ep As Object: Set ep = CreateDict()

  ' prefer ref if present
  If Len(refS) > 0 Then
    ep("ref") = refS
    JsonSetByPath node, basePath, ep
    touched(whichEnd & "_ref") = refS
    Exit Sub
  End If

  ' coord overlay (blank components keep existing if present)
  Dim coord As Collection
  Set coord = GetExistingVec3(node, basePath & ".coord")
  If coord Is Nothing Then Set coord = MakeVec3(0, 0, 0)

  ' NOTE: coord is an object (Collection). Use Set to avoid default-property calls.
  If Len(sx) > 0 Then Set coord = SetVec3Item(coord, 1, CellToJsonValue(sx)): touched(whichEnd & "_x") = sx
  If Len(sy) > 0 Then Set coord = SetVec3Item(coord, 2, CellToJsonValue(sy)): touched(whichEnd & "_y") = sy
  If Len(sz) > 0 Then Set coord = SetVec3Item(coord, 3, CellToJsonValue(sz)): touched(whichEnd & "_z") = sz

	Set ep("coord") = coord
  JsonSetByPath node, basePath, ep
End Sub

' ---------- Defaults ----------

Private Sub EnsureDefaultsPoint(ByVal node As Object)
  If Not HasPath(node, "meta") Then JsonSetByPath node, "meta", CreateDict()
  If Not HasPath(node, "signification") Then JsonSetByPath node, "signification", CreateDict()
  If Not HasPath(node, "appearance") Then JsonSetByPath node, "appearance", CreateDict()

  If Not HasPath(node, "meta.uuid") Then
    JsonSetByPath node, "meta.uuid", NewGuid()
  End If

  If Not HasPath(node, "appearance.position") Then
    JsonSetByPath node, "appearance.position", MakeVec3(0, 0, 0)
  End If

  If Not HasPath(node, "appearance.marker") Then
    Dim mk As Object: Set mk = CreateDict()
    mk("primitive") = "sphere"
    mk("radius") = 1#
    JsonSetByPath node, "appearance.marker", mk
  End If
End Sub

Private Sub EnsureDefaultsLine(ByVal node As Object)
  If Not HasPath(node, "meta") Then JsonSetByPath node, "meta", CreateDict()
  If Not HasPath(node, "signification") Then JsonSetByPath node, "signification", CreateDict()
  If Not HasPath(node, "appearance") Then JsonSetByPath node, "appearance", CreateDict()

  If Not HasPath(node, "meta.uuid") Then
    JsonSetByPath node, "meta.uuid", NewGuid()
  End If

  If Not HasPath(node, "appearance.line_type") Then JsonSetByPath node, "appearance.line_type", "straight"
  If Not HasPath(node, "appearance.line_style") Then JsonSetByPath node, "appearance.line_style", "solid"
End Sub

Private Function MakeEmptyPoint(ByVal uuid As String) As Object
  Dim n As Object: Set n = CreateDict()
  Dim meta As Object: Set meta = CreateDict()
  If Len(uuid) > 0 Then meta("uuid") = uuid
  Set n("meta") = meta
  Set n("signification") = CreateDict()
  Set n("appearance") = CreateDict()
  Set MakeEmptyPoint = n
End Function

Private Function MakeEmptyLine(ByVal uuid As String) As Object
  Dim n As Object: Set n = CreateDict()
  Dim meta As Object: Set meta = CreateDict()
  If Len(uuid) > 0 Then meta("uuid") = uuid
  Set n("meta") = meta
  Set n("signification") = CreateDict()
  Set n("appearance") = CreateDict()
  Set MakeEmptyLine = n
End Function

' ---------- Mapping sheet reader ----------

Private Function GetMappingsForSheet(ByVal sheetName As String) As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet(SHEET_MAPPING)
  Dim out As New Collection

  Dim r As Long: r = 2
  Do While Len(Trim(CStr(ws.Cells(r, 1).Value))) > 0
    If CStr(ws.Cells(r, 1).Value) = sheetName Then
      Dim m As Object: Set m = CreateDict()
      m("sheet") = CStr(ws.Cells(r, 1).Value)
      m("ui_key") = CStr(ws.Cells(r, 2).Value)
      m("json_path") = CStr(ws.Cells(r, 3).Value)
      m("value_type") = CStr(ws.Cells(r, 4).Value)
      m("handler") = CStr(ws.Cells(r, 5).Value)
      out.Add m
    End If
    r = r + 1
  Loop

  Set GetMappingsForSheet = out
End Function

' ---------- Sheet / header utilities ----------

Private Function EnsureSheet(ByVal name As String) As Worksheet
  On Error Resume Next
  Set EnsureSheet = ThisWorkbook.Worksheets(name)
  On Error GoTo 0
  If EnsureSheet Is Nothing Then
    Err.Raise vbObjectError + 513, , "Missing sheet: " & name
  End If
End Function

Private Function BuildColIndex(ByVal ws As Worksheet) As Object
  Dim d As Object: Set d = CreateDict()
  Dim c As Long
  For c = 1 To 200
    Dim k As String: k = Trim(CStr(ws.Cells(HDR_ROW, c).Value))
    If Len(k) > 0 Then d(k) = c
  Next c
  Set BuildColIndex = d
End Function

Private Function HeaderExists(ByVal cols As Object, ByVal key As String) As Boolean
  HeaderExists = HasKey(cols, key)
End Function

Private Sub EnsureColumn(ByVal ws As Worksheet, ByVal cols As Object, ByVal key As String)
  If HasKey(cols, key) Then Exit Sub

  Dim c As Long: c = ws.Cells(HDR_ROW, ws.Columns.Count).End(xlToLeft).Column
  If c < 1 Then c = 1
  c = c + 1
  ws.Cells(HDR_ROW, c).Value = key
  cols(key) = c

  ' keep technical columns hidden
  If key = COL_RAW_JSON Or key = COL_TOUCH_MASK Then
    ws.Columns(c).Hidden = True
    ws.Columns(c).ColumnWidth = 2
  End If
End Sub

Private Function GetByHeader(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal key As String) As Variant
  If Not HasKey(cols, key) Then
    GetByHeader = Empty
  Else
    GetByHeader = ws.Cells(r, cols(key)).Value
  End If
End Function

Private Sub PutByHeader(ByVal ws As Worksheet, ByVal cols As Object, ByVal r As Long, ByVal key As String, ByVal v As Variant)
  If Not HasKey(cols, key) Then Exit Sub
  ws.Cells(r, cols(key)).Value = v
End Sub

Private Sub ClearDataRows(ByVal ws As Worksheet, ByVal clearCols As Long)
  ' Clear data rows (contents only) under header/template rows.
  ' We must clear across *all mapped columns* (including hidden debug/detail cols),
  ' otherwise stale template values leak into Export even when user didn't edit.
  Dim lastHeaderCol As Long
  lastHeaderCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column

  Dim width As Long
  width = clearCols
  If lastHeaderCol > width Then width = lastHeaderCol
  If width < 1 Then Exit Sub

  ' Use Find() so we also clear rows where column A is blank but other mapped columns have stale values.
  Dim searchRange As Range
  Set searchRange = ws.Range(ws.Cells(FIRST_DATA_ROW, 1), ws.Cells(ws.Rows.Count, width))

  Dim lastCell As Range
  On Error Resume Next
  Set lastCell = searchRange.Find(What:="*", LookIn:=xlFormulas, LookAt:=xlPart, _
                                  SearchOrder:=xlByRows, SearchDirection:=xlPrevious, MatchCase:=False)
  On Error GoTo 0

  If lastCell Is Nothing Then Exit Sub

  ws.Range(ws.Cells(FIRST_DATA_ROW, 1), ws.Cells(lastCell.Row, width)).ClearContents
End Sub

' ---------- JSON path helpers ----------

Private Function HasPath(ByVal root As Object, ByVal path As String) As Boolean
  Dim v As Variant
  JsonGetByPathAny root, path, v
  HasPath = Not IsEmpty(v)
End Function

Private Function HasKey(ByVal d As Object, ByVal key As String) As Boolean
  On Error GoTo No
  HasKey = d.Exists(key)
  Exit Function
No:
  HasKey = False
End Function

Private Function CreateDict() As Object
  Set CreateDict = CreateObject("Scripting.Dictionary")
End Function
' Return JSON value at path into Variant safely (handles object values without Runtime 450)
Private Sub JsonGetByPathAny(ByVal root As Object, ByVal path As String, ByRef outV As Variant)
  Dim o As Object
  outV = Empty
  On Error Resume Next
  Set o = JsonGetByPath(root, path)
  If Err.Number = 0 Then
    Set outV = o
  Else
    Err.Clear
    outV = JsonGetByPath(root, path)
  End If
  On Error GoTo 0
End Sub


Private Function JsonGetByPath(ByVal root As Object, ByVal path As String) As Variant
  If root Is Nothing Then JsonGetByPath = Empty: Exit Function
  Dim cur As Variant: Set cur = root
  Dim parts() As String: parts = Split(path, ".")
  Dim i As Long
  For i = LBound(parts) To UBound(parts)
    Dim name As String: name = parts(i)
    Dim idx As Long: idx = -1
    Call SplitIndex(name, idx) ' modifies name / idx

    If Not IsObject(cur) Then
      JsonGetByPath = Empty
      Exit Function
    End If

    If TypeName(cur) = "Dictionary" Then
      If Not cur.Exists(name) Then
        JsonGetByPath = Empty
        Exit Function
      End If
      ' NOTE: Dictionary may store objects; assigning without Set can trigger default-property errors (Runtime 450).
      On Error Resume Next
      Set cur = cur(name)
      If Err.Number <> 0 Then
        Err.Clear
        cur = cur(name)
      End If
      On Error GoTo 0
    Else
      JsonGetByPath = Empty
      Exit Function
    End If

    If idx >= 0 Then
      If Not IsObject(cur) Or TypeName(cur) <> "Collection" Then
        JsonGetByPath = Empty
        Exit Function
      End If
      If cur.Count < idx + 1 Then
        JsonGetByPath = Empty
        Exit Function
      End If
      ' Collection may store objects; same Set/Let guard as above.
      On Error Resume Next
      Set cur = cur(idx + 1)
      If Err.Number <> 0 Then
        Err.Clear
        cur = cur(idx + 1)
      End If
      On Error GoTo 0
    End If
  Next i

  If IsObject(cur) Then
    Set JsonGetByPath = cur
  Else
    JsonGetByPath = cur
  End If
End Function

Private Sub JsonSetByPath(ByVal root As Object, ByVal path As String, ByVal value As Variant)
  ' Set value at dotted path, supporting array syntax: name[0].child
  ' - Uses Set for object values to avoid Runtime error 450.
  Dim parts() As String: parts = Split(path, ".")
  If UBound(parts) < 0 Then Exit Sub

  Dim cur As Object: Set cur = root
  Dim i As Long
  For i = LBound(parts) To UBound(parts)
    Dim name As String: name = parts(i)
    Dim idx As Long: idx = -1
    Call SplitIndex(name, idx)

    If TypeName(cur) <> "Dictionary" Then Exit Sub

    If i = UBound(parts) Then
      ' final segment
      If idx < 0 Then
        If IsObject(value) Then
          Set cur(name) = value
        Else
          cur(name) = value
        End If
      Else
        Dim coll As Collection
        If cur.Exists(name) And IsObject(cur(name)) And TypeName(cur(name)) = "Collection" Then
          Set coll = cur(name)
        Else
          Set coll = New Collection
        End If
        Set coll = SetCollectionItem0(coll, idx, value)
        Set cur(name) = coll
      End If
      Exit Sub
    End If

    ' intermediate: ensure next container exists
    If idx < 0 Then
      If Not cur.Exists(name) Or Not IsObject(cur(name)) Then
        Set cur(name) = CreateDict()
      End If
      Set cur = cur(name)
    Else
      Dim coll2 As Collection
      If cur.Exists(name) And IsObject(cur(name)) And TypeName(cur(name)) = "Collection" Then
        Set coll2 = cur(name)
      Else
        Set coll2 = New Collection
      End If

      ' ensure element is an object (Dictionary)
      Dim child As Object
      On Error Resume Next
      Set child = coll2(idx + 1)
      On Error GoTo 0
      If child Is Nothing Then
        Set child = CreateDict()
        Set coll2 = SetCollectionItem0(coll2, idx, child)
      End If

      Set cur(name) = coll2
      Set cur = child
    End If
  Next i
End Sub

Private Sub JsonDeleteByPath(ByVal root As Object, ByVal path As String)
  Dim parts() As String: parts = Split(path, ".")
  If UBound(parts) < 0 Then Exit Sub

  Dim cur As Variant: Set cur = root
  Dim i As Long
  For i = LBound(parts) To UBound(parts) - 1
    Dim name As String: name = parts(i)
    Dim idx As Long: idx = -1
    Call SplitIndex(name, idx)
    If Not IsObject(cur) Or TypeName(cur) <> "Dictionary" Then Exit Sub
    If Not cur.Exists(name) Then Exit Sub
    ' Dictionary may store objects; assigning without Set can trigger default-property errors (Runtime 450).
    On Error Resume Next
    Set cur = cur(name)
    If Err.Number <> 0 Then
      Err.Clear
      cur = cur(name)
    End If
    On Error GoTo 0
    If idx >= 0 Then
      If Not IsObject(cur) Or TypeName(cur) <> "Collection" Then Exit Sub
      If cur.Count < idx + 1 Then Exit Sub
      ' Collection may store objects; same Set/Let guard as above.
      On Error Resume Next
      Set cur = cur(idx + 1)
      If Err.Number <> 0 Then
        Err.Clear
        cur = cur(idx + 1)
      End If
      On Error GoTo 0
    End If
  Next i

  Dim last As String: last = parts(UBound(parts))
  Dim lastIdx As Long: lastIdx = -1
  Call SplitIndex(last, lastIdx)

  If Not IsObject(cur) Or TypeName(cur) <> "Dictionary" Then Exit Sub
  If lastIdx >= 0 Then
    ' do not support deleting inside arrays
    Exit Sub
  End If
  If cur.Exists(last) Then cur.Remove last
End Sub

Private Sub SplitIndex(ByRef name As String, ByRef idx As Long)
  idx = -1
  Dim p1 As Long: p1 = InStr(1, name, "[")
  If p1 = 0 Then Exit Sub
  Dim p2 As Long: p2 = InStr(p1 + 1, name, "]")
  If p2 = 0 Then Exit Sub
  idx = CLng(Mid$(name, p1 + 1, p2 - p1 - 1))
  name = Left$(name, p1 - 1)
End Sub

' ---------- Value conversion ----------


Private Function TrimWs(ByVal s As String) As String
  ' Trim ASCII spaces + tabs + CR/LF + NBSP (U+00A0)
  Dim i As Long, j As Long, n As Long
  n = Len(s)
  If n = 0 Then
    TrimWs = ""
    Exit Function
  End If

  i = 1
  Do While i <= n
    Dim c As String: c = Mid$(s, i, 1)
    If c = " " Or c = vbTab Or c = vbCr Or c = vbLf Or AscW(c) = 160 Then
      i = i + 1
    Else
      Exit Do
    End If
  Loop

  j = n
  Do While j >= i
    Dim d As String: d = Mid$(s, j, 1)
    If d = " " Or d = vbTab Or d = vbCr Or d = vbLf Or AscW(d) = 160 Then
      j = j - 1
    Else
      Exit Do
    End If
  Loop

  If j < i Then
    TrimWs = ""
  Else
    TrimWs = Mid$(s, i, j - i + 1)
  End If
End Function

' Normalize JSON-ish text coming from Excel cells (handles CR/LF/TAB/nbsp).
Private Function NormalizeJsonText(ByVal s As String) As String
  Dim t As String: t = s
  t = Replace(t, vbCrLf, vbLf)
  t = Replace(t, vbCr, vbLf)
  t = Replace(t, vbTab, " ")
  t = Replace(t, ChrW$(160), " ") ' nbsp
  NormalizeJsonText = t
End Function

Function TryParseJsonToVariant(ByVal s As String, ByRef outV As Variant) As Boolean
  On Error GoTo Fail1
  Dim s2 As String: s2 = NormalizeJsonText(s)

  Dim tmp As Variant
  Set tmp = JsonConverter.ParseJson(s2)
  Set outV = tmp
  TryParseJsonToVariant = True
  Exit Function

Fail1:
  ' Some JSON parsers are picky about CR/LF; try a second pass removing LFs.
  On Error GoTo Fail2
  Dim s3 As String: s3 = Replace(s2, vbLf, " ")
  Dim tmp2 As Variant
  Set tmp2 = JsonConverter.ParseJson(s3)
  Set outV = tmp2
  TryParseJsonToVariant = True
  Exit Function

Fail2:
  TryParseJsonToVariant = False
End Function

Private Function JsonValueToCell(ByVal v As Variant) As Variant
  If IsObject(v) Then
    JsonValueToCell = JsonConverter.ConvertToJson(v, Whitespace:=0)
  ElseIf IsNull(v) Then
    JsonValueToCell = "null"
  Else
    JsonValueToCell = v
  End If
End Function

Private Function CellToJsonValue(ByVal s As String) As Variant
  Dim t As String: t = TrimWs(s)
  If Len(t) = 0 Then
    CellToJsonValue = Empty
  ElseIf LCase$(t) = "null" Then
    CellToJsonValue = Null
  ElseIf Left$(t, 1) = "{" Or Left$(t, 1) = "[" Then
    Dim pv As Variant
    If TryParseJsonToVariant(t, pv) Then
      If IsObject(pv) Then
        Set CellToJsonValue = pv
      Else
        CellToJsonValue = pv
      End If
    Else
      CellToJsonValue = t
    End If
  ElseIf IsNumeric(t) Then
    CellToJsonValue = CDbl(t)
  ElseIf LCase$(t) = "true" Then
    CellToJsonValue = True
  ElseIf LCase$(t) = "false" Then
    CellToJsonValue = False
  Else
    CellToJsonValue = t
  End If
End Function

' Parse cell string into Variant, safely handling JSON objects/arrays (Runtime 450 guard).
' - outV may be scalar or Object (Dictionary/Collection)
' Parse cell string into Variant, safely handling JSON objects/arrays (Runtime 450 guard).
' - outV may be scalar or Object (Dictionary/Collection)
Private Sub CellToJsonValueAny(ByVal s As String, ByRef outV As Variant)
  Dim t As String: t = TrimAllWs(s)
  If Len(t) = 0 Then
    outV = Empty
  ElseIf LCase$(t) = "null" Then
    outV = Null
  ElseIf Left$(t, 1) = "{" Or Left$(t, 1) = "[" Then
    Dim pv As Variant
    If TryParseJsonToVariant(t, pv) Then
      If IsObject(pv) Then
        Set outV = pv
      Else
        outV = pv
      End If
    Else
      ' keep as string if parse fails
      outV = t
    End If
  ElseIf IsNumeric(t) Then
    outV = CDbl(t)
  ElseIf LCase$(t) = "true" Then
    outV = True
  ElseIf LCase$(t) = "false" Then
    outV = False
  Else
    outV = t
  End If
End Sub

Private Function CellToTypedValue(ByVal s As String, ByVal vType As String) As Variant
  Dim t As String: t = TrimWs(s)
  If LCase$(t) = "null" Then
    CellToTypedValue = Null
    Exit Function
  End If

  Dim vt As String: vt = LCase$(TrimWs(vType))

  Select Case vt
    Case "number"
      If IsNumeric(t) Then
        CellToTypedValue = CDbl(t)
      Else
        ' keep as string (intermediate may be invalid; validate outside)
        CellToTypedValue = t
      End If

    Case "int", "integer"
      If IsNumeric(t) Then
        CellToTypedValue = CLng(CDbl(t))
      Else
        CellToTypedValue = t
      End If

    Case "json"
      If Len(t) = 0 Then
        CellToTypedValue = Empty
      ElseIf Left$(t, 1) = "{" Or Left$(t, 1) = "[" Then
        Set CellToTypedValue = JsonConverter.ParseJson(t)
      Else
        CellToTypedValue = t
      End If

    Case "bool", "boolean"
      Select Case LCase$(t)
        Case "true", "1", "yes"
          CellToTypedValue = True
        Case "false", "0", "no"
          CellToTypedValue = False
        Case Else
          CellToTypedValue = t
      End Select

    Case Else
      ' Default: treat as string, but if it *looks like* JSON object/array and parses, keep as JSON.
      If Len(t) > 1 Then
        Dim head As String: head = Left$(t, 1)
        Dim tail As String: tail = Right$(t, 1)
        If (head = "[" And tail = "]") Or (head = "{" And tail = "}") Then
          Dim pv As Variant
          If TryParseJsonToVariant(t, pv) Then
            If IsObject(pv) Then
              Set CellToTypedValue = pv
            Else
              CellToTypedValue = pv
            End If
            Exit Function
          End If
        End If
      End If
      CellToTypedValue = t
  End Select
End Function

Private Function ParseFramesCell(ByVal s As String) As Variant
  Dim t As String: t = Trim$(s)
  If Len(t) = 0 Then
    ParseFramesCell = Empty
  ElseIf LCase$(t) = "null" Then
    ParseFramesCell = Null
  ElseIf Left$(t, 1) = "[" Then
    Set ParseFramesCell = JsonConverter.ParseJson(t)
  ElseIf InStr(1, t, ",") > 0 Then
    Dim parts() As String: parts = Split(t, ",")
    Dim c As New Collection
    Dim i As Long
    For i = LBound(parts) To UBound(parts)
      Dim p As String: p = Trim$(parts(i))
      If Len(p) > 0 Then
        If IsNumeric(p) Then
          c.Add CLng(p)
        Else
          ' keep original string if non-numeric appears
          ParseFramesCell = t
          Exit Function
        End If
      End If
    Next i
    Set ParseFramesCell = c
  ElseIf IsNumeric(t) Then
    ParseFramesCell = CLng(t)
  Else
    ' fallback: keep as string (may become invalid; validate later)
    ParseFramesCell = t
  End If
End Function

' Parse Frames cell (JSON array/dict or scalar) safely into Variant (may hold Object).
Private Sub ParseFramesCellAny(ByVal s As String, ByRef outV As Variant)
  Dim t As String: t = Trim$(s)
  If Len(t) = 0 Then
    outV = Empty
  ElseIf LCase$(t) = "null" Then
    outV = Null
  ElseIf Left$(t, 1) = "[" Or Left$(t, 1) = "{" Then
    Dim o As Object
    Set o = JsonConverter.ParseJson(t)
    Set outV = o
  ElseIf IsNumeric(t) Then
    outV = CDbl(t)
  Else
    outV = t
  End If
End Sub

Private Function FramesToCell(ByVal v As Variant) As Variant
  If IsObject(v) Then
    FramesToCell = JsonConverter.ConvertToJson(v, Whitespace:=0)
  Else
    FramesToCell = v
  End If
End Function

' ---------- Small helpers for dict/collections ----------

Private Function FirstDictKey(ByVal d As Object) As String
  Dim k As Variant
  For Each k In d.Keys
    FirstDictKey = CStr(k)
    Exit Function
  Next k
  FirstDictKey = ""
End Function

Private Function GetDictString(ByVal d As Object, ByVal key As String) As String
  If IsObject(d) And TypeName(d) = "Dictionary" Then
    If d.Exists(key) Then GetDictString = CStr(d(key)) Else GetDictString = ""
  Else
    GetDictString = ""
  End If
End Function

Private Function MakeVec3(ByVal x As Double, ByVal y As Double, ByVal z As Double) As Collection
  Dim c As New Collection
  c.Add x
  c.Add y
  c.Add z
  Set MakeVec3 = c
End Function

Private Function GetExistingVec3(ByVal node As Object, ByVal path As String) As Collection
  Dim v As Variant: JsonGetByPathAny node, path, v
  If IsEmpty(v) Then
    Set GetExistingVec3 = Nothing
  ElseIf IsObject(v) And TypeName(v) = "Collection" And v.Count >= 3 Then
    Set GetExistingVec3 = v
  Else
    Set GetExistingVec3 = Nothing
  End If
End Function

Private Function SetVec3Item(ByVal vec As Collection, ByVal idx1 As Long, ByVal value As Variant) As Collection
  Dim i As Long
  Dim out As New Collection
  For i = 1 To 3
    If i = idx1 Then
      out.Add value
    ElseIf vec.Count >= i Then
      out.Add vec(i)
    Else
      out.Add 0#
    End If
  Next i
  Set SetVec3Item = out
End Function

Private Function SetCollectionItem0(ByVal coll As Collection, ByVal idx0 As Long, ByVal value As Variant) As Collection
  Dim size As Long: size = coll.Count
  If size < idx0 + 1 Then size = idx0 + 1

  Dim i As Long
  Dim out As New Collection
  For i = 0 To size - 1
    If i = idx0 Then
      out.Add value
    ElseIf coll.Count >= i + 1 Then
      out.Add coll(i + 1)
    Else
      out.Add Null
    End If
  Next i

  Set SetCollectionItem0 = out
End Function

' ---------- UTF-8 I/O ----------

Private Function LoadTextFileUtf8(ByVal path As String) As String
  Dim stm As Object
  Set stm = CreateObject("ADODB.Stream")
  stm.Type = 2 ' text
  stm.Charset = "utf-8"
  stm.Open
  stm.LoadFromFile path
  LoadTextFileUtf8 = stm.ReadText(-1)
  stm.Close
End Function

Private Sub SaveTextFileUtf8(ByVal path As String, ByVal text As String)
  Dim stm As Object
  Set stm = CreateObject("ADODB.Stream")
  stm.Type = 2 ' text
  stm.Charset = "utf-8"
  stm.Open
  stm.WriteText text
  stm.SaveToFile path, 2 ' overwrite
  stm.Close
End Sub

' (GUID declarations moved to top of module)

Private Function NewGuid() As String
  Dim g As GUID
  Dim s As String
  Dim ret As Long
  Dim buf As String * 39

  ret = CoCreateGuid(g)
  If ret <> 0 Then
    NewGuid = ""
    Exit Function
  End If

  ret = StringFromGUID2(g, StrPtr(buf), 39)
  If ret = 0 Then
    NewGuid = ""
  Else
    s = Left$(buf, ret - 1)
    ' {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx} -> xxxxxxxx-....
    NewGuid = Mid$(s, 2, Len(s) - 2)
  End If
End Function



' ---------- Audit log (debug only; uses UI_DEBUG_ON) ----------

Private Sub Audit_Reset()
  Dim ws As Worksheet: Set ws = EnsureAuditSheet()
  ws.Cells.ClearContents
  ws.Cells(1, 1).Value = "json"
End Sub

Private Function EnsureAuditSheet() As Worksheet
  On Error Resume Next
  Set EnsureAuditSheet = ThisWorkbook.Worksheets(SHEET_AUDIT)
  On Error GoTo 0
  If EnsureAuditSheet Is Nothing Then
    Set EnsureAuditSheet = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    EnsureAuditSheet.Name = SHEET_AUDIT
    EnsureAuditSheet.Cells(1, 1).Value = "json"
    EnsureAuditSheet.Columns(1).ColumnWidth = 140
    EnsureAuditSheet.Visible = xlSheetHidden
  End If
End Function

Private Sub Audit_LogTouchedRow(ByVal sheetName As String, ByVal uuid As String, ByVal rawJson As String, ByVal afterNode As Object, ByVal touched As Object, ByVal map As Collection)
  On Error GoTo SafeExit
  If touched Is Nothing Then Exit Sub
  If touched.Count = 0 Then Exit Sub

  Dim beforeNode As Object
  If Len(rawJson) > 0 Then
    Set beforeNode = JsonConverter.ParseJson(rawJson)
  Else
    If sheetName = SHEET_LINES Then
      Set beforeNode = MakeEmptyLine(uuid)
    ElseIf sheetName = SHEET_POINTS Then
      Set beforeNode = MakeEmptyPoint(uuid)
    Else
      Set beforeNode = CreateDict()
    End If
  End If

  Dim k As Variant
  For Each k In touched.Keys
    Dim uiKey As String: uiKey = CStr(k)

    Dim m As Object: Set m = FindMapping(map, uiKey)
    Dim jsonPath As String: jsonPath = ""
    If Not m Is Nothing Then jsonPath = CStr(m("json_path"))

    Dim beforeVal As Variant: beforeVal = Audit_GetValue(sheetName, beforeNode, uiKey, jsonPath)
    Dim afterVal  As Variant: afterVal  = Audit_GetValue(sheetName, afterNode, uiKey, jsonPath)

    Audit_Append sheetName, uuid, uiKey, jsonPath, beforeVal, afterVal
  Next k

SafeExit:
End Sub

Private Function FindMapping(ByVal map As Collection, ByVal uiKey As String) As Object
  Dim i As Long
  For i = 1 To map.Count
    Dim m As Object: Set m = map(i)
    If CStr(m("ui_key")) = uiKey Then
      Set FindMapping = m
      Exit Function
    End If
  Next i
  Set FindMapping = Nothing
End Function

Private Function Audit_GetValue(ByVal sheetName As String, ByVal node As Object, ByVal uiKey As String, ByVal jsonPath As String) As Variant
  On Error GoTo Fail

  ' relation virtual fields -> actual signification.relation object
  If uiKey = "relation_kind" Then
    Audit_GetValue = Audit_RelationKind(node)
    Exit Function
  ElseIf uiKey = "relation_value" Then
    Audit_GetValue = Audit_RelationValue(node)
    Exit Function
  End If

  ' localized
  If Right$(uiKey, 3) = "_ja" Or Right$(uiKey, 3) = "_en" Then
    Dim lang As String: lang = IIf(Right$(uiKey, 3) = "_ja", "ja", "en")
    Audit_GetValue = Audit_LocalizedValue(node, jsonPath, lang)
    Exit Function
  End If

  ' endpoints (lines)
  If Left$(uiKey, 6) = "end_a_" Or Left$(uiKey, 6) = "end_b_" Then
    Audit_GetValue = Audit_EndpointValue(node, uiKey)
    Exit Function
  End If

  ' direct
  If Len(jsonPath) = 0 Then GoTo Fail
  Dim vDirect As Variant: JsonGetByPathAny node, jsonPath, vDirect
  Audit_GetValue = vDirect
  Exit Function

Fail:
  Audit_GetValue = Empty
End Function

Private Function Audit_RelationKind(ByVal node As Object) As Variant
  Dim v As Variant: JsonGetByPathAny node, "signification.relation", v
  If IsObject(v) Then
    Dim d As Object: Set d = v
    Dim kk As Variant
    For Each kk In d.Keys
      Audit_RelationKind = CStr(kk)
      Exit Function
    Next kk
  End If
  Audit_RelationKind = Empty
End Function

Private Function Audit_RelationValue(ByVal node As Object) As Variant
  Dim v As Variant: JsonGetByPathAny node, "signification.relation", v
  If IsObject(v) Then
    Dim d As Object: Set d = v
    Dim kk As Variant
    For Each kk In d.Keys
      Audit_RelationValue = d(kk)
      Exit Function
    Next kk
  End If
  Audit_RelationValue = Empty
End Function

Private Function Audit_LocalizedValue(ByVal node As Object, ByVal basePath As String, ByVal lang As String) As Variant
  If Len(basePath) = 0 Then Audit_LocalizedValue = Empty: Exit Function
  Dim v As Variant: JsonGetByPathAny node, basePath, v
  If IsObject(v) Then
    Dim d As Object: Set d = v
    If HasKey(d, lang) Then
      Audit_LocalizedValue = d(lang)
    Else
      Audit_LocalizedValue = Empty
    End If
  ElseIf IsEmpty(v) Then
    Audit_LocalizedValue = Empty
  Else
    ' plain string (no lang) -> treat as same for audit
    Audit_LocalizedValue = v
  End If
End Function

Private Function Audit_EndpointValue(ByVal node As Object, ByVal uiKey As String) As Variant
  Dim whichEnd As String
  Dim suffix As String
  If Left$(uiKey, 6) = "end_a_" Then
    whichEnd = "end_a"
    suffix = Mid$(uiKey, 7)
  ElseIf Left$(uiKey, 6) = "end_b_" Then
    whichEnd = "end_b"
    suffix = Mid$(uiKey, 7)
  Else
    Audit_EndpointValue = Empty
    Exit Function
  End If

  Dim ep As Variant: JsonGetByPathAny node, "appearance." & whichEnd, ep
  If Not IsObject(ep) Then Audit_EndpointValue = Empty: Exit Function
  Dim d As Object: Set d = ep

  If suffix = "ref" Then
    If HasKey(d, "ref") Then Audit_EndpointValue = d("ref") Else Audit_EndpointValue = Empty
    Exit Function
  End If

  If suffix = "x" Or suffix = "y" Or suffix = "z" Then
    If HasKey(d, "coord") And IsObject(d("coord")) Then
      Dim c As Object: Set c = d("coord")
      Dim idx As Long
            If suffix = "x" Then
        idx = 1
      ElseIf suffix = "y" Then
        idx = 2
      Else
        idx = 3
      End If
      If c.Count >= idx Then
        Audit_EndpointValue = c(idx)
      Else
        Audit_EndpointValue = Empty
      End If
    Else
      Audit_EndpointValue = Empty
    End If
    Exit Function
  End If

  ' fallback -> whole endpoint object
  Audit_EndpointValue = d
End Function

Private Sub Audit_Append(ByVal sheetName As String, ByVal uuid As String, ByVal uiKey As String, ByVal jsonPath As String, ByVal beforeVal As Variant, ByVal afterVal As Variant)
  Dim rec As Object: Set rec = CreateDict()
  rec("ts") = Audit_IsoNow()
  rec("sheet") = sheetName
  rec("row_id") = uuid
  rec("ui_key") = uiKey
  rec("json_path") = jsonPath

  Audit_AddValue rec, "before", beforeVal
  Audit_AddValue rec, "after", afterVal

  Dim ws As Worksheet: Set ws = EnsureAuditSheet()
  If ws.Cells(1, 1).Value <> "json" Then ws.Cells(1, 1).Value = "json"

  Dim r As Long: r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
  ws.Cells(r, 1).Value = JsonConverter.ConvertToJson(rec, Whitespace:=0)
End Sub

Private Sub Audit_AddValue(ByVal rec As Object, ByVal prefix As String, ByVal v As Variant)
  Dim missing As Boolean: missing = IsEmpty(v)
  rec(prefix & "_missing") = IIf(missing, 1, 0)

  Dim j As String
  If missing Then
    rec(prefix & "_json") = "null"
    Exit Sub
  End If

  j = Audit_ValueToJson(v)
  If Len(j) <= AUDIT_VALUE_MAX Then
    rec(prefix & "_json") = j
  Else
    rec(prefix & "_preview") = Left$(j, 400)
    rec(prefix & "_len") = Len(j)
    rec(prefix & "_hash") = Audit_Adler32(j)
  End If
End Sub

Private Function Audit_ValueToJson(ByVal v As Variant) As String
  If IsNull(v) Then
    Audit_ValueToJson = "null"
    Exit Function
  End If

  If IsObject(v) Then
    Audit_ValueToJson = JsonConverter.ConvertToJson(v, Whitespace:=0)
    Exit Function
  End If

  Select Case VarType(v)
    Case vbBoolean
      Audit_ValueToJson = IIf(CBool(v), "true", "false")
    Case vbByte, vbInteger, vbLong, vbSingle, vbDouble, vbCurrency, vbDecimal
      Audit_ValueToJson = Replace$(CStr(v), ",", ".")
    Case Else
      Audit_ValueToJson = Audit_JsonQuote(CStr(v))
  End Select
End Function

Private Function Audit_JsonQuote(ByVal s As String) As String
  s = Replace$(s, "\", "\\")
  s = Replace$(s, ChrW(34), "\" & ChrW(34))
  s = Replace$(s, vbCrLf, "\n")
  s = Replace$(s, vbCr, "\n")
  s = Replace$(s, vbLf, "\n")
  s = Replace$(s, vbTab, "\t")
  Audit_JsonQuote = ChrW(34) & s & ChrW(34)
End Function

Private Function Audit_IsoNow() As String
  Audit_IsoNow = Format$(Now, "yyyy-mm-dd\Thh:nn:ss")
End Function

Private Function Audit_Adler32(ByVal s As String) As String
  ' lightweight hash for debug (not cryptographic)
  Dim a As Long: a = 1
  Dim b As Long: b = 0
  Dim i As Long
  Dim c As Long
  For i = 1 To Len(s)
    c = AscW(Mid$(s, i, 1)) And &HFF&
    a = (a + c) Mod 65521
    b = (b + a) Mod 65521
  Next i
  Audit_Adler32 = "adler32:" & CStr((CDbl(b) * 65536#) + CDbl(a))
End Function


' ---------- UI column visibility (ui_visible + ui_group) ----------

Public Sub UI_ApplyVisibility()
  Dim detailOn As Boolean: detailOn = UI_GetFlag("UI_DETAIL_ON", True)
  Dim debugOn As Boolean: debugOn = UI_GetFlag("UI_DEBUG_ON", False)

  UI_ApplyVisibilityForSheet SHEET_POINTS, detailOn, debugOn
  UI_ApplyVisibilityForSheet SHEET_LINES, detailOn, debugOn

  MsgBox "UI visibility applied. detail=" & IIf(detailOn, "ON", "OFF") & ", debug=" & IIf(debugOn, "ON", "OFF"), vbInformation
End Sub

Public Sub UI_ToggleDetail()
  Dim b As Boolean: b = UI_GetFlag("UI_DETAIL_ON", True)
  UI_SetFlag "UI_DETAIL_ON", Not b
  UI_ApplyVisibility
End Sub

Public Sub UI_ToggleDebug()
  Dim b As Boolean: b = UI_GetFlag("UI_DEBUG_ON", False)
  UI_SetFlag "UI_DEBUG_ON", Not b
  UI_ApplyVisibility
End Sub

Public Sub UI_ShowCore()
  UI_SetFlag "UI_DETAIL_ON", False
  UI_SetFlag "UI_DEBUG_ON", False
  UI_ApplyVisibility
End Sub

Public Sub UI_ShowDetail()
  UI_SetFlag "UI_DETAIL_ON", True
  UI_SetFlag "UI_DEBUG_ON", False
  UI_ApplyVisibility
End Sub

Public Sub UI_ShowDebug()
  UI_SetFlag "UI_DETAIL_ON", True
  UI_SetFlag "UI_DEBUG_ON", True
  UI_ApplyVisibility
End Sub

Private Sub UI_ApplyVisibilityForSheet(ByVal sheetName As String, ByVal detailOn As Boolean, ByVal debugOn As Boolean)
  Dim ws As Worksheet: Set ws = EnsureSheet(sheetName)
  Dim cols As Object: Set cols = BuildColIndex(ws)

  Dim wsMap As Worksheet: Set wsMap = EnsureSheet(SHEET_MAPPING)
  Dim r As Long: r = 2
  Do While Len(Trim$(CStr(wsMap.Cells(r, 1).Value))) > 0
    If CStr(wsMap.Cells(r, 1).Value) = sheetName Then
      Dim uiKey As String: uiKey = Trim$(CStr(wsMap.Cells(r, 2).Value))
      If Len(uiKey) > 0 And HeaderExists(cols, uiKey) Then
        Dim uiVis As Variant: uiVis = wsMap.Cells(r, 6).Value
        Dim uiGrp As String: uiGrp = LCase$(Trim$(CStr(wsMap.Cells(r, 7).Value)))
        Dim show As Boolean: show = UI_ShouldShow(uiVis, uiGrp, detailOn, debugOn)
        ws.Columns(cols(uiKey)).Hidden = Not show
      End If
    End If
    r = r + 1
  Loop

  ' always hide internal columns
  If HeaderExists(cols, COL_RAW_JSON) Then ws.Columns(cols(COL_RAW_JSON)).Hidden = True
  If HeaderExists(cols, COL_TOUCH_MASK) Then ws.Columns(cols(COL_TOUCH_MASK)).Hidden = True
End Sub

Private Function UI_ShouldShow(ByVal uiVisible As Variant, ByVal uiGroup As String, ByVal detailOn As Boolean, ByVal debugOn As Boolean) As Boolean
  Dim gate As Boolean: gate = True
  If Not IsEmpty(uiVisible) Then
    If VarType(uiVisible) = vbBoolean Then
      gate = CBool(uiVisible)
    ElseIf Len(Trim$(CStr(uiVisible))) > 0 Then
      gate = (Val(CStr(uiVisible)) <> 0)
    End If
  End If
  If Not gate Then UI_ShouldShow = False: Exit Function

  Select Case LCase$(Trim$(uiGroup))
    Case "core", ""
      UI_ShouldShow = True
    Case "detail"
      UI_ShouldShow = detailOn
    Case "debug"
      UI_ShouldShow = debugOn
    Case Else
      UI_ShouldShow = detailOn
  End Select
End Function

Private Function UI_GetFlag(ByVal name As String, ByVal defaultVal As Boolean) As Boolean
  On Error GoTo Def
  Dim v As Variant: v = ThisWorkbook.Names(name).RefersToRange.Value
  If IsEmpty(v) Then GoTo Def
  If VarType(v) = vbBoolean Then
    UI_GetFlag = CBool(v)
  Else
    UI_GetFlag = (Val(CStr(v)) <> 0)
  End If
  Exit Function
Def:
  UI_GetFlag = defaultVal
End Function

Private Sub UI_SetFlag(ByVal name As String, ByVal b As Boolean)
  On Error Resume Next
  ThisWorkbook.Names(name).RefersToRange.Value = IIf(b, 1, 0)
  On Error GoTo 0
End Sub

' Trim spaces/tabs and CR/LF from both ends (for JSON-in-cell with newlines)
Private Function TrimAllWs(ByVal s As String) As String
  Dim t As String: t = s
  Do While Len(t) > 0
    Dim c1 As String: c1 = Left$(t, 1)
    If c1 = " " Or c1 = vbTab Or c1 = vbCr Or c1 = vbLf Then
      t = Mid$(t, 2)
    Else
      Exit Do
    End If
  Loop
  Do While Len(t) > 0
    Dim cN As String: cN = Right$(t, 1)
    If cN = " " Or cN = vbTab Or cN = vbCr Or cN = vbLf Then
      t = Left$(t, Len(t) - 1)
    Else
      Exit Do
    End If
  Loop
  TrimAllWs = t
End Function

