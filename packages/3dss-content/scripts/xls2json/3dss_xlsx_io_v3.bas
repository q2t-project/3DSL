Attribute VB_Name = "mod3dss_xlsx_io_v3"
Option Explicit

' =========================================================
' 3DSS xlsx <-> json  (v3 / mapping-based, compile-safe)
'
' Goals:
' - XLSX 
' - VBA  -> JSON 
' - 1
' - JSON/ *_json JSON
'
' Sheets:
' - document_meta: A=key, B=value
' - points / lines: row1=column key, row4..=data
' - aux: colA=json (1 row = 1 raw json object)
' =========================================================

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

Private Const DATA_START_ROW As Long = 4
Private Const IN_FILE As String = "in.3dss.json"
Private Const OUT_FILE As String = "out.3dss.json"

' =========================================================
' Public macros
' =========================================================

Public Sub Import3DSS_JSON()
  On Error GoTo EH
  Dim stage As String: stage = "start"
  ' NOTE: VBA-JSON json_Options in this bundle does not define UseCollection.
  ' Arrays are already parsed as Collection; objects as Dictionary.

  stage = "read file"
  Dim jsonText As String
  jsonText = ReadUtf8File(ThisWorkbook.Path & "\" & IN_FILE)

  stage = "parse json"
  Dim doc As Object
  Set doc = ParseJson(jsonText)

  stage = "write document_meta"
  If HasKey(doc, "document_meta") Then WriteDocumentMeta doc("document_meta")

  stage = "write points"
  If HasKey(doc, "points") Then WritePoints ExtractObjectsArray(doc("points"))

  stage = "write lines"
  If HasKey(doc, "lines") Then WriteLines ExtractObjectsArray(doc("lines"))

  stage = "write aux"
  If HasKey(doc, "aux") Then WriteAux ExtractObjectsArray(doc("aux"))

  Exit Sub
EH:
  MsgBox "IMPORT ERROR: " & Err.Number & vbCrLf & Err.Description & vbCrLf & "stage=" & stage, vbCritical
End Sub

Public Sub Export3DSS_JSON()
  On Error GoTo EH
  Dim stage As String: stage = "start"

  Dim doc As Object: Set doc = CreateObject("Scripting.Dictionary")

  stage = "read document_meta"
  Set doc("document_meta") = ReadDocumentMeta()

  stage = "read points"
  Set doc("points") = ReadPoints()

  stage = "read lines"
  Set doc("lines") = ReadLines()

  stage = "read aux"
  Set doc("aux") = ReadAuxJsonArray()

  stage = "convert json"
  Dim jsonText As String
  jsonText = ConvertToJson(doc, 2)

  stage = "write file"
  WriteUtf8File ThisWorkbook.Path & "\" & OUT_FILE, jsonText

  Exit Sub
EH:
  MsgBox "EXPORT ERROR: " & Err.Number & vbCrLf & Err.Description & vbCrLf & "stage=" & stage, vbCritical
End Sub

' =========================================================
' document_meta
' =========================================================

Private Sub WriteDocumentMeta(ByVal metaObj As Object)
  Dim ws As Worksheet: Set ws = EnsureSheet("document_meta")

  ws.Cells.Clear
  ws.Cells(1, 1).Value = "key"
  ws.Cells(1, 2).Value = "value"

  Dim keys As Variant
  keys = DictKeys(metaObj)
  If IsEmpty(keys) Then Exit Sub
  SortStrings keys

  Dim i As Long, r As Long: r = 2
  For i = LBound(keys) To UBound(keys)
    Dim kk As String: kk = CStr(keys(i))
    ws.Cells(r, 1).Value = kk
    ws.Cells(r, 2).Value = MetaValueToCell(metaObj(kk))
    r = r + 1
  Next i

  ws.Columns("A:B").AutoFit
End Sub

Private Function ReadDocumentMeta() As Object
  Dim ws As Worksheet: Set ws = EnsureSheet("document_meta")
  Dim m As Object: Set m = CreateObject("Scripting.Dictionary")

  Dim lastRow As Long: lastRow = LastUsedRow(ws)
  Dim r As Long
  For r = 2 To lastRow
    Dim k As String: k = Trim$(CStr(ws.Cells(r, 1).Value))
    If Len(k) = 0 Then GoTo NextR

    Dim v As Variant: v = ws.Cells(r, 2).Value

    If LCase$(k) = "tags" Then
      Dim tagsV As Variant: tagsV = ParseJsonCell(v)
    tagsV = NormalizeTags(tagsV)
      If Not IsEmpty(tagsV) Then
        ' tags array Collection
        m(k) = tagsV
      End If
    Else
      Dim vv As Variant
      vv = ParseJsonCell(v)
      If IsEmpty(vv) Then
        If Not IsBlank(v) Then m(k) = v
      Else
        m(k) = vv
      End If
    End If

NextR:
  Next r

  ' required 
  If Not HasKey(m, "document_title") Then m("document_title") = "Untitled"
  If (Not HasKey(m, "document_uuid")) Or Len(Trim$(CStr(m("document_uuid")))) = 0 Then m("document_uuid") = NewUUID()
  If (Not HasKey(m, "schema_uri")) Or Len(Trim$(CStr(m("schema_uri")))) = 0 Then m("schema_uri") = ""
  If (Not HasKey(m, "author")) Or Len(Trim$(CStr(m("author")))) = 0 Then m("author") = "unknown"
  If (Not HasKey(m, "version")) Or Len(Trim$(CStr(m("version")))) = 0 Then m("version") = "1.0.0"

  Set ReadDocumentMeta = m
End Function

Private Function MetaValueToCell(ByVal v As Variant) As Variant
  If IsObject(v) Then
    MetaValueToCell = ConvertToJson(v, 0)
  ElseIf IsNull(v) Then
    MetaValueToCell = vbNullString
  Else
    MetaValueToCell = v
  End If
End Function

' =========================================================
' aux (raw json per row)
' =========================================================

Private Sub WriteAux(ByVal elements As Collection)
  Dim ws As Worksheet: Set ws = EnsureSheet("aux")

  ' clear data only (keep header if exists)
  Dim lastRow As Long: lastRow = Application.Max(DATA_START_ROW, LastUsedRow(ws))
  ws.Range(ws.Cells(DATA_START_ROW, 1), ws.Cells(lastRow, 1)).ClearContents

  Dim i As Long
  For i = 1 To elements.Count
    ws.Cells(DATA_START_ROW + i - 1, 1).Value = ConvertToJson(elements(i), 0)
  Next i
End Sub

Private Function ReadAuxJsonArray() As Collection
  Dim out As New Collection
  Dim ws As Worksheet

  On Error Resume Next
  Set ws = ThisWorkbook.Worksheets("aux")
  On Error GoTo 0
  If ws Is Nothing Then
    Set ReadAuxJsonArray = out
    Exit Function
  End If

  Dim lastRow As Long: lastRow = LastUsedRow(ws)
  Dim r As Long
  For r = DATA_START_ROW To lastRow
    Dim s As String: s = Trim$(CStr(ws.Cells(r, 1).Value))
    If Len(s) > 0 Then out.Add ParseJson(s)
  Next r

  Set ReadAuxJsonArray = out
End Function

' =========================================================
' points (mapping-based)
' =========================================================

Private Sub WritePoints(ByVal elements As Collection)
  Dim ws As Worksheet: Set ws = EnsureSheet("points")
  Dim col As Object: Set col = BuildColIndex(ws)

  ClearDataArea ws

  Dim r As Long: r = DATA_START_ROW
  Dim i As Long
  For i = 1 To elements.Count
    WritePointRow ws, col, r, elements(i)
    r = r + 1
  Next i
End Sub

Private Sub WritePointRow(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal pt As Variant)
  If Not IsObject(pt) Then Exit Sub
  Dim d As Object: Set d = pt

  Dim meta As Object: Set meta = GetObj(d, "meta")
  If Not meta Is Nothing Then
    PutCell ws, col, r, "uuid", GetAny(meta, "uuid")
    If HasKey(meta, "tags") Then PutCell ws, col, r, "tags_json", ConvertToJson(meta("tags"), 0)
    PutCell ws, col, r, "creator_memo", GetAny(meta, "creator_memo")
  End If

  Dim sig As Object: Set sig = GetObj(d, "signification")
  If Not sig Is Nothing Then
    Dim nm As Variant: nm = GetAny(sig, "name")
    WriteLocalizedString ws, col, r, "name", "name_ja", "name_en", nm
  End If

  Dim app As Object: Set app = GetObj(d, "appearance")
  If Not app Is Nothing Then
    Dim pos As Variant: pos = GetAny(app, "position")
    PutCell ws, col, r, "x", ArrGet(pos, 0)
    PutCell ws, col, r, "y", ArrGet(pos, 1)
    PutCell ws, col, r, "z", ArrGet(pos, 2)

    PutCell ws, col, r, "visible", GetAny(app, "visible")

    Dim fr As Variant: fr = GetAny(app, "frames")
    If Not IsEmpty(fr) Then
      If IsObject(fr) Or IsArray(fr) Then
        PutCell ws, col, r, "frames", ConvertToJson(fr, 0)
      Else
        PutCell ws, col, r, "frames", fr
      End If
    End If

    Dim marker As Object: Set marker = GetObj(app, "marker")
    If Not marker Is Nothing Then
      PutCell ws, col, r, "marker_primitive", GetAny(marker, "primitive")
      PutCell ws, col, r, "marker_radius", GetAny(marker, "radius")
      PutCell ws, col, r, "marker_height", GetAny(marker, "height")

      Dim sizeV As Variant: sizeV = GetAny(marker, "size")
      PutCell ws, col, r, "marker_size_x", ArrGet(sizeV, 0)
      PutCell ws, col, r, "marker_size_y", ArrGet(sizeV, 1)
      PutCell ws, col, r, "marker_size_z", ArrGet(sizeV, 2)

      Dim baseV As Variant: baseV = GetAny(marker, "base")
      PutCell ws, col, r, "marker_base_x", ArrGet(baseV, 0)
      PutCell ws, col, r, "marker_base_y", ArrGet(baseV, 1)

      PutCell ws, col, r, "corona_inner_radius", GetAny(marker, "inner_radius")
      PutCell ws, col, r, "corona_outer_radius", GetAny(marker, "outer_radius")

      Dim gltf As Object: Set gltf = GetObj(marker, "gltf")
      If Not gltf Is Nothing Then
        PutCell ws, col, r, "gltf_url", GetAny(gltf, "url")
        Dim sc As Variant: sc = GetAny(gltf, "scale")
        PutCell ws, col, r, "gltf_scale_x", ArrGet(sc, 0)
        PutCell ws, col, r, "gltf_scale_y", ArrGet(sc, 1)
        PutCell ws, col, r, "gltf_scale_z", ArrGet(sc, 2)

        Dim rot As Variant: rot = GetAny(gltf, "rotation")
        PutCell ws, col, r, "gltf_rot_x", ArrGet(rot, 0)
        PutCell ws, col, r, "gltf_rot_y", ArrGet(rot, 1)
        PutCell ws, col, r, "gltf_rot_z", ArrGet(rot, 2)

        Dim off As Variant: off = GetAny(gltf, "offset")
        PutCell ws, col, r, "gltf_off_x", ArrGet(off, 0)
        PutCell ws, col, r, "gltf_off_y", ArrGet(off, 1)
        PutCell ws, col, r, "gltf_off_z", ArrGet(off, 2)
      End If

      Dim txt As Object: Set txt = GetObj(marker, "text")
      If Not txt Is Nothing Then
        PutCell ws, col, r, "text_content", GetAny(txt, "content")
        PutCell ws, col, r, "text_font", GetAny(txt, "font")
        PutCell ws, col, r, "text_size", GetAny(txt, "size")
        PutCell ws, col, r, "text_align", GetAny(txt, "align")
        PutCell ws, col, r, "text_plane", GetAny(txt, "plane")
      End If

      Dim common As Object: Set common = GetObj(marker, "common")
      If Not common Is Nothing Then
        Dim ori As Variant: ori = GetAny(common, "orientation")
        PutCell ws, col, r, "common_orient_x", ArrGet(ori, 0)
        PutCell ws, col, r, "common_orient_y", ArrGet(ori, 1)
        PutCell ws, col, r, "common_orient_z", ArrGet(ori, 2)

        Dim sc2 As Variant: sc2 = GetAny(common, "scale")
        PutCell ws, col, r, "common_scale_x", ArrGet(sc2, 0)
        PutCell ws, col, r, "common_scale_y", ArrGet(sc2, 1)
        PutCell ws, col, r, "common_scale_z", ArrGet(sc2, 2)

        PutCell ws, col, r, "common_color", GetAny(common, "color")
        PutCell ws, col, r, "common_opacity", GetAny(common, "opacity")
        PutCell ws, col, r, "common_emissive", GetAny(common, "emissive")
        PutCell ws, col, r, "common_wireframe", GetAny(common, "wireframe")
      End If
    End If
  End If
End Sub

Private Function ReadPoints() As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet("points")
  Dim col As Object: Set col = BuildColIndex(ws)
  Dim out As New Collection

  Dim lastRow As Long: lastRow = LastUsedRow(ws)
  Dim r As Long
  For r = DATA_START_ROW To lastRow
    If Not RowHasAny(ws, r, col) Then GoTo NextR

    Dim pt As Object: Set pt = CreateObject("Scripting.Dictionary")

    ' meta
    Dim meta As Object: Set meta = CreateObject("Scripting.Dictionary")
    Dim uuid As String: uuid = Trim$(CStr(GetCell(ws, col, r, "uuid")))
    If Len(uuid) = 0 Then uuid = NewUUID()
    meta("uuid") = uuid

    Dim tagsV As Variant: tagsV = ParseJsonCell(GetCell(ws, col, r, "tags_json"))
    tagsV = NormalizeTags(tagsV)
    If Not IsEmpty(tagsV) Then meta("tags") = tagsV

    Dim cm As Variant: cm = GetCell(ws, col, r, "creator_memo")
    If Not IsBlank(cm) Then meta("creator_memo") = cm

    Set pt("meta") = meta

    ' signification (optional)
    Dim sig As Object
    Set sig = BuildLocalizedStringObj(ws, col, r, "name", "name_ja", "name_en")
    If Not sig Is Nothing Then
      Dim sObj As Object: Set sObj = CreateObject("Scripting.Dictionary")
      sObj("name") = sig
      Set pt("signification") = sObj
    End If

    ' appearance
    Dim app As Object: Set app = CreateObject("Scripting.Dictionary")

    Dim xV As Variant: xV = GetCell(ws, col, r, "x")
    Dim yV As Variant: yV = GetCell(ws, col, r, "y")
    Dim zV As Variant: zV = GetCell(ws, col, r, "z")

    If IsBlank(xV) Or IsBlank(yV) Or IsBlank(zV) Then
      Err.Raise 10001, "ReadPoints", "points row " & r & ": x/y/z "
    End If

    Dim pos As New Collection
    pos.Add CDbl(xV): pos.Add CDbl(yV): pos.Add CDbl(zV)
    app("position") = pos

    Dim vis As Variant: vis = GetCell(ws, col, r, "visible")
    If Not IsBlank(vis) Then app("visible") = CBool(vis)

    Dim frCell As Variant: frCell = GetCell(ws, col, r, "frames")
    If Not IsBlank(frCell) Then
      Dim frParsed As Variant: frParsed = ParseFramesCell(frCell)
      If Not IsEmpty(frParsed) Then app("frames") = frParsed
    End If

    ' marker (optional)
    Dim marker As Object: Set marker = BuildPointMarker(ws, col, r)
    If Not marker Is Nothing Then Set app("marker") = marker

    Set pt("appearance") = app

    out.Add pt
NextR:
  Next r

  Set ReadPoints = out
End Function

Private Function BuildPointMarker(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long) As Object
  Dim anyMarker As Boolean: anyMarker = False

  Dim prim As String: prim = Trim$(CStr(GetCell(ws, col, r, "marker_primitive")))
  If Len(prim) > 0 Then anyMarker = True

  ' marker related fields (if any filled)
  If Not IsBlank(GetCell(ws, col, r, "marker_radius")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "marker_height")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "marker_size_x")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "marker_base_x")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "corona_inner_radius")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "gltf_url")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "text_content")) Then anyMarker = True
  If Not IsBlank(GetCell(ws, col, r, "common_color")) Then anyMarker = True

  If Not anyMarker Then
    Set BuildPointMarker = Nothing
    Exit Function
  End If

  Dim m As Object: Set m = CreateObject("Scripting.Dictionary")
  If Len(prim) = 0 Then prim = "none"
  m("primitive") = prim

  ' conditional required checks
  Select Case prim
    Case "sphere"
      If IsBlank(GetCell(ws, col, r, "marker_radius")) Then Err.Raise 10001, "BuildPointMarker", "points row " & r & ": sphere  marker_radius "
      m("radius") = CDbl(GetCell(ws, col, r, "marker_radius"))

    Case "box"
      If IsBlank(GetCell(ws, col, r, "marker_size_x")) Or IsBlank(GetCell(ws, col, r, "marker_size_y")) Or IsBlank(GetCell(ws, col, r, "marker_size_z")) Then
        Err.Raise 10001, "BuildPointMarker", "points row " & r & ": box  marker_size_x/y/z "
      End If
      Dim sz As New Collection
      sz.Add CDbl(GetCell(ws, col, r, "marker_size_x"))
      sz.Add CDbl(GetCell(ws, col, r, "marker_size_y"))
      sz.Add CDbl(GetCell(ws, col, r, "marker_size_z"))
      m("size") = sz

    Case "cone"
      If IsBlank(GetCell(ws, col, r, "marker_radius")) Or IsBlank(GetCell(ws, col, r, "marker_height")) Then
        Err.Raise 10001, "BuildPointMarker", "points row " & r & ": cone  marker_radius + marker_height "
      End If
      m("radius") = CDbl(GetCell(ws, col, r, "marker_radius"))
      m("height") = CDbl(GetCell(ws, col, r, "marker_height"))

    Case "pyramid"
      If IsBlank(GetCell(ws, col, r, "marker_base_x")) Or IsBlank(GetCell(ws, col, r, "marker_base_y")) Or IsBlank(GetCell(ws, col, r, "marker_height")) Then
        Err.Raise 10001, "BuildPointMarker", "points row " & r & ": pyramid  marker_base_x/y + marker_height "
      End If
      Dim base As New Collection
      base.Add CDbl(GetCell(ws, col, r, "marker_base_x"))
      base.Add CDbl(GetCell(ws, col, r, "marker_base_y"))
      m("base") = base
      m("height") = CDbl(GetCell(ws, col, r, "marker_height"))

    Case "corona"
      If IsBlank(GetCell(ws, col, r, "corona_inner_radius")) Or IsBlank(GetCell(ws, col, r, "corona_outer_radius")) Then
        Err.Raise 10001, "BuildPointMarker", "points row " & r & ": corona  corona_inner_radius + corona_outer_radius "
      End If
      m("inner_radius") = CDbl(GetCell(ws, col, r, "corona_inner_radius"))
      m("outer_radius") = CDbl(GetCell(ws, col, r, "corona_outer_radius"))

    Case Else
      ' none 
  End Select

  ' gltf optional
  Dim url As String: url = Trim$(CStr(GetCell(ws, col, r, "gltf_url")))
  If Len(url) > 0 Then
    Dim gltf As Object: Set gltf = CreateObject("Scripting.Dictionary")
    gltf("url") = url

    Dim sc As Object: Set sc = Vec3FromCols(ws, col, r, "gltf_scale_x", "gltf_scale_y", "gltf_scale_z")
    If Not sc Is Nothing Then gltf("scale") = sc

    Dim rot As Object: Set rot = Vec3FromCols(ws, col, r, "gltf_rot_x", "gltf_rot_y", "gltf_rot_z")
    If Not rot Is Nothing Then gltf("rotation") = rot

    Dim off As Object: Set off = Vec3FromCols(ws, col, r, "gltf_off_x", "gltf_off_y", "gltf_off_z")
    If Not off Is Nothing Then gltf("offset") = off

    m("gltf") = gltf
  End If

  ' text optional
  Dim txtContent As String: txtContent = Trim$(CStr(GetCell(ws, col, r, "text_content")))
  If Len(txtContent) > 0 Or Not IsBlank(GetCell(ws, col, r, "text_font")) Or Not IsBlank(GetCell(ws, col, r, "text_size")) Or Not IsBlank(GetCell(ws, col, r, "text_align")) Or Not IsBlank(GetCell(ws, col, r, "text_plane")) Then
    Dim txt As Object: Set txt = CreateObject("Scripting.Dictionary")
    If Len(txtContent) > 0 Then txt("content") = txtContent
    Dim f As Variant: f = GetCell(ws, col, r, "text_font")
    If Not IsBlank(f) Then txt("font") = CStr(f)
    Dim szV As Variant: szV = GetCell(ws, col, r, "text_size")
    If Not IsBlank(szV) Then txt("size") = CDbl(szV)
    Dim al As Variant: al = GetCell(ws, col, r, "text_align")
    If Not IsBlank(al) Then txt("align") = CStr(al)
    Dim pl As Variant: pl = GetCell(ws, col, r, "text_plane")
    If Not IsBlank(pl) Then txt("plane") = CStr(pl)
    m("text") = txt
  End If

  ' common optional
  Dim commonAny As Boolean: commonAny = False
  If Not IsBlank(GetCell(ws, col, r, "common_color")) Then commonAny = True
  If Not IsBlank(GetCell(ws, col, r, "common_opacity")) Then commonAny = True
  If Not IsBlank(GetCell(ws, col, r, "common_emissive")) Then commonAny = True
  If Not IsBlank(GetCell(ws, col, r, "common_wireframe")) Then commonAny = True
  If Not IsBlank(GetCell(ws, col, r, "common_orient_x")) Then commonAny = True
  If Not IsBlank(GetCell(ws, col, r, "common_scale_x")) Then commonAny = True

  If commonAny Then
    Dim c As Object: Set c = CreateObject("Scripting.Dictionary")

    Dim ori As Object: Set ori = Vec3FromCols(ws, col, r, "common_orient_x", "common_orient_y", "common_orient_z")
    If Not ori Is Nothing Then c("orientation") = ori

    Dim sca As Object: Set sca = Vec3FromCols(ws, col, r, "common_scale_x", "common_scale_y", "common_scale_z")
    If Not sca Is Nothing Then c("scale") = sca

    Dim cc As Variant: cc = GetCell(ws, col, r, "common_color")
    If Not IsBlank(cc) Then c("color") = CStr(cc)

    Dim op As Variant: op = GetCell(ws, col, r, "common_opacity")
    If Not IsBlank(op) Then c("opacity") = CDbl(op)

    Dim em As Variant: em = GetCell(ws, col, r, "common_emissive")
    If Not IsBlank(em) Then c("emissive") = CBool(em)

    Dim wf As Variant: wf = GetCell(ws, col, r, "common_wireframe")
    If Not IsBlank(wf) Then c("wireframe") = CBool(wf)

    m("common") = c
  End If

  Set BuildPointMarker = m
