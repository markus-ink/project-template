# コメントを書く

このファイルは markus が書き換えます（markus の規約）。変えないでください。決まりを足すときは、AGENTS.md の「このプロジェクトの決まり」に書いてください。

コメントに返信する・解決する・新しいスレッドを作るとき、また本文を書き換えてコメントの対象が変わったときの決まりです。

## 1. ファイル

- コメントは `.markus/comments/<ページの ulid>/<スレッドの ulid>.md` にある（DB の行へのコメントも同じ）。1 ファイルが 1 スレッド。

```markdown
---
ulid: 01JC1A2B3C4D5E6F7G8H9J0K1M
page: 01JB8Z6Q3K4M5N6P7R8S9T0V1W
status: open
created_by: suzuki
original_quote: "リセット URL の有効期限は 24 時間とする"
anchor:
  type: text
  quote: "リセット URL の有効期限は 24 時間とする"
  prefix: "メールの "
  suffix: "。"
  section: "ルール"
---

### suzuki · 2026-11-02T10:15+09:00
有効期限は 24 時間で合っていますか？

### ai:claude-code · 2026-11-02T11:03+09:00
実装（`src/auth/reset.ts`）では 1 時間になっています。仕様を 1 時間に直しますか？
```

| キー | 内容 |
|---|---|
| `ulid` | スレッドの固定 ID（ファイル名と同じ） |
| `page` | 対象のページ（DB の行も）の `ulid` |
| `status` | `open`（未解決）・`resolved`（解決） |
| `created_by`・`resolved_by` | 始めた人・解決した人。人は `handle`、AI は `ai:<エージェント名>`（`ai:claude-code`・`ai:codex`）。`resolved_by` は解決しているときだけ |
| `original_quote` | 投稿したときの対象の文。後から変えない |
| `anchor` | 今の本文で対象を探す手がかり（下の表） |

- 1 件のコメントは `### <投稿者> · <日時>` の見出しと、その下の本文（Markdown）。見出しに ` · 編集 <日時>` が付いているのは、投稿した人が直したコメント。

## 2. 対象の書き方

| 対象 | `original_quote` | `anchor` |
|---|---|---|
| ページ全体 | 書かない | 書かない |
| 本文の一部 | 選んだ文字 | `type: text`・`quote`（対象の文）・`prefix`・`suffix`（すぐ前・すぐ後の文字。30 文字まで）・`section`（対象を含む直近の見出し） |
| ブロック全体 | 書かない | `type: block`・`block`（種類）・下の手がかり・`section` |

- `quote`・`prefix`・`suffix` は、ページの本文に 1 字も違わずにある文字にする。画面に見えている文字で書き、Markdown の記号（`**`・`[...](...)` など）は含めない。`prefix`・`suffix` は対象と同じブロック（段落・見出し・リストの項目・表のセルなど）の中の文字だけで、ブロックの先頭・末尾なら書かない。

ブロック全体へのコメントの手がかり:

| `block` | 手がかり |
|---|---|
| `database`（DB の埋め込み） | `database: <DB の ulid>`（`_database.yml` の `ulid`） |
| `sheet`（シートの埋め込み） | `sheet: <シートの ulid>` |
| `image`・`video`・`pdf` | `src: <ファイルの URL>` |
| `html`・`mermaid`・`code` | `quote`: 中身の先頭（30 文字まで） |
| `table` | `quote`: 1 行目のセルの文字を `\|` でつないだもの（30 文字まで） |
| ほか（段落・見出し・リスト・引用・コールアウト・トグル・区切り線） | `quote`: ブロックの先頭の文字（30 文字まで。トグルは見出しの文字）。文字の無い区切り線は書かない |

```yaml
anchor:
  type: block
  block: database
  database: 01M3Y1ABCDEFGHJKMNPQRSTVWX
  section: "関連タスク"
```

## 3. 返信・解決

- 返信はファイルの末尾に `### ai:<エージェント名> · <日時>` の見出しで追記する（例: `### ai:claude-code · 2026-10-19T10:00+09:00`）。本文は Markdown で、ページへのリンクは `[タイトル](markus:<ulid>)`。
- 人のコメント（見出しが `ai:` で始まらないもの）は編集・削除しない。
- 解決してよいか分からないときは `status` を変えない。解決するときは `status: resolved` と `resolved_by: ai:<エージェント名>` を書く。ファイルは消さない。

## 4. 本文を書き換えたとき

- 本文の文を書き換えて、コメントの対象の文が変わったときは、`anchor.quote`（と `prefix`・`suffix`）も新しい文に合わせる。`original_quote` は変えない。
- ブロックの先頭（上の表の `quote`）を書き換えたときは、そのブロックへのコメントの `quote` も新しい先頭に合わせる。先頭で探すので、合わせないと対象が見つからなくなる。

## 5. 新しいスレッド

- スレッドの ulid を今の時刻から生成し、ファイル名（`.markus/comments/<ページの ulid>/<スレッドの ulid>.md`）と `ulid` にする。
- 上の 1 の形で、`page`・`status: open`・`created_by: ai:<エージェント名>` と、対象に合わせて `original_quote`・`anchor`（上の 2）を書く。その下に、最初のコメントを `### ai:<エージェント名> · <日時>` の見出しで書く。
