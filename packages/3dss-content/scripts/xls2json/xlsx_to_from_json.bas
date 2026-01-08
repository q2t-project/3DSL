Option Explicit



' =========================================================

' 3DSS xlsx <-> json  (single-module, compile-safe)

' - points/lines: row1 = keys (may contain line breaks -> we take first line only)

' - points/lines: row4.. = data

' - aux: colA "json" (1 row = 1 raw json)

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



' =========================================================

' Public macros

' =========================================================



Public Sub Import3DSS_JSON()

  On Error GoTo EH



  Dim jsonText As String

  jsonText = ReadUtf8File(ThisWorkbook.path & "\in.3dss.json")



  Dim doc As Object

  Set doc = ParseJson(jsonText)



  If HasKey(doc, "document_meta") Then WriteDocumentMeta doc("document_meta")

  If HasKey(doc, "points") Then WriteSheetElements "points", ExtractObjectsArray(doc("points"))

  If HasKey(doc, "lines") Then WriteSheetElements "lines", ExtractObjectsArray(doc("lines"))

  If HasKey(doc, "aux") Then WriteAuxJsonArray ExtractObjectsArray(doc("aux"))



  Exit Sub

EH:

  MsgBox "IMPORT ERROR: " & Err.Number & vbCrLf & Err.Description, vbCritical

End Sub



Public Sub Export3DSS_JSON()

  On Error GoTo EH



  Dim doc As Object: Set doc = CreateObject("Scripting.Dictionary")

  Set doc("document_meta") = BuildDocumentMeta()

  Set doc("points") = ReadSheetElements("points")

  Set doc("lines") = ReadSheetElements("lines")

  Set doc("aux") = ReadAuxJsonArray()



  Dim jsonText As String

  jsonText = ConvertToJson(doc, 2)



  WriteUtf8File ThisWorkbook.path & "\out.3dss.json", jsonText

  Exit Sub

EH:

  MsgBox "EXPORT ERROR: " & Err.Number & vbCrLf & Err.Description, vbCritical

End Sub



' Immediate: Ctrl+G で出してこれ実行

Public Sub Debug_DumpTopKeysAndCounts()

  Dim doc As Object, k As Variant

  Set doc = ParseJson(ReadUtf8File(ThisWorkbook.path & "\in.3dss.json"))



  Debug.Print "=== TOP KEYS ==="

  For Each k In doc.keys

    Debug.Print k, TypeName(doc(k)), "count=", CountAny(doc(k))

  Next k



  If HasKey(doc, "points") Then Debug.Print "points(objects) =", ExtractObjectsArray(doc("points")).Count

  If HasKey(doc, "lines") Then Debug.Print "lines(objects)  =", ExtractObjectsArray(doc("lines")).Count

End Sub



' =========================================================

' document_meta

' =========================================================



Private Function BuildDocumentMeta() As Object

  Dim m As Object: Set m = CreateObject("Scripting.Dictionary")

  m("document_title") = "Untitled"

  m("document_uuid") = NewUUID()

  m("schema_uri") = "（ここは運用に合わせて固定）"

  m("author") = "unknown"

  m("version") = "1.0.0"

  Set BuildDocumentMeta = m

End Function



Private Sub WriteDocumentMeta(ByVal metaObj As Object)

  Dim ws As Worksheet

  Set ws = EnsureSheet("document_meta")



  ws.Cells.Clear

  ws.Cells(1, 1).value = "key"

  ws.Cells(1, 2).value = "value"



  Dim keys As Variant

  keys = DictKeys(metaObj)

  If IsEmpty(keys) Then Exit Sub



  SortStrings keys



  Dim i As Long, r As Long: r = 2

  For i = LBound(keys) To UBound(keys)

    Dim kk As String: kk = CStr(keys(i))

    ws.Cells(r, 1).value = kk

    ws.Cells(r, 2).value = MetaValueToCell(metaObj(kk))

    r = r + 1

  Next i

End Sub



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



Private Sub WriteAuxJsonArray(ByVal elements As Collection)

  Dim ws As Worksheet: Set ws = EnsureSheet("aux")

  ws.Cells.Clear

  ws.Cells(1, 1).value = "json"



  Dim i As Long

  For i = 1 To elements.Count

    ws.Cells(i + 1, 1).value = ConvertToJson(elements(i), 0)

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

  For r = 2 To lastRow

    Dim s As String: s = Trim$(CStr(ws.Cells(r, 1).value))

    If Len(s) > 0 Then out.Add ParseJson(s)

  Next r



  Set ReadAuxJsonArray = out

End Function



' =========================================================

' points/lines read/write

' =========================================================