End Function

' =========================================================
' lines (mapping-based)
' =========================================================

Private Sub WriteLines(ByVal elements As Collection)
  Dim ws As Worksheet: Set ws = EnsureSheet("lines")
  Dim col As Object: Set col = BuildColIndex(ws)

  ClearDataArea ws

  Dim r As Long: r = DATA_START_ROW
  Dim i As Long
  For i = 1 To elements.Count
    WriteLineRow ws, col, r, elements(i)
    r = r + 1
  Next i
End Sub

Private Sub WriteLineRow(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal ln As Variant)
  If Not IsObject(ln) Then Exit Sub
  Dim d As Object: Set d = ln

  Dim meta As Object: Set meta = GetObj(d, "meta")
  If Not meta Is Nothing Then
    PutCell ws, col, r, "uuid", GetAny(meta, "uuid")
    If HasKey(meta, "tags") Then PutCell ws, col, r, "tags_json", ConvertToJson(meta("tags"), 0)
    PutCell ws, col, r, "creator_memo", GetAny(meta, "creator_memo")
  End If

  Dim sig As Object: Set sig = GetObj(d, "signification")
  If Not sig Is Nothing Then
    Dim rel As Variant: rel = GetAny(sig, "relation")
    If IsObject(rel) Then
      Dim rd As Object: Set rd = rel
      Dim kk As Variant
      For Each kk In rd.Keys
        PutCell ws, col, r, "relation_kind", kk
        PutCell ws, col, r, "relation_value", rd(kk)
        Exit For
      Next kk
    End If

    PutCell ws, col, r, "sense", GetAny(sig, "sense")

    Dim cap As Variant: cap = GetAny(sig, "caption")
    WriteLocalizedString ws, col, r, "caption", "caption_ja", "caption_en", cap
  End If

  Dim app As Object: Set app = GetObj(d, "appearance")
  If Not app Is Nothing Then
    ' endpoints
    Dim ea As Object: Set ea = GetObj(app, "end_a")
    If Not ea Is Nothing Then
      PutCell ws, col, r, "end_a_ref", GetAny(ea, "ref")
      Dim coord As Variant: coord = GetAny(ea, "coord")
      PutCell ws, col, r, "end_a_x", ArrGet(coord, 0)
      PutCell ws, col, r, "end_a_y", ArrGet(coord, 1)
      PutCell ws, col, r, "end_a_z", ArrGet(coord, 2)
    End If

    Dim eb As Object: Set eb = GetObj(app, "end_b")
    If Not eb Is Nothing Then
      PutCell ws, col, r, "end_b_ref", GetAny(eb, "ref")
      Dim coord2 As Variant: coord2 = GetAny(eb, "coord")
      PutCell ws, col, r, "end_b_x", ArrGet(coord2, 0)
      PutCell ws, col, r, "end_b_y", ArrGet(coord2, 1)
      PutCell ws, col, r, "end_b_z", ArrGet(coord2, 2)
    End If

    PutCell ws, col, r, "line_type", GetAny(app, "line_type")
    PutCell ws, col, r, "line_style", GetAny(app, "line_style")
    PutCell ws, col, r, "color", GetAny(app, "color")
    PutCell ws, col, r, "opacity", GetAny(app, "opacity")
    PutCell ws, col, r, "render_order", GetAny(app, "render_order")
    PutCell ws, col, r, "visible", GetAny(app, "visible")

    Dim fr As Variant: fr = GetAny(app, "frames")
    If Not IsEmpty(fr) Then
      If IsObject(fr) Or IsArray(fr) Then
        PutCell ws, col, r, "frames", ConvertToJson(fr, 0)
      Else
        PutCell ws, col, r, "frames", fr
      End If
    End If

    Dim geo As Variant: geo = GetAny(app, "geometry")
    If Not IsEmpty(geo) Then PutCell ws, col, r, "geometry_json", ConvertToJson(geo, 0)

    Dim arrow As Object: Set arrow = GetObj(app, "arrow")
    If Not arrow Is Nothing Then
      PutCell ws, col, r, "arrow_primitive", GetAny(arrow, "primitive")
      PutCell ws, col, r, "arrow_placement", GetAny(arrow, "placement")
      PutCell ws, col, r, "arrow_auto_orient", GetAny(arrow, "auto_orient")
      PutCell ws, col, r, "arrow_length", GetAny(arrow, "length")
      PutCell ws, col, r, "arrow_thickness", GetAny(arrow, "thickness")
      PutCell ws, col, r, "arrow_radius", GetAny(arrow, "radius")
      PutCell ws, col, r, "arrow_height", GetAny(arrow, "height")

      Dim baseV As Variant: baseV = GetAny(arrow, "base")
      PutCell ws, col, r, "arrow_base_x", ArrGet(baseV, 0)
      PutCell ws, col, r, "arrow_base_y", ArrGet(baseV, 1)
    End If
  End If
