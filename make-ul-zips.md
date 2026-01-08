# 推奨：軽量ソースだけ
.\make-ul-zips.ps1

# publicも少し欲しい（ただし vendor / distミラー は落ちる）
.\make-ul-zips.ps1 -Profile sandbox-all

# 1つにまとめたい
.\make-ul-zips.ps1 -SingleZip

# でかいJSONや画像も入れたい（上限を上げる）
.\make-ul-zips.ps1 -MaxFileMB 200

# custom（必要な場所だけ）
.\make-ul-zips.ps1 -Profile custom -Targets @("apps/viewer","apps/site/src")