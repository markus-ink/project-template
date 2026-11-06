# ページを書く

このファイルは Markus が書き換えます（Markus の規約）。変えないでください。決まりを足すときは、AGENTS.md の「このプロジェクトの決まり」に書いてください。

ページ（`docs/` の `.md`）・サイドページ（`sidepages/` の `.md`）や DB の行の本文を作る・書き換えるときの決まりです。

## 1. ページのファイル

- ページは `.md` ファイル。フォルダはディレクトリ。
- ページは必ず `docs/` の下に置く。`docs/` の外に置いた `.md` は Markus の Web に出ない。
- ファイル名はページタイトルから作る。正式なタイトルは frontmatter の `title`。
  - ファイル名に使えない文字 `/ \ : * ? " < > |` は全角にする（`/` → `／`）。長さはタイトルの先頭 50 文字まで。同じフォルダに同じ名前があれば「 2」を付ける（`無題 2.md`）。
- frontmatter は `ulid`・`title`（必須）と `rank`（任意）だけ。通常のページにほかのプロパティは付けない（プロパティを持つのは DB の行だけ）。

```yaml
---
ulid: 01JB8Z6Q3K4M5N6P7R8S9T0V1W   # ULID（Markus がページを見分ける内部の ID。先頭が作った時刻）。新しいページでは書かなくてよい（整形で付く）
title: ログイン機能
---
```

- 既存の `ulid` は変えない。コピーして新しいページを作ったときは、`ulid` の行を消して整形する（新しい `ulid` が付く）。ほかの例の `ulid` を真似て手で書かない（時刻がでたらめになる）。
- 整形の前に ULID が要るとき（リンク先にするなど）は、`node .markus/fmt.mjs --ulid` で作る。
- 知らないキーがあっても消さない・並び替えない。
- 本文の先頭にタイトルの見出し（`# タイトル`）は書かない。タイトルは `title` だけに持つ。
- `rank` は同じフォルダの中での並び順。新しいページでは省略してよい（タイトル順になる）。
- フォルダの並び順は、そのフォルダの `_folder.yml` の `rank`。新しいフォルダでは作らなくてよい。
- 内部リンクはリンク先の `ulid` で書く: `[パスワード再設定](markus:01M40K9K80H877GNPBH4V44450)`。表示文字列はリンク先のタイトルにする。

### サイドページ

- ページの中に置くページ。サイドバーには出ない。人に「ページの中にページを作って」と頼まれたら、サイドページにする。
- ファイルは `sidepages/<タイトル>.md`（親ごとのフォルダは作らない）。frontmatter はページと同じ `ulid`・`title`。ファイル名の決まりもページと同じ。
- 親のページの本文の置きたい所に、次のブロックを書く。1 つのサイドページを指すブロックはリポジトリ全体で 1 つだけ。別の所にも置きたいときは、サイドページをコピーして新しい `ulid` を振り、そのブロックを書く。

```markus-page
ulid: 01JC2M4N6P8R0S2T4V6W8X0Y2Z
```

- サイドページの中にもサイドページを置ける（それも `sidepages/` の直下）。
- サイドページを消すときは、ファイルとブロックの両方を消す。ブロックだけ消すと、ファイルが残る。

## 2. 本文の記法

GFM を基本に、次の Markus の記法を使う。ここに無いタグや記法は作らない（Markus で開くと文字のまま出たり、消えたりする）。書き方に迷ったら、Markus の Web で保存されたページ（コミットの author が Markus の App のもの）の書き方を真似る。

````markdown
パスワードは<span color="red">8 文字以上</span>にする。<span color="yellow_bg">背景色</span>も付けられる。

<callout icon="⚠️" color="yellow_bg">

**注意**: 中に Markdown を書くときは、開始タグの後と終了タグの前に空行を入れる。

</callout>

<details color="gray">
<summary>詳しい手順</summary>

折りたたむ中身。

</details>