End Sub

Private Function ReadLines() As Collection
  Dim ws As Worksheet: Set ws = EnsureSheet("lines")
  Dim col As Object: Set col = BuildColIndex(ws)
  Dim out As New Collection

  Dim lastRow As Long: lastRow = LastUsedRow(ws)
  Dim r As Long
  For r = DATA_START_ROW To lastRow
    If Not RowHasAny(ws, r, col) Then GoTo NextR

    Dim ln As Object: Set ln = CreateObject("Scripting.Dictionary")

    ' meta
    Dim meta As Object: Set meta = CreateObject("Scripting.Dictionary")
    Dim uuid As String: uuid = Trim$(CStr(GetCell(ws, col, r, "uuid")))
    If Len(uuid) = 0 Then uuid = NewUUID()
    meta("uuid") = uuid

    Dim tagsV As Variant: tagsV = ParseJsonCell(GetCell(ws, col, r, "tags_json"))
    tagsV = NormalizeTags(tagsV)
    If Not IsEmpty(tagsV) Then meta("tags") = tagsV

    Dim cm As Variant: cm = GetCell(ws, col, r, "creator_memo")
    If Not IsBlank(cm) Then meta("creator_memo") = cm

    Set ln("meta") = meta

    ' signification (optional)
    Dim relKind As String: relKind = Trim$(CStr(GetCell(ws, col, r, "relation_kind")))
    Dim relVal As String: relVal = Trim$(CStr(GetCell(ws, col, r, "relation_value")))

    Dim capObj As Object
    Set capObj = BuildLocalizedStringObj(ws, col, r, "caption", "caption_ja", "caption_en")

    Dim sense As String: sense = Trim$(CStr(GetCell(ws, col, r, "sense")))

    If Len(relKind) > 0 Or Len(relVal) > 0 Or Not capObj Is Nothing Or Len(sense) > 0 Then
      Dim sig As Object: Set sig = CreateObject("Scripting.Dictionary")

      If Len(relKind) > 0 Then
        If Len(relVal) = 0 Then Err.Raise 10001, "ReadLines", "lines row " & r & ": relation_kind  relation_value "
        Dim rel As Object: Set rel = CreateObject("Scripting.Dictionary")
        rel(relKind) = relVal
        Set sig("relation") = rel
      End If

      If Len(sense) > 0 Then sig("sense") = sense
      If Not capObj Is Nothing Then sig("caption") = capObj

      Set ln("signification") = sig
    End If

    ' appearance
    Dim app As Object: Set app = CreateObject("Scripting.Dictionary")

    ' endpoints: refcoord
    Dim ea As Object: Set ea = BuildEndpoint(ws, col, r, "end_a_ref", "end_a_x", "end_a_y", "end_a_z")
    Dim eb As Object: Set eb = BuildEndpoint(ws, col, r, "end_b_ref", "end_b_x", "end_b_y", "end_b_z")
    If ea Is Nothing Or eb Is Nothing Then Err.Raise 10001, "ReadLines", "lines row " & r & ": end_a / end_b ref or coord"
    Set app("end_a") = ea
    Set app("end_b") = eb

    Dim lt As String: lt = Trim$(CStr(GetCell(ws, col, r, "line_type")))
    If Len(lt) > 0 Then app("line_type") = lt

    Dim ls As String: ls = Trim$(CStr(GetCell(ws, col, r, "line_style")))
    If Len(ls) > 0 Then app("line_style") = ls

    Dim color As String: color = Trim$(CStr(GetCell(ws, col, r, "color")))
    If Len(color) > 0 Then app("color") = color

    Dim op As Variant: op = GetCell(ws, col, r, "opacity")
    If Not IsBlank(op) Then app("opacity") = CDbl(op)

    Dim ro As Variant: ro = GetCell(ws, col, r, "render_order")
    If Not IsBlank(ro) Then app("render_order") = CDbl(ro)

    Dim vis As Variant: vis = GetCell(ws, col, r, "visible")
    If Not IsBlank(vis) Then app("visible") = CBool(vis)

    Dim frCell As Variant: frCell = GetCell(ws, col, r, "frames")
    If Not IsBlank(frCell) Then
      Dim frParsed As Variant: frParsed = ParseFramesCell(frCell)
      If Not IsEmpty(frParsed) Then app("frames") = frParsed
    End If

    Dim geoCell As Variant: geoCell = GetCell(ws, col, r, "geometry_json")
    Dim geoParsed As Variant: geoParsed = ParseJsonCell(geoCell)
    If Not IsEmpty(geoParsed) Then app("geometry") = geoParsed

    Dim arrow As Object: Set arrow = BuildLineArrow(ws, col, r)
    If Not arrow Is Nothing Then app("arrow") = arrow

    Set ln("appearance") = app

    out.Add ln
