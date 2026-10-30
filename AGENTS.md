# AGENTS.md

<!-- markus:begin v14 -->
<!-- この印の間は markus が書き換えます（markus の規約）。変えないでください。決まりを足すときは、下の「このプロジェクトの決まり」に書いてください。 -->

このリポジトリは **markus** で管理されている仕様書リポジトリです。人は markus の Web UI から編集し、AI エージェントはこのリポジトリを直接編集して push します。両方から同時に編集されるので、以下の規約を守ってください。下の「このプロジェクトの決まり」と食い違うときは、この規約を優先してください。

## 1. 作業を始める前に

- markus の Web とこの clone を同期していることがある（Web の設定の「AI エージェントと編集」）。同期している間は、Web で書いた内容がすぐこの clone のファイルに書き込まれ、あなたが書き換えた内容も Web に出る。同期しているかは `find .git/markus-sync -mmin -2` で分かる（何か出れば同期している）。
- まず最新にする。
  - 同期していなければ `git pull --rebase --autostash` する。
  - 同期していれば `git fetch` してから `git reset @{u}` する（`--hard` は付けない）。Web の中身はもうファイルにあるので、git の記録だけを合わせる。`git pull` はしない（Web で新しく作ったページがあると止まる）。
  - 同期していて、push していないコミットがある（`git fetch` の後の `git log @{u}..` に何か出る）ときは、`git reset @{u}` しない（そのコミットが無くなる）。人に聞く。
- 同期している間は:
  - 最新にした後も残る、まだコミットしていない変更は、Web で書いている途中の内容。消さない・戻さない・stash しない（`git reset --hard`・`git checkout .`・`git clean`・`git stash` をすると、Web の書きかけも消える）。人には報告しなくてよい。
  - commit するときは、自分が書き換えたファイルだけを `git add` する（`git add -A` で Web の書きかけを混ぜない）。

## 2. 書く前に必ず読む

ファイルを作る・書き換える前に、必ず次のファイルを読む。読まずに書くと、markus の Web で開けない・表示が崩れるファイルになる。

| 書くもの | 書く前に読む |
|---|---|
| ページ（`docs/` の `.md`）・DB の行の本文 | `.markus/agents/pages.md` |
| DB の行のプロパティ・`_database.yml`・ページの中の DB の埋め込み | `.markus/agents/databases.md` |
| シートの CSV・`_sheet.yml`・ページの中のシートの埋め込み | `.markus/agents/sheets.md` |
| コメントの返信・解決・新しいスレッド。本文を書き換えてコメントの対象が変わったとき | `.markus/agents/comments.md` |

- `.md` を書き終えたら、書き換えたファイルを渡して `node .markus/fmt.mjs <ファイル>…` を実行し、出た所を直す（`pages.md`）。
- `.markus/config.yml` と `.markus/members.yml` は、頼まれたとき以外は変更しない。

## 3. 読み方

| 場所 | 中身 |
|---|---|
| `docs/` | ページ（`.md`）。フォルダはディレクトリ。タイトルは frontmatter の `title` |
| `databases/` | データベース。`_database.yml` があるフォルダが 1 つの DB で、中の `.md` が 1 行ずつ。行のプロパティは frontmatter |
| `sheets/` | シート（表計算）。`_sheet.yml` があるフォルダが 1 つのシートで、タブごとに 1 つの CSV |
| `.markus/comments/` | コメント。`<ページの ulid>/<スレッドの ulid>.md` が 1 スレッドで、未解決は `status: open` |
| `.markus/members.yml` | メンバーの `handle` と名前（DB の人の値は `handle`） |

- 内部リンクは `[タイトル](markus:<ulid>)`。リンク先は `grep -rl "ulid: <ulid>" docs/ databases/ sheets/` で探す（DB・シートなら `_database.yml`・`_sheet.yml` が見つかる）。
- 画像・PDF は `https://media.markus.ink/...` の URL で置いてある。見るときは URL から一時ディレクトリに保存して読み込む（例: `curl -sSo /tmp/login.png <URL>`。取得したファイルはコミットしない）。動画は `poster` の画像を見て、必要なら `ffmpeg` でフレームを切り出して見る。
- markus の Web から保存されたコミットは、author が markus の App（bot）になる。実際に変更した人は、コミットメッセージの `Markus-User:` trailer で確かめる（`git blame` で bot と出た行も同じ）。

### 人から場所を渡されたとき

| 渡されたもの | 読み方 |
|---|---|
| `docs/機能/ログイン.md`・`docs/機能/` | リポジトリの一番上からのパス（末尾が `/` ならフォルダ） |
| `docs/機能/ログイン.md:42-48` | そのファイルの 42〜48 行目。frontmatter も 1 行目から数える |
| `sheets/予算/月別.csv B2:D7` | その CSV の 2〜7 行目の B〜D 列 |
| markus の Web の URL（`https://…/p/<プロジェクト>/…`） | 開かない（ログインが要る）。URL の中の ulid で、上のとおりファイルを探す（`?row=<ulid>` は DB の行）。`…/-/<パス>` は `-/` の後ろがパス |

- 渡された行の中身が話と合わなければ、clone が古い。1 のとおりに最新にする。

## 4. commit・push

- 頼まれていなければ、commit・push しない（人はまず Web で、書き換えた内容を確かめてから保存したいため）。終わったら、同期していれば「Web で確かめて保存してください」と伝え、同期していなければ push してよいかを聞く。
- push するときは、もう一度 1 のとおりに最新にしてから commit し、すぐ push する（同期していれば、自分が書き換えたファイルだけを `git add`）。同期していて push が断られたら、`git fetch` → `git reset @{u}` からやり直す（今のコミットは無くなるが、中身はファイルに残っている）。

<!-- markus:end -->

## このプロジェクトの決まり