<table header-row="true" header-column="false">
  <colgroup>
    <col width="200">
    <col>
  </colgroup>
  <tr color="gray_bg">
    <td>項目</td>
    <td>内容</td>
  </tr>
  <tr>
    <td>パスワード</td>
    <td color="red">**8 文字以上**<br>英字と数字を両方含む</td>
  </tr>
  <tr>
    <td>ロック</td>
    <td>5 回失敗で 15 分</td>
  </tr>
</table>

<img src="https://media.markus.ink/..." alt="ログイン画面。メールアドレスとパスワードの欄がある" height="300">

<img src="https://media.markus.ink/..." alt="入力前" height="250"> <img src="https://media.markus.ink/..." alt="入力後" height="250">

<embed src="https://media.markus.ink/.../仕様書.pdf" type="application/pdf" title="仕様書.pdf" height="600">

<video src="https://.../demo.mp4" poster="https://.../poster.jpg" title="ログインの流れ"></video>

<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=90" height="400"></iframe>

<bookmark href="https://developer.mozilla.org/ja/docs/Web/HTTP/CORS" title="オリジン間リソース共有 (CORS) - HTTP | MDN" description="..." image="https://..." icon="https://..."></bookmark>

&nbsp;

```mermaid
flowchart LR
  A[ログイン] --> B[ホーム]
```

```html height="400"
<!DOCTYPE html>
<html>（画面のモック）</html>
```

```markus-db
database: タスク
type: board
```

```markus-sheet
sheet: 予算
tab: 月別
```
````

- 表は必ず `<table>` で書く。GFM の表（`| a | b |`）では書かない（色・幅・見出しの指定が書けず、Web で保存したときに全部書き直される）。
  - `header-row`（1 行目を見出しにする）と `header-column`（1 列目を見出しにする）は両方書く。見出しのセルも `<td>` で書く。
  - 色は `<col color>`（列）・`<tr color>`（行）・`<td color>`（セル）、幅は `<col width>`（px）。要らなければ `<colgroup>` は書かなくてよい。
  - セルの中は 1 行の Markdown で、改行は `<br>`。
- 色の名前は `gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red`。背景色は `_bg` を付ける（`yellow_bg`）。`style` 属性や 16 進数の色コードは書かない。
- `<img>` は高さを決めるときだけ使う。決めないなら `![説明](URL)`。
- 画像・動画・PDF・YouTube・` ```html ` の `height` は、50 の倍数（50 以上。画像・動画は 750 まで）で書く（Web では 50px 刻みで変えるため）。
- 画像（と `<video>`）だけを空白 1 つで区切って 1 行に並べると、横に並んだ画像のブロック（ギャラリー）になる。その行には文字を書かない。高さを決めるなら、全部の画像に同じ `height` を書く。
- ` ```html ` はコードではなく、動く画面（画面のモックなど）になる。`<!DOCTYPE html>` から始まる 1 つの文書で書く。
- ` ```markus-db `・` ```markus-sheet ` は DB・シートの埋め込み。書ける項目は `databases.md`・`sheets.md` を読む。` ```markus-page ` はサイドページ（1）。
- `&nbsp;` だけの段落は、Web で入れた何も書いていない行。消さない。

次の書き方は Markus には無い。書かないで、右の書き方にする。

| 書かない | 代わりに |
|---|---|
| `<columns>`・`<column>`（横に並べる） | ブロックは縦に 1 列に並べる（画像だけは 1 行に並べてよい。上のギャラリー） |
| `<empty-block/>` | `&nbsp;` だけの段落 |
| 段落の後ろの `{color="red"}` | `<span color="red">…</span>` |
| `<mention-page>` | `[タイトル](markus:<ulid>)`（1） |
| `<page>`（ページの中のページ） | サイドページ（1 の「サイドページ」） |
| `<mention-user>`・`<mention-date>` | 名前や日付を文字で書く |
| `<table_of_contents/>` | 書かない（目次のブロックは無い） |
| `> [!NOTE]` などの Alert | `<callout>` |
| `$…$`（数式）・`[^1]`（脚注） | 書かない（Markus では表示できない） |

次の 7 つは、間違えても後の整形で見つからない（別の意味の正しい Markdown になる）ので、書くときに気を付ける。

- 太字・斜体・取り消し線の中身の最初か最後が記号（「」、。（）など）のときは、`**` `*` `~~` でなく `<strong>` `<em>` `<s>` で書く（`前の**「重要」**後` は太字にならない）。中には Markdown を書いてよい。
- 見出しと ToDo の項目の文章の中の改行は `<br>`。
- 文章の行の頭にブロックの記号（`# ` `- ` `1. ` `> ` ```` ``` ```` `---`）を文字として書くときは `\` を付ける（`\- `・`1\. `）。
- URL をリンクにするときは `[文字](URL)` か `<URL>` で書く。文字のすぐ後ろの URL（`名前https://…`）はリンクにならない。
- コードフェンスの中に ```` ``` ```` を書くときは、それより長いフェンス（````` ```` `````）で囲む。
- リストの項目の下に画像・ギャラリーを入れるときは、項目の文章との間に空の行を空けて、字下げして書く（空けないと項目の文章の中の画像になる）。
- 画像・動画のキャプションの改行は、そのまま書かず、すべて `&#10;` にする（改行のまま書くと、空の行や「#」「-」「>」などで始まる行でそこが切れて、画像・動画でなくなる）。改行のある画像は `![...]` ではなく `<img src="..." alt="1 行目&#10;2 行目">` で書く。動画は `title` に同じように書く。`alt`・`title` の中の「"」は `&quot;`。