NextR:
  Next r

  Set ReadLines = out
End Function

Private Function BuildEndpoint(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal keyRef As String, ByVal keyX As String, ByVal keyY As String, ByVal keyZ As String) As Object
  Dim refV As String: refV = Trim$(CStr(GetCell(ws, col, r, keyRef)))
  If Len(refV) > 0 Then
    Dim e As Object: Set e = CreateObject("Scripting.Dictionary")
    e("ref") = refV
    Set BuildEndpoint = e
    Exit Function
  End If

  Dim xV As Variant: xV = GetCell(ws, col, r, keyX)
  Dim yV As Variant: yV = GetCell(ws, col, r, keyY)
  Dim zV As Variant: zV = GetCell(ws, col, r, keyZ)

  If IsBlank(xV) Or IsBlank(yV) Or IsBlank(zV) Then
    Set BuildEndpoint = Nothing
    Exit Function
  End If

  Dim coord As New Collection
  coord.Add CDbl(xV): coord.Add CDbl(yV): coord.Add CDbl(zV)

  Dim e2 As Object: Set e2 = CreateObject("Scripting.Dictionary")
  e2("coord") = coord
  Set BuildEndpoint = e2
End Function

Private Function BuildLineArrow(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long) As Object
  Dim anyArrow As Boolean: anyArrow = False
  Dim prim As String: prim = Trim$(CStr(GetCell(ws, col, r, "arrow_primitive")))
  If Len(prim) > 0 Then anyArrow = True

  If Not anyArrow And Not IsBlank(GetCell(ws, col, r, "arrow_length")) Then anyArrow = True
  If Not anyArrow And Not IsBlank(GetCell(ws, col, r, "arrow_radius")) Then anyArrow = True
  If Not anyArrow And Not IsBlank(GetCell(ws, col, r, "arrow_height")) Then anyArrow = True

  If Not anyArrow Then
    Set BuildLineArrow = Nothing
    Exit Function
  End If

  If Len(prim) = 0 Then prim = "none"

  Dim a As Object: Set a = CreateObject("Scripting.Dictionary")
  a("primitive") = prim

  Dim placement As String: placement = Trim$(CStr(GetCell(ws, col, r, "arrow_placement")))
  If Len(placement) > 0 Then a("placement") = placement

  Dim ao As Variant: ao = GetCell(ws, col, r, "arrow_auto_orient")
  If Not IsBlank(ao) Then a("auto_orient") = CBool(ao)

  Select Case prim
    Case "line"
      If IsBlank(GetCell(ws, col, r, "arrow_length")) Or IsBlank(GetCell(ws, col, r, "arrow_thickness")) Then
        Err.Raise 10001, "BuildLineArrow", "lines row " & r & ": arrow line  length+thickness "
      End If
      a("length") = CDbl(GetCell(ws, col, r, "arrow_length"))
      a("thickness") = CDbl(GetCell(ws, col, r, "arrow_thickness"))

    Case "cone"
      If IsBlank(GetCell(ws, col, r, "arrow_radius")) Or IsBlank(GetCell(ws, col, r, "arrow_height")) Then
        Err.Raise 10001, "BuildLineArrow", "lines row " & r & ": arrow cone  radius+height "
      End If
      a("radius") = CDbl(GetCell(ws, col, r, "arrow_radius"))
      a("height") = CDbl(GetCell(ws, col, r, "arrow_height"))

    Case "pyramid"
      If IsBlank(GetCell(ws, col, r, "arrow_base_x")) Or IsBlank(GetCell(ws, col, r, "arrow_base_y")) Or IsBlank(GetCell(ws, col, r, "arrow_height")) Then
        Err.Raise 10001, "BuildLineArrow", "lines row " & r & ": arrow pyramid  base_x/base_y + height "
      End If
      Dim base As New Collection
      base.Add CDbl(GetCell(ws, col, r, "arrow_base_x"))
      base.Add CDbl(GetCell(ws, col, r, "arrow_base_y"))
      a("base") = base
      a("height") = CDbl(GetCell(ws, col, r, "arrow_height"))

    Case Else
      ' none
  End Select

  Set BuildLineArrow = a
