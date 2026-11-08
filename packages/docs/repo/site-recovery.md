# 公開版の保管と復元

公開時点のGit原本、ビルド済みの静的サイト、運営者が指定したGit外のファイルを一つのフォルダーに保管する。復元セットを開く作業は本番設定に影響しない。

| 復元セットの中身 | 使い道 |
| --- | --- |
| `source.zip` | 指定コミットのGit原本。Viewer、サイト、Pages Functions、設定原本とlockfileを含む。コミット履歴、他のブランチ、未コミットの作業は別途保管する。 |
| `site/` | 同じコミットから生成した静的配布物。再ビルドせず、ローカルで作品を閲覧できる。 |
| `operator/` | 作成時に明示的に指定した運営資料。DNSの正式エクスポート、現在の配信設定、Git外の添付や購入記録などは、利用できるものを運営者が選ぶ。公開配信の対象外。 |
| `snapshot.json` | 対象コミット、ビルド識別子、ファイルごとのサイズとSHA-256。 |
| `OPEN.txt`・`site_snapshot.py` | Python 3.10以降での読み方と照合ツール。照合はGitやnpmへの接続を必要としない。 |

## セットを作る

Gitと、この版の `apps/site/.node-version` が指定するNode.jsを用意する。以下はWindows PowerShellの例。既存の作業・配布用フォルダーと別の新規フォルダーを使う。

```powershell
git fetch origin main
$revision = (git rev-parse FETCH_HEAD).Trim()
git worktree add --detach ..\3DSL-recovery-build $revision
Push-Location ..\3DSL-recovery-build\apps\site
$env:CF_PAGES_BRANCH = "main"
$env:CF_PAGES_COMMIT_SHA = $revision
$env:SITE_URL = "https://3dsl.jp"
npm ci
npm run build
Pop-Location
```

本番の `https://3dsl.jp/__deploy_probe.txt` のSHAが対象コミットと一致し、ビルドが成功したことを確認する。ビルドに使ったPowerShellセッションで環境変数を設定した場合は、そのセッションを閉じるか元の値に戻す。

```powershell
python scripts/ops/site_snapshot.py create --revision $revision --dist ../3DSL-recovery-build/apps/site/dist --output D:/3DSL-backups/release-01 --operator D:/3DSL-operator-export
python D:/3DSL-backups/release-01/site_snapshot.py verify D:/3DSL-backups/release-01
```

`--operator` は省略できる。保存対象だけを置いたフォルダーを渡す。シンボリックリンク、ハッシュ照合時の入力の変化、コミットの異なるビルド、既存の出力先を検出すると作成を中止する。パスワードや回復コードは通常の作品資料とは別の非公開の保管方法で扱う。復元セットは平文のため、運営資料を入れたセットの閲覧権限は運営者が管理する。

## 別の場所から復元する

セット全体を作業環境と別の保管先へコピーし、戻した新しいフォルダーで以下を実行する。配布した外側のZIPに別途記録したSHA-256がある場合は、展開前に `Get-FileHash -Algorithm SHA256` で照合する。

```powershell
python site_snapshot.py verify .
python -m http.server 8765 --bind 127.0.0.1 --directory site
```

ブラウザで以下を確かめる。

1. `http://127.0.0.1:8765/docs/works/knowledge-questions/` の作品リンクからViewerを開き、対象を選んで図を回す。
2. `http://127.0.0.1:8765/library/26020401/` の図版を表示し、添付 `README.txt` をダウンロードし、作品リンクからモデルを開く。
3. 終了は `Ctrl+C`。配信するルートは `site/` に限定する。CIでは `apps/site` から `node scripts/check/site-recovery.mjs <復元したsiteのパス>` を実行し、外部HTTP応答を遮断したChromiumで作品・図版・添付を検査する。

## 配信設定と保管の記録

Gitにある `apps/site/config`、Functionsおよびリダイレクト原本と、管理画面の設定を区別する。ローカルの静的サーバーはPages FunctionsやCloudflareのヘッダー・キャッシュルールを実行しない。本番を復旧するときは、成功したProductionデプロイ、独自ドメイン、設定値と動作をそれぞれ照合する。

| 対象 | 運営者が残す内容 |
| --- | --- |
| DNS・Pages | DNSのゾーンエクスポート、独自ドメイン、ビルドルート・コマンド・出力、環境別の変数名、キャッシュ式・優先順・TTL、正常なProductionの識別子。公開DNS応答とGit履歴だけでは管理画面の状態を再現できない。 |
| Git外の資料と管理権 | 実在する原本・購入記録の保管先、復旧手段の所在、最終確認日。記録そのものや認証情報を公開リポジトリに入れない。 |
| 運用 | 別保管先、最後に復元できた版、実測した所要時間と範囲、許容する停止時間・失ってよい更新幅。正常公開時やGit外資料・配信設定変更時を保存の契機にできる。 |

[CloudflareのDNSエクスポート](https://developers.cloudflare.com/dns/manage-dns-records/how-to/import-and-export/#export-records) · [Cloudflare Pagesのロールバック](https://developers.cloudflare.com/pages/configuration/rollbacks/) · [git archive](https://git-scm.com/docs/git-archive)