## 3. 画像・動画・PDF

- 画像・動画・PDF はリポジトリに置かない。Markus の Web でアップロードした URL（`https://media.markus.ink/...`）を使う。
- 画像の代替テキストには、画像の内容を文章で書く。GIF は最初のコマしか見えないので、動きも文章で書く。
- `data-figma` の付いた `<img>` は Figma ブロック。AI からは作らない（人が Figma のプラグインで書き出した zip を Web で置く）。動かすときは `data-figma` も一緒に動かし、消さない（消すとふつうの画像になり、レイヤーを見られなくなる）。
- 動画は `<video>` で置く（`title` はキャプション）。YouTube の動画は `<iframe src="https://www.youtube.com/embed/<ID>">`（始める位置は `?start=<秒>`）。YouTube のほかの `<iframe>` は書かない。
- リンク先をカードで見せるときは `<bookmark href="<URL>" title="<タイトル>"></bookmark>`。`description`（説明）・`image`（サムネイルの URL）・`icon`（アイコンの URL）は分かれば書く。属性の値の「"」は `&quot;`、「&」は `&amp;`、改行は書かない。
- `<iframe>`・`<bookmark>` は、行の頭に 1 行で、前後に空の行を空けて書く。

## 4. 整形

- `.md`（ページ・サイドページ・DB の行・テンプレート）・`_database.yml`・`_sheet.yml`・コメントを書き終えたら、書き換えたファイルを渡して整形する: `node .markus/fmt.mjs docs/機能/ログイン.md …`
  - `ulid` が無ければ付く。形の正しくない `ulid`・未来の時刻・新しいファイルなのに古い時刻（ほかのファイルを写した）は、直せない所として出る。
  - Web で保存したときと同じ書き方に直る（箇条書きの記号・字下げ・空行・表の形など）。この細かい書き方は気にしなくてよい。
  - 直せない所は `ファイル:行 理由` の形で出る（そのファイルは書き換わらない）。読んで直し、何も出なくなるまで繰り返す。
  - 同じサイドページを指すブロックを 2 つ書いていたら、2 つ目からを複製のサイドページ（新しいファイル）に直す。
  - 自分が書き換えていないファイルには実行しない（人が書いた所や、同期している間の Web の書きかけまで書き換わるため）。
- 本文の文を書き換えて、コメントの対象の文が変わったときは、コメントも合わせる（`comments.md`）。