End Function

' =========================================================
' localized_string helpers (string or {ja,en})
' =========================================================

Private Sub WriteLocalizedString(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal keyStr As String, ByVal keyJa As String, ByVal keyEn As String, ByVal v As Variant)
  If IsEmpty(v) Then Exit Sub

  If IsObject(v) Then
    Dim d As Object: Set d = v
    If HasKey(d, "ja") Then PutCell ws, col, r, keyJa, d("ja")
    If HasKey(d, "en") Then PutCell ws, col, r, keyEn, d("en")

    ' 
    If HasKey(d, "ja") Then
      PutCell ws, col, r, keyStr, d("ja")
    ElseIf HasKey(d, "en") Then
      PutCell ws, col, r, keyStr, d("en")
    End If

  Else
    PutCell ws, col, r, keyStr, v
  End If
End Sub

Private Function BuildLocalizedStringObj(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal keyStr As String, ByVal keyJa As String, ByVal keyEn As String) As Object
  Dim jaV As String: jaV = Trim$(CStr(GetCell(ws, col, r, keyJa)))
  Dim enV As String: enV = Trim$(CStr(GetCell(ws, col, r, keyEn)))
  Dim sV As String: sV = Trim$(CStr(GetCell(ws, col, r, keyStr)))

  If Len(jaV) = 0 And Len(enV) = 0 Then
    If Len(sV) = 0 Then
      Set BuildLocalizedStringObj = Nothing
      Exit Function
    End If

    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    ' schema string  string Object Nothing 
    ' ->  sV  {ja} 
    d("ja") = sV
    Set BuildLocalizedStringObj = d
    Exit Function
  End If

  Dim d2 As Object: Set d2 = CreateObject("Scripting.Dictionary")
  If Len(jaV) > 0 Then d2("ja") = jaV
  If Len(enV) > 0 Then d2("en") = enV

  Set BuildLocalizedStringObj = d2
