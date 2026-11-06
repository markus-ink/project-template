# データベースを書く

このファイルは Markus が書き換えます（Markus の規約）。変えないでください。決まりを足すときは、AGENTS.md の「このプロジェクトの決まり」に書いてください。

DB の行・`_database.yml`・ページの中の DB の埋め込みを作る・書き換えるときの決まりです。行の本文は、ページと同じく `pages.md` の記法で書く。

## 1. DB と行

- データベースは `databases/` の下にある。`_database.yml` があるフォルダが 1 つの DB で、中の `.md` が 1 行ずつ（行 = ページ）。
- 新しい DB・行の `ulid` は書かずに整形すれば付く（`pages.md`。サイドバーは `ulid` の順、つまり作った順に並ぶ）。ほかの例の `ulid` を真似て手で書かない。
- 行のファイル名・`ulid` の振り方は、ページと同じ（`pages.md`）。
- `rank` はボードや手動の並び替えでの並び順。新しい行では省略してよい。

## 2. `_database.yml`

```yaml
ulid: 01JB9DB0...                 # データベースの固定 ID。今の時刻から生成する
name: タスク                       # DB の名前（フォルダ名もこれから作る）
key_prefix: TSK                   # ID のある DB だけ。行に連番の key（TSK-12）を振る。"" なら番号だけ（12）
properties:                       # 並びが表の列の順になる
  ステータス:
    type: status
    options:
      - { name: 未着手,   color: gray }
      - { name: 進行中,   color: blue }
      - { name: 完了,     color: green }
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
| `status` | `ステータス: 進行中` | select と同じだが、空にできない。新しい行には `default` が入る |
| `date` | `期限: 2026-11-08` | 期間は 2 つの date で表す |
| `person` | `担当者: tanaka`・`[tanaka, suzuki]` | `.markus/members.yml` の `handle` |
| `checkbox` | `承認: true` | |
| `url` | `Figma: https://...` | |
| `files` | `[{ name: 仕様書.pdf, url: https://media.markus.ink/... }]` | ファイルは Markus の Web でアップロードする |
| `relation` | `先行タスク: [01M1C8S2..., 01M1EDEA...]` | 同じ DB の行の `ulid` の並び。`reverse_of: 先行タスク` を付けたプロパティは逆向きで、値は書かない |
| `created_time` | 書かない | 作成日時。行の `ulid` の時刻が出る |
| `created_by` | 書かない | 作成者。行の `created_by` が出る。プロパティの名前で値を書かない |

- 名前の列（`title`）はプロパティに書かない。
- 選択肢は `{ name: …, color: … }`。色の名前は `pages.md` と同じ（`gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red`）。
- プロパティに `ulid`・`id`・`title`・`key`・`rank` の名前は付けない（予約されている）。
- 知らないキーは消さない。

## 3. プロパティ（行の frontmatter）

- 行のプロパティは frontmatter に書く。型と選択肢は `_database.yml` の `properties` に従う。
- どの DB の行にも、作った人の `created_by` がある。新しい行は書かなくても整形ツールが `ai:<人>`（AGENTS.md）を付ける。前からある行の値は書き足さない・変えない。

```yaml
---
ulid: 01M48B22602GPH7G5Q4D8DJ83J
title: ログイン API を実装する
key: TSK-3                    # 整形ツールが付ける（書かない）
created_by: ai:tanaka         # 整形ツールが付ける（書かない）
ステータス: 進行中
担当者: tanaka
優先度: 高
ラベル: [認証, API]
期限: 2026-11-10
---
```

- プロパティと選択肢は、`_database.yml` にある名前（`ステータス: 進行中`）をそのまま書く。画面にも同じ名前が出る。英語のキーに直したり、別の言い方にしたりしない。
- 名前を変えるときは、Markus の Web で変える（行・テンプレート・ビュー・その DB を表示しているページのブロックも一緒に書き換わる）。手で変えるなら、それらをすべて同じコミットで書き換える。
- 値の書き方は、上の 2 の型の表のとおり。人を指す値は `.markus/members.yml` の `handle` を使う（メールアドレスは書かない）。
- `key_prefix` がある DB では、新しい行に `key` を書かない。整形ツールが次の番号を付け、同じフォルダの `_counter.yml`（`next: 8`）を増やす。番号を自分で決めない・`_counter.yml` を手で書き換えない。
  - 書き換わった `_counter.yml` も、行と同じコミットに入れる。
  - `git pull` で `_counter.yml` がぶつかったら、ほかの人の `_counter.yml` を取り、自分が作った行の `key` の行を消して、整形をかけ直す。
  - Web と同期している間は、`_counter.yml` が元に戻る。それでよい（Web で保存するときに、新しい行の番号は振り直される）。
  - 整形ツールが `key` の重複を出したら、後から作った行の `key` の行を消して、整形をかけ直す。
  - ID を足す・`key_prefix` を変えるのは Web でする（全部の行の `key` が一緒に変わるため）。

## 4. ビューと埋め込み

- DB は Markus の Web のサイドバーに出る。ページの中に表示するときは ` ```markus-db ` ブロックを置く。

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
