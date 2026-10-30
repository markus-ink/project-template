# データベースを書く

このファイルは markus が書き換えます（markus の規約）。変えないでください。決まりを足すときは、AGENTS.md の「このプロジェクトの決まり」に書いてください。

DB の行・`_database.yml`・ページの中の DB の埋め込みを作る・書き換えるときの決まりです。行の本文は、ページと同じく `pages.md` の記法で書く。

## 1. DB と行

- データベースは `databases/` の下にある。`_database.yml` があるフォルダが 1 つの DB で、中の `.md` が 1 行ずつ（行 = ページ）。
- 新しい DB を作るときは、`_database.yml` の先頭に `ulid`（ULID）を書く。ULID は今の時刻から生成する（サイドバーは `ulid` の順、つまり作った順に並ぶ）。ほかの例の `ulid` を真似て手で書かない。
- 行のファイル名・`ulid` の振り方は、ページと同じ（`pages.md`）。
- `rank` はボードや手動の並び替えでの並び順。新しい行では省略してよい。
- `_templates/` の中は行テンプレート。行を作るときに使ってよい。

## 2. `_database.yml`

```yaml
ulid: 01JB9DB0...                 # データベースの固定 ID。今の時刻から生成する
name: タスク                       # DB の名前（フォルダ名もこれから作る）
key_prefix: MK                    # 行に連番の key（MK-12）を振るときだけ
properties:                       # 並びが表の列の順になる
  ステータス:
    type: status
    options:
      - { name: 未着手,   color: gray }
      - { name: 進行中,   color: blue }
      - { name: 完了,     color: green, closed: true }
    default: 未着手
  担当者:  { type: person }
  優先度:
    type: select
    options: [高, 中, 低]          # 名前だけの並びも書ける（色はグレー）
  ラベル:  { type: multi_select }
  期限:    { type: date }
  見積(h): { type: number }
view:                             # DB のページ（サイドバーから開くフルページ）のビュー。無ければ表
  type: board
  group_by: ステータス
```

| 型 | 行の frontmatter での書き方 | 備考 |
|---|---|---|
| `text` | `メモ: 文字列` | |
| `number` | `見積(h): 3` | |
| `select` | `優先度: 高` | 選択肢は `options` で決める |
| `multi_select` | `ラベル: [UI, 認証]` | 選択肢の定義は任意 |
| `status` | `ステータス: 進行中` | select と同じで、ボードの列・完了の扱い（`closed`）を持つ |
| `date` | `期限: 2026-11-08` | 期間は 2 つの date で表す |
| `person` | `担当者: tanaka`・`[tanaka, suzuki]` | `.markus/members.yml` の `handle` |
| `checkbox` | `承認: true` | |
| `url` | `Figma: https://...` | |
| `files` | `[{ name: 仕様書.pdf, url: https://media.markus.ink/... }]` | ファイルは markus の Web でアップロードする |
| `relation` | `先行タスク: [01M1C8S2..., 01M1EDEA...]` | 同じ DB の行の `ulid` の並び。`reverse_of: 先行タスク` を付けたプロパティは逆向きで、値は書かない |

- 名前の列（`title`）はプロパティに書かない。
- 選択肢は `{ name: …, color: …, closed: true }`（`closed` は完了の扱い）。色の名前は `pages.md` と同じ（`gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red`）。
- プロパティに `ulid`・`id`・`title`・`key`・`rank` の名前は付けない（予約されている）。
- 知らないキーは消さない。

## 3. プロパティ（行の frontmatter）

- 行のプロパティは frontmatter に書く。型と選択肢は `_database.yml` の `properties` に従う。

```yaml
---
ulid: 01M48B22602GPH7G5Q4D8DJ83J
title: ログイン API を実装する
key: MK-3
ステータス: 進行中
担当者: tanaka
優先度: 高
ラベル: [認証, API]
期限: 2026-11-10
---
```

- プロパティと選択肢は、`_database.yml` にある名前（`ステータス: 進行中`）をそのまま書く。画面にも同じ名前が出る。英語のキーに直したり、別の言い方にしたりしない。
- 名前を変えるときは、markus の Web で変える（行・テンプレート・ビュー・その DB を表示しているページのブロックも一緒に書き換わる）。手で変えるなら、それらをすべて同じコミットで書き換える。
- 値の書き方は、上の 2 の型の表のとおり。人を指す値は `.markus/members.yml` の `handle` を使う（メールアドレスは書かない）。
- `key_prefix` がある DB では、新しい行の `key` を「その DB 内の最大番号 + 1」にする（例: `MK-7`）。

## 4. ビューと埋め込み

- DB は markus の Web のサイドバーに出る。ページの中に表示するときは ` ```markus-db ` ブロックを置く。

```markus-db
database: タスク
type: board
group_by: ステータス
filter: { ステータス: { not: 完了 } }
sort: [{ 期限: asc }]
```

| キー | 内容 |
|---|---|
| `database` | DB のフォルダ名（必須。`databases/タスク/` なら `タスク`） |
| `type` | ビューの種類。`table`（省略時）・`board`・`timeline` |
| `group_by` | グループに使うプロパティ（ステータス・セレクト）。ボードは省略すると最初のステータスかセレクト |
| `date_start`・`date_end` | タイムラインの期間に使う日付のプロパティ（省略すると日付のプロパティの 1 つ目と 2 つ目） |
| `table_columns` | タイムラインの左の表に、名前のほかに出す列（`[ステータス, 担当者]`） |
| `bar_properties` | タイムラインのバーに、名前のほかに出すプロパティ |
| `filter` | 絞り込み（下の書き方） |
| `sort` | 並べ替え（`[{ 期限: asc }, { 優先度: desc }]`。`[期限]` は昇順） |
| `columns` | 表に出す列（省略するとすべて） |

- `filter` は `{ プロパティ: 値 }` で「である」（マルチセレクト・人は「を含む」）、`true` / `false` はチェックあり / なし。条件を付けるときは `{ プロパティ: { 条件: 値 } }` で、条件は `eq`・`not`・`contains`・`not_contains`・`gt`・`lt`（数）・`before`・`after`（日付）・`empty: true`・`not_empty: true`。並べると、すべてに合う行だけを出す（`{ ステータス: { not: 完了 }, 期限: { before: 2026-11-01 } }`）。
- `type`〜`bar_properties` はビューで、全員に同じに見える。Web でビューを変えると、この行が書き換わる。`filter`・`sort` は最初の表示で、見る人が Web で変えた絞り込み・並べ替えはブラウザにだけ残る（ファイルは変わらない）。
- DB のページのビューは `_database.yml` の `view` に書く（ブロックのビューとは別。書ける項目は `database` 以外は同じ）。