Private Function ReadSheetElements(ByVal sheetName As String) As Collection

  Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets(sheetName)



  Dim lastCol As Long: lastCol = LastUsedCol(ws)

  If lastCol = 0 Then

    Set ReadSheetElements = New Collection

    Exit Function

  End If



  Dim rawKeys As Variant

  rawKeys = ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol)).value



  Dim out As New Collection

  Dim lastRow As Long: lastRow = LastUsedRow(ws)



  Dim r As Long, c As Long

  For r = DATA_START_ROW To lastRow

    Dim el As Object: Set el = CreateObject("Scripting.Dictionary")

    Dim hasAny As Boolean: hasAny = False



    For c = 1 To UBound(rawKeys, 2)

      Dim k As String: k = NormalizeKey(CStr(rawKeys(1, c)))

      If Len(k) = 0 Then GoTo NextC



      Dim v As Variant: v = ws.Cells(r, c).value

      If IsError(v) Then GoTo NextC

      If IsEmpty(v) Then GoTo NextC

      If VarType(v) = vbString Then If Len(Trim$(CStr(v))) = 0 Then GoTo NextC



      If EndsWith(k, "_json") And VarType(v) = vbString Then

        Dim sv As String: sv = Trim$(CStr(v))

        If IsJsonText(sv) Then

          On Error Resume Next

          Dim parsed As Object

          Set parsed = ParseJson(sv)

          If Err.Number = 0 Then v = parsed Else Err.Clear

          On Error GoTo 0

        End If

      End If



      hasAny = True

      SetPathValueEx el, k, v

NextC:

    Next c



    If hasAny Then

      EnsureMetaUuid el

      out.Add el

    End If

  Next r



  Set ReadSheetElements = out

End Function



Private Sub WriteSheetElements(ByVal sheetName As String, ByVal elements As Collection)

  Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets(sheetName)



  Dim lastCol As Long: lastCol = LastUsedCol(ws)

  If lastCol = 0 Then Exit Sub



  Dim rawKeys As Variant

  rawKeys = ws.Range(ws.Cells(1, 1), ws.Cells(1, lastCol)).value



  Dim clearTo As Long: clearTo = Application.Max(DATA_START_ROW, LastUsedRow(ws))

  ws.Range(ws.Cells(DATA_START_ROW, 1), ws.Cells(clearTo, lastCol)).ClearContents



  Dim r As Long: r = DATA_START_ROW

  Dim i As Long

  For i = 1 To elements.Count

    WriteOneRow ws, rawKeys, r, elements(i)

    r = r + 1

  Next i

End Sub



Private Sub WriteOneRow(ByVal ws As Worksheet, ByVal rawKeys As Variant, ByVal rowNum As Long, ByVal el As Variant)

  Dim c As Long

  For c = 1 To UBound(rawKeys, 2)

    Dim k As String: k = NormalizeKey(CStr(rawKeys(1, c)))

    If Len(k) = 0 Then GoTo NextC



    Dim v As Variant

    v = GetPathValueEx(el, k)



    If IsEmpty(v) Then

      ws.Cells(rowNum, c).ClearContents

    ElseIf IsNull(v) Then

      ws.Cells(rowNum, c).value = vbNullString

    ElseIf IsObject(v) Then

      If EndsWith(k, "_json") Then

        ws.Cells(rowNum, c).value = ConvertToJson(v, 0)

      Else

        ws.Cells(rowNum, c).ClearContents

      End If

    Else

      ws.Cells(rowNum, c).value = v

    End If

NextC:

  Next c

End Sub



' =========================================================

' Key normalization: TAKE FIRST LINE ONLY (IMPORTANT)

' =========================================================



Private Function NormalizeKey(ByVal raw As String) As String

  Dim s As String: s = Trim$(raw)

  ' unify CR/LF -> LF
  s = Replace(s, vbCrLf, vbLf)
  s = Replace(s, vbCr, vbLf)

  ' header keys may be split by line breaks to show nesting, e.g.
  '   appearance.
  '   position[0]
  ' We join key-like lines and ignore trailing note lines (if any).

  Dim parts() As String: parts = Split(s, vbLf)
  Dim i As Long
  Dim out As String: out = vbNullString

  For i = LBound(parts) To UBound(parts)

    Dim p As String: p = Trim$(parts(i))
    If Len(p) = 0 Then GoTo NextI

    ' stop at non-key note lines (safety)
    If InStr(1, p, " ", vbBinaryCompare) > 0 Then Exit For
    If InStr(1, p, ":", vbBinaryCompare) > 0 Then Exit For
    If InStr(1, p, "(", vbBinaryCompare) > 0 Then Exit For

    If Len(out) = 0 Then
      out = p
    Else
      If Right$(out, 1) = "." Or Left$(p, 1) = "[" Then
        out = out & p
      Else
        out = out & "." & p
      End If
    End If