End Function

' =========================================================
' common helpers
' =========================================================

Private Function EnsureSheet(ByVal name As String) As Worksheet
  Dim ws As Worksheet
  On Error Resume Next
  Set ws = ThisWorkbook.Worksheets(name)
  On Error GoTo 0
  If ws Is Nothing Then
    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    ws.Name = name
  End If
  Set EnsureSheet = ws
End Function

Private Function HasKey(ByVal d As Object, ByVal key As String) As Boolean
  On Error Resume Next
  HasKey = d.Exists(key)
  On Error GoTo 0
End Function

Private Function DictKeys(ByVal d As Object) As Variant
  On Error Resume Next
  DictKeys = d.Keys
  On Error GoTo 0
End Function

Private Sub SortStrings(ByRef arr As Variant)
  On Error GoTo EH
  Dim i As Long, j As Long
  For i = LBound(arr) To UBound(arr) - 1
    For j = i + 1 To UBound(arr)
      If CStr(arr(i)) > CStr(arr(j)) Then
        Dim tmp As Variant: tmp = arr(i)
        arr(i) = arr(j)
        arr(j) = tmp
      End If
    Next j
  Next i
EH:
End Sub

Private Function LastUsedRow(ByVal ws As Worksheet) As Long
  If ws.UsedRange.Cells.Count = 1 And IsEmpty(ws.UsedRange.Cells(1, 1).Value) Then
    LastUsedRow = 0
  Else
    LastUsedRow = ws.UsedRange.Row + ws.UsedRange.Rows.Count - 1
  End If
