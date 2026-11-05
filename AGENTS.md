# AGENTS.md

<!-- markus:begin v28 -->
<!-- この印の間は Markus が書き換えます（Markus の規約）。変えないでください。決まりを足すときは、下の「このプロジェクトの決まり」に書いてください。 -->

このリポジトリは **Markus** で管理されている仕様書リポジトリです。人は Markus の Web UI から編集し、AI エージェントはこのリポジトリを直接編集して push します。両方から同時に編集されるので、以下の規約を守ってください。下の「このプロジェクトの決まり」と食い違うときは、この規約を優先してください。

## 1. 作業を始める前に

- Markus の Web とこの clone を同期していることがある（Web の設定の「AI エージェントと編集」）。同期している間は、Web で書いた内容がすぐこの clone のファイルに書き込まれ、あなたが書き換えた内容も Web に出る。同期しているかは `find .git/markus-sync -mmin -2` で分かる（何か出れば同期している）。
- まず最新にする。
  - 同期していなければ `git pull --rebase --autostash` する。
  - 同期していれば `git fetch` してから `git reset @{u}` する（`--hard` は付けない）。Web の中身はもうファイルにあるので、git の記録だけを合わせる。`git pull` はしない（Web で新しく作ったページがあると止まる）。
  - 同期していて、push していないコミットがある（`git fetch` の後の `git log @{u}..` に何か出る）ときは、`git reset @{u}` しない（そのコミットが無くなる）。人に聞く。
- 同期している間は:
  - 最新にした後も残る、まだコミットしていない変更は、Web で書いている途中の内容。消さない・戻さない・stash しない（`git reset --hard`・`git checkout .`・`git clean`・`git stash` をすると、Web の書きかけも消える）。人には報告しなくてよい。
  - commit するときは、自分が書き換えたファイルだけを `git add` する（`git add -A` で Web の書きかけを混ぜない）。

## 2. 書く前に必ず読む

ファイルを作る・書き換える前に、必ず次のファイルを読む。読まずに書くと、Markus の Web で開けない・表示が崩れるファイルになる。

| 書くもの | 書く前に読む |
|---|---|
| ページ（`docs/` の `.md`）・サイドページ（`sidepages/`）・DB の行の本文 | `.markus/agents/pages.md` |
| DB の行のプロパティ・`_database.yml`・ページの中の DB の埋め込み | `.markus/agents/databases.md` |
| シートの CSV・`_sheet.yml`・ページの中のシートの埋め込み | `.markus/agents/sheets.md` |
| コメントの返信・解決・新しいスレッド。本文を書き換えてコメントの対象が変わったとき | `.markus/agents/comments.md` |

- 書き終えたら、書き換えたファイル（`.md`・`_database.yml`・`_sheet.yml`）を渡して `node .markus/fmt.mjs <ファイル>…` を実行し、出た所を直す（`pages.md`）。`ulid` が無ければ付く。
- コメント・DB の作成者に AI（あなた）を書くときは `ai:<人>`。`<人>` は `.git/markus-user` の中身（無ければ `git config user.name`）。どの AI かは書かない。
- `.markus/config.yml` と `.markus/members.yml` は、頼まれたとき以外は変更しない。

## 3. 読み方

| 場所 | 中身 |
|---|---|
| `docs/` | ページ（`.md`）。フォルダはディレクトリ。タイトルは frontmatter の `title` |
| `sidepages/` | サイドページ（ページの中のページ。サイドバーには出ない）。親は ` ```markus-page ` に `ulid: <サイドページの ulid>` を書いたページ |
| `databases/` | データベース。`_database.yml` があるフォルダが 1 つの DB で、中の `.md` が 1 行ずつ。行のプロパティは frontmatter |
| `sheets/` | シート（表計算）。`_sheet.yml` があるフォルダが 1 つのシートで、タブごとに 1 つの CSV |
| `.markus/templates/` | テンプレート。1 ファイルが 1 つで、ファイル名が名前、中身は差し込む本文だけ（frontmatter は付けない）。人が「/テンプレート」でページや行の途中に差し込む。ページや行を書くときに合うものがあれば、その形で書く |
| `.markus/comments/` | コメント。`<ページの ulid>/<スレッドの ulid>.md` が 1 スレッドで、未解決は `status: open` |
| `.markus/members.yml` | メンバーの `handle` と名前（DB の人の値は `handle`） |

- 内部リンクは `[タイトル](markus:<ulid>)`。リンク先は `grep -rl "ulid: <ulid>" docs/ databases/ sheets/ sidepages/` で探す（DB・シートなら `_database.yml`・`_sheet.yml` が見つかる）。サイドページの親も同じ grep で探す（出てきたファイルから、サイドページ自身を除いたものが親）。
  - シートのタブへのリンクは `[シート名 / タブ名](markus:<_sheet.yml の ulid>#<タブの名前>)`。タブの名前の空白と `(` `)` `<` `>` `[` `]` `%` `#` `\` だけ `%XX` にし、日本語はそのまま書く（`β の 5 社` → `β%20の%205%20社`）。
- 画像・動画・PDF は `https://media.markus.ink/...` の URL で置いてある。プロジェクトのメンバーしか見られないので、`curl` では取れない。`node .markus/media.mjs <URL>…` で一時ディレクトリに保存し、出たパスを読み込む（取得したファイルはコミットしない）。
  - 初めてのときや連携が切れたときは、開く URL とコードが出て止まる（終了コード 2）。その文をそのまま人に伝え、「許可した」と言われたら同じコマンドをもう一度実行する。自分でブラウザを開いて許可しない。
  - ほかのサイトの URL は、このスクリプトでは取らない（`curl` などで取る）。
  - 動画は `poster` の画像を見て、必要なら `ffmpeg` でフレームを切り出して見る。YouTube の動画（`<iframe>`）・ブックマーク（`<bookmark>`）は、`title` を読めば何かが分かる。
- Markus の Web から保存されたコミットは、author が Markus の App（bot）になる。実際に変更した人は、コミットメッセージの `Markus-User:` trailer で確かめる（`git blame` で bot と出た行も同じ）。

### 人から場所を渡されたとき

| 渡されたもの | 読み方 |
|---|---|
| `docs/機能/ログイン.md`・`docs/機能/` | リポジトリの一番上からのパス（末尾が `/` ならフォルダ） |
| `docs/機能/ログイン.md:42-48` | そのファイルの 42〜48 行目。frontmatter も 1 行目から数える |
| `sheets/予算/月別.csv B2:D7` | その CSV の 2〜7 行目の B〜D 列 |
| Markus の Web の URL（`https://…/p/<プロジェクト>/…`） | 開かない（ログインが要る）。URL の中の ulid で、上のとおりファイルを探す（`?row=<ulid>` は DB の行）。`…/-/<パス>` は `-/` の後ろがパス |

- 渡された行の中身が話と合わなければ、clone が古い。1 のとおりに最新にする。

## 4. commit・push

- 頼まれていなければ、commit・push しない（人はまず Web で、書き換えた内容を確かめてから保存したいため）。終わったら、同期していれば「Web で確かめて保存してください」と伝え、同期していなければ push してよいかを聞く。
- push するときは、もう一度 1 のとおりに最新にしてから commit し、すぐ push する（同期していれば、自分が書き換えたファイルだけを `git add`）。同期していて push が断られたら、`git fetch` → `git reset @{u}` からやり直す（今のコミットは無くなるが、中身はファイルに残っている）。

<!-- markus:end -->

## このプロジェクトの決まり