NextI:
  Next i

  out = Trim$(out)

  ' remove trailing dots (Split() would create empty parts)
  Do While Len(out) > 0 And Right$(out, 1) = "."
    out = Left$(out, Len(out) - 1)
    out = Trim$(out)
  Loop

  NormalizeKey = out
End Function



' =========================================================

' Path Set/Get: a.b[2] / a.b[ja]

' =========================================================



Private Sub ParsePartEx(ByVal part As String, _
  ByRef name As String, _
  ByRef hasBracket As Boolean, _
  ByRef bracketIsIndex As Boolean, _
  ByRef idx As Long, _
  ByRef key As String)



  Dim p As Long: p = InStr(1, part, "[", vbBinaryCompare)

  If p = 0 Then

    name = part: hasBracket = False: bracketIsIndex = False: idx = 0: key = vbNullString

    Exit Sub

  End If



  name = Left$(part, p - 1)

  hasBracket = True



  Dim q As Long: q = InStr(p + 1, part, "]", vbBinaryCompare)

  If q = 0 Then

    key = vbNullString

  Else

    key = Mid$(part, p + 1, q - p - 1)

  End If



  If Len(key) > 0 And IsNumeric(key) Then

    bracketIsIndex = True

    idx = CLng(key)

    key = vbNullString

  Else

    bracketIsIndex = False

    idx = 0

  End If

End Sub



Private Sub SetPathValueEx(ByVal root As Object, ByVal path As String, ByVal value As Variant)

  Dim parts() As String: parts = Split(path, ".")

  Dim cur As Object: Set cur = root



  Dim i As Long

  For i = LBound(parts) To UBound(parts)

    Dim name As String, hasB As Boolean, isIdx As Boolean, idx As Long, key As String

    ParsePartEx parts(i), name, hasB, isIdx, idx, key



    Dim isLast As Boolean: isLast = (i = UBound(parts))

    Dim d As Object: Set d = cur



    If Not hasB Then

      If isLast Then

        d(name) = value

      Else

        If Not HasKey(d, name) Or Not IsObject(d(name)) Then Set d(name) = CreateObject("Scripting.Dictionary")

        Set cur = d(name)

      End If



    ElseIf isIdx Then

      Dim arr As Variant

      If Not HasKey(d, name) Then

        ReDim arr(0 To idx)

      Else

        arr = d(name)

        If Not IsArray(arr) Then

          ReDim arr(0 To idx)

        ElseIf UBound(arr) < idx Then

          ReDim Preserve arr(0 To idx)

        End If

      End If



      If isLast Then

        arr(idx) = value

      Else

        If IsEmpty(arr(idx)) Or Not IsObject(arr(idx)) Then Set arr(idx) = CreateObject("Scripting.Dictionary")

        Set cur = arr(idx)

      End If

      d(name) = arr



    Else

      Dim inner As Object

      If Not HasKey(d, name) Or Not IsObject(d(name)) Then Set d(name) = CreateObject("Scripting.Dictionary")

      Set inner = d(name)



      If isLast Then

        inner(key) = value

      Else

        If Not HasKey(inner, key) Or Not IsObject(inner(key)) Then Set inner(key) = CreateObject("Scripting.Dictionary")

        Set cur = inner(key)

      End If

    End If

  Next i

End Sub



Private Function GetPathValueEx(ByVal root As Variant, ByVal path As String) As Variant

  On Error GoTo EH



  Dim parts() As String: parts = Split(path, ".")

  Dim cur As Variant: cur = root



  Dim i As Long

  For i = LBound(parts) To UBound(parts)

    Dim name As String, hasB As Boolean, isIdx As Boolean, idx As Long, key As String

    ParsePartEx parts(i), name, hasB, isIdx, idx, key



    If Not IsObject(cur) Then GetPathValueEx = Empty: Exit Function

    Dim d As Object: Set d = cur

    If Not HasKey(d, name) Then GetPathValueEx = Empty: Exit Function



    cur = d(name)



    If hasB Then

      If isIdx Then

        If IsArray(cur) Then

          If idx < LBound(cur) Or idx > UBound(cur) Then GetPathValueEx = Empty: Exit Function

          cur = cur(idx)

        ElseIf IsObject(cur) And TypeName(cur) = "Collection" Then

          If idx + 1 < 1 Or idx + 1 > cur.Count Then GetPathValueEx = Empty: Exit Function

          cur = cur(idx + 1)

        Else

          GetPathValueEx = Empty: Exit Function

        End If

      Else

        If Not IsObject(cur) Then GetPathValueEx = Empty: Exit Function

        Dim d2 As Object: Set d2 = cur

        If Not HasKey(d2, key) Then GetPathValueEx = Empty: Exit Function

        cur = d2(key)

      End If

    End If

  Next i



  GetPathValueEx = cur

  Exit Function