End Function

Private Sub ClearDataArea(ByVal ws As Worksheet)
  Dim lastCol As Long
  lastCol = ws.UsedRange.Column + ws.UsedRange.Columns.Count - 1
  If lastCol < 1 Then Exit Sub

  Dim lastRow As Long
  lastRow = Application.Max(DATA_START_ROW, LastUsedRow(ws))

  ws.Range(ws.Cells(DATA_START_ROW, 1), ws.Cells(lastRow, lastCol)).ClearContents
End Sub

Private Function BuildColIndex(ByVal ws As Worksheet) As Object
  Dim d As Object: Set d = CreateObject("Scripting.Dictionary")

  Dim lastCol As Long
  lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column

  Dim c As Long
  For c = 1 To lastCol
    Dim k As String: k = Trim$(CStr(ws.Cells(1, c).Value))
    If Len(k) > 0 Then d(LCase$(k)) = c
  Next c

  Set BuildColIndex = d
End Function

Private Function GetCell(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal key As String) As Variant
  Dim lk As String: lk = LCase$(key)
  If Not col.Exists(lk) Then
    GetCell = Empty
    Exit Function
  End If
  GetCell = ws.Cells(r, CLng(col(lk))).Value
End Function

Private Sub PutCell(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal key As String, ByVal v As Variant)
  Dim lk As String: lk = LCase$(key)
  If Not col.Exists(lk) Then Exit Sub

  Dim c As Long: c = CLng(col(lk))

  If IsEmpty(v) Or IsNull(v) Then
    ws.Cells(r, c).ClearContents
  ElseIf IsObject(v) Then
    ws.Cells(r, c).Value = ConvertToJson(v, 0)
  Else
    ws.Cells(r, c).Value = v
  End If
End Sub

Private Function RowHasAny(ByVal ws As Worksheet, ByVal r As Long, ByVal col As Object) As Boolean
  ' 
  Dim lastCol As Long
  lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column

  Dim c As Long
  For c = 1 To lastCol
    Dim v As Variant: v = ws.Cells(r, c).Value
    If Not IsBlank(v) Then
      RowHasAny = True
      Exit Function
    End If
  Next c

  RowHasAny = False
End Function

Private Function IsBlank(ByVal v As Variant) As Boolean
  If IsEmpty(v) Then IsBlank = True: Exit Function
  If IsNull(v) Then IsBlank = True: Exit Function
  If VarType(v) = vbString Then
    IsBlank = (Len(Trim$(CStr(v))) = 0)
    Exit Function
  End If
  IsBlank = False
End Function

Private Function GetObj(ByVal d As Object, ByVal key As String) As Object
  On Error GoTo EH
  If d Is Nothing Then Set GetObj = Nothing: Exit Function
  If Not HasKey(d, key) Then Set GetObj = Nothing: Exit Function
  If Not IsObject(d(key)) Then Set GetObj = Nothing: Exit Function
  Set GetObj = d(key)
  Exit Function
EH:
  Set GetObj = Nothing
End Function

Private Function GetAny(ByVal d As Object, ByVal key As String) As Variant
  On Error GoTo EH
  If d Is Nothing Then GetAny = Empty: Exit Function
  If Not HasKey(d, key) Then GetAny = Empty: Exit Function
  GetAny = d(key)
  Exit Function
EH:
  GetAny = Empty
End Function

Private Function ArrGet(ByVal v As Variant, ByVal idx0 As Long) As Variant
  On Error GoTo EH

  If IsObject(v) Then
    If TypeName(v) = "Collection" Then
      Dim c As Collection: Set c = v
      If idx0 + 1 >= 1 And idx0 + 1 <= c.Count Then ArrGet = c(idx0 + 1)
      Exit Function
    End If
  End If

  If IsArray(v) Then
    Dim lb As Long: lb = LBound(v)
    Dim ub As Long: ub = UBound(v)
    Dim t As Long: t = lb + idx0
    If t >= lb And t <= ub Then ArrGet = v(t)
    Exit Function
  End If

EH:
  ArrGet = Empty
End Function

Private Function Vec3FromCols(ByVal ws As Worksheet, ByVal col As Object, ByVal r As Long, ByVal kx As String, ByVal ky As String, ByVal kz As String) As Object
  Dim xV As Variant: xV = GetCell(ws, col, r, kx)
  Dim yV As Variant: yV = GetCell(ws, col, r, ky)
  Dim zV As Variant: zV = GetCell(ws, col, r, kz)

  If IsBlank(xV) And IsBlank(yV) And IsBlank(zV) Then
    Set Vec3FromCols = Nothing
    Exit Function
  End If

  If IsBlank(xV) Or IsBlank(yV) Or IsBlank(zV) Then
    Err.Raise 10001, "Vec3FromCols", "row " & r & ": " & kx & "/" & ky & "/" & kz & " 3"
  End If

  Dim v As New Collection
  v.Add CDbl(xV): v.Add CDbl(yV): v.Add CDbl(zV)

  '  Collection  Variant  Object 
  ' JsonConverter  Collection  JSON array 
  Set Vec3FromCols = v