EH:

  GetPathValueEx = Empty

End Function



' =========================================================

' Extract array-like nodes robustly

' =========================================================



Private Function ExtractObjectsArray(ByVal v As Variant) As Collection

  Dim out As New Collection

  Dim i As Long

  Dim kk As Variant



  ' 1) Collection (VBA-JSONの標準)

  If IsObject(v) Then

    If TypeName(v) = "Collection" Then

      Set ExtractObjectsArray = v

      Exit Function

    End If



    ' 2) Dictionaryラップ (objects/items)

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



      ' 3) それ以外の辞書は値を列挙（保険）

      For Each kk In d.keys

        out.Add d(kk)

      Next kk



      Set ExtractObjectsArray = out

      Exit Function

    End If

  End If



  ' 4) Variant配列（JsonConverter側でUseCollection=False等のとき）

  If IsArray(v) Then

    On Error GoTo EH

    For i = LBound(v) To UBound(v)

      out.Add v(i)

    Next i

    Set ExtractObjectsArray = out

    Exit Function

EH:

    ' fallthrough

  End If



  Set ExtractObjectsArray = out

End Function



' =========================================================

' UUID & helpers

' =========================================================



Private Sub EnsureMetaUuid(ByVal el As Object)

  Dim meta As Object

  If Not HasKey(el, "meta") Or Not IsObject(el("meta")) Then

    Set meta = CreateObject("Scripting.Dictionary")

    meta("uuid") = NewUUID()

    Set el("meta") = meta

    Exit Sub

  End If



  Set meta = el("meta")

  If Not HasKey(meta, "uuid") Then meta("uuid") = NewUUID()

End Sub



Private Function NewUUID() As String

  Dim g As GUID, s As String, n As Long

  If CoCreateGuid(g) <> 0 Then NewUUID = vbNullString: Exit Function

  s = String$(40, vbNullChar)

  n = StringFromGUID2(g, StrPtr(s), Len(s))

  If n <= 0 Then NewUUID = vbNullString: Exit Function

  s = Left$(s, n - 1)

  NewUUID = LCase$(Mid$(s, 2, Len(s) - 2))

End Function



Private Function EnsureSheet(ByVal name As String) As Worksheet

  Dim ws As Worksheet

  On Error Resume Next

  Set ws = ThisWorkbook.Worksheets(name)

  On Error GoTo 0

  If ws Is Nothing Then

    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))

    ws.name = name

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

  DictKeys = d.keys

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



Private Function EndsWith(ByVal s As String, ByVal suffix As String) As Boolean

  If Len(suffix) = 0 Then EndsWith = True: Exit Function

  If Len(s) < Len(suffix) Then EndsWith = False: Exit Function

  EndsWith = (Right$(s, Len(suffix)) = suffix)

End Function



Private Function IsJsonText(ByVal s As String) As Boolean

  s = Trim$(s)

  IsJsonText = (Len(s) > 0) And ((Left$(s, 1) = "{") Or (Left$(s, 1) = "["))

End Function



Private Function LastUsedRow(ByVal ws As Worksheet) As Long

  If ws.UsedRange.Cells.Count = 1 And IsEmpty(ws.UsedRange.Cells(1, 1).value) Then

    LastUsedRow = 0

  Else

    LastUsedRow = ws.UsedRange.Row + ws.UsedRange.Rows.Count - 1

  End If

End Function



Private Function LastUsedCol(ByVal ws As Worksheet) As Long

  If ws.UsedRange.Cells.Count = 1 And IsEmpty(ws.UsedRange.Cells(1, 1).value) Then

    LastUsedCol = 0

  Else

    LastUsedCol = ws.UsedRange.Column + ws.UsedRange.Columns.Count - 1

  End If

End Function



Private Function CountAny(ByVal v As Variant) As Long

  On Error GoTo EH

  If IsObject(v) Then

    If TypeName(v) = "Collection" Then CountAny = v.Count: Exit Function

    If TypeName(v) = "Dictionary" Or TypeName(v) = "Scripting.Dictionary" Then CountAny = v.Count: Exit Function

  End If

  If IsArray(v) Then

    CountAny = (UBound(v) - LBound(v) + 1)

    Exit Function

  End If

EH:

  CountAny = 0

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

' VBA-JSON wrappers (NO name drift)

' =========================================================



Private Function ParseJson(ByVal s As String) As Object
  Set ParseJson = JsonConverter.ParseJson(s)
End Function



Private Function ConvertToJson(ByVal v As Variant, Optional ByVal Whitespace As Long = 0) As String

  ConvertToJson = JsonConverter.ConvertToJson(v, Whitespace:=Whitespace)

End Function