End Function

Private Function ParseFramesCell(ByVal v As Variant) As Variant
  ' frames  int or int[]
  If IsBlank(v) Then
    ParseFramesCell = Empty
    Exit Function
  End If

  If IsNumeric(v) Then
    ParseFramesCell = CLng(v)
    Exit Function
  End If

  Dim parsed As Variant: parsed = ParseJsonCell(v)
  If IsEmpty(parsed) Then
    Err.Raise 10001, "ParseFramesCell", "frames  or JSON"
  End If

  ParseFramesCell = parsed
End Function

Private Function ParseJsonCell(ByVal v As Variant) As Variant
  On Error GoTo EH
  If IsBlank(v) Then ParseJsonCell = Empty: Exit Function

  If VarType(v) = vbString Then
    Dim s As String: s = Trim$(CStr(v))
    If IsJsonText(s) Then
      Dim o As Object
      Set o = ParseJson(s)
      ParseJsonCell = o
      Exit Function
    End If
  End If

  ParseJsonCell = Empty
  Exit Function
EH:
  ParseJsonCell = Empty
End Function


' =========================================================
' Tag normalization (schema requires ^(s|m|x):[^\s:]+$ )
' - For convenience, if a tag has no ":", we prefix with "s:" on export.
' =========================================================

Private Function NormalizeTag(ByVal tagValue As String) As String
  Dim s As String: s = Trim$(tagValue)
  If s = "" Then
    NormalizeTag = s
    Exit Function
  End If

  If InStr(1, s, ":", vbBinaryCompare) = 0 Then
    NormalizeTag = "s:" & s
    Exit Function
  End If

  NormalizeTag = s
End Function

Private Function NormalizeTags(ByVal tagsV As Variant) As Variant
  On Error GoTo EH

  If IsObject(tagsV) Then
    If TypeName(tagsV) = "Collection" Then
      Dim c As Collection: Set c = tagsV
      Dim out As New Collection
      Dim i As Long
      For i = 1 To c.Count
        If VarType(c(i)) = vbString Then
          out.Add NormalizeTag(CStr(c(i)))
        Else
          out.Add c(i)
        End If
      Next i
      Set NormalizeTags = out
      Exit Function
    End If
  End If

  If IsArray(tagsV) Then
    Dim lb As Long: lb = LBound(tagsV)
    Dim ub As Long: ub = UBound(tagsV)
    Dim outArr() As Variant
    ReDim outArr(lb To ub)
    Dim j As Long
    For j = lb To ub
      If VarType(tagsV(j)) = vbString Then
        outArr(j) = NormalizeTag(CStr(tagsV(j)))
      Else
        outArr(j) = tagsV(j)
      End If
    Next j
    NormalizeTags = outArr
    Exit Function
  End If

  NormalizeTags = tagsV
  Exit Function

EH:
  NormalizeTags = tagsV
End Function


Private Function IsJsonText(ByVal s As String) As Boolean
  s = Trim$(s)
  IsJsonText = (Len(s) > 0) And ((Left$(s, 1) = "{") Or (Left$(s, 1) = "["))
End Function

' =========================================================
' Extract array-like nodes robustly
' =========================================================

Private Function ExtractObjectsArray(ByVal v As Variant) As Collection
  Dim out As New Collection
  Dim i As Long
  Dim kk As Variant

  If IsObject(v) Then
    If TypeName(v) = "Collection" Then
      Set ExtractObjectsArray = v
      Exit Function
    End If

    If TypeName(v) = "Dictionary" Or TypeName(v) = "Scripting.Dictionary" Then
      Dim d As Object: Set d = v

      If HasKey(d, "objects") Then
        Set ExtractObjectsArray = ExtractObjectsArray(d("objects"))
        Exit Function
      End If
      If HasKey(d, "items") Then
        Set ExtractObjectsArray = ExtractObjectsArray(d("items"))
        Exit Function
      End If

      For Each kk In d.Keys
        out.Add d(kk)
      Next kk

      Set ExtractObjectsArray = out
      Exit Function
    End If
  End If

  If IsArray(v) Then
    On Error GoTo EH
    For i = LBound(v) To UBound(v)
      out.Add v(i)
    Next i
    Set ExtractObjectsArray = out
    Exit Function
EH:
  End If

  Set ExtractObjectsArray = out
End Function

' =========================================================
' UUID
' =========================================================

Private Function NewUUID() As String
  Dim g As GUID, s As String, n As Long
  If CoCreateGuid(g) <> 0 Then NewUUID = vbNullString: Exit Function
  s = String$(40, vbNullChar)
  n = StringFromGUID2(g, StrPtr(s), Len(s))
  If n <= 0 Then NewUUID = vbNullString: Exit Function
  s = Left$(s, n - 1)
  NewUUID = LCase$(Mid$(s, 2, Len(s) - 2))
End Function

' =========================================================
' UTF-8 IO (ADODB.Stream)
' =========================================================

Private Sub WriteUtf8File(ByVal filePath As String, ByVal text As String)
  Dim st As Object: Set st = CreateObject("ADODB.Stream")
  st.Type = 2
  st.Charset = "utf-8"
  st.Open
  st.WriteText text
  st.Position = 0
  st.SaveToFile filePath, 2
  st.Close
End Sub

Private Function ReadUtf8File(ByVal filePath As String) As String
  Dim st As Object: Set st = CreateObject("ADODB.Stream")
  st.Type = 2
  st.Charset = "utf-8"
  st.Open
  st.LoadFromFile filePath
  ReadUtf8File = st.ReadText(-1)
  st.Close
End Function

' =========================================================
' VBA-JSON wrappers
' =========================================================

Private Function ParseJson(ByVal s As String) As Object
  Set ParseJson = JsonConverter.ParseJson(s)
End Function

Private Function ConvertToJson(ByVal v As Variant, Optional ByVal Whitespace As Long = 0) As String
  ConvertToJson = JsonConverter.ConvertToJson(v, Whitespace)
End Function

