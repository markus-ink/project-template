# Writing databases

Markus rewrites this file (Markus rules). Do not change it. To add rules, write them under "Project rules" in AGENTS.md.

These are the rules for creating or changing database rows, `_database.yml`, and databases embedded in pages. Write a row's body with the same syntax as pages, described in `pages.md`.

## 1. Databases and rows

- Databases are under `databases/`. Each folder with a `_database.yml` is one database, and each `.md` inside it is one row (row = page).
- Don't write the `ulid` of a new database or row; formatting adds it (`pages.md`; the sidebar is sorted by `ulid`, that is, in creation order). Don't write one by hand by imitating another example's `ulid`.
- Row file names and `ulid`s work the same way as pages (`pages.md`).
- A database created on the Markus web may have a folder name like `Untitled database` or `Untitled database 2` (`無題のデータベース` in Japanese) until it's saved on the web, even though it has a name. This is normal: don't rename the folder, write to it as it is (the `database:` of database blocks on pages also points to that folder name), and don't point it out to the person. Markus renames the folder to match the name, and rewrites the blocks, when that database is saved.
- `rank` is the order on boards and in manual sorting. You may omit it for new rows.

## 2. `_database.yml`

```yaml
ulid: 01JB9DB0...                 # The database's fixed ID. Generated from the current time
name: Tasks                       # The database's name (the folder name is made from it too)
key_prefix: TSK                   # Only for databases with IDs. Gives rows a serial key (TSK-12). "" means number only (12)
properties:                       # Their order is the order of the table columns
  Status:
    type: status
    options:
      - { name: Not started, color: gray }
      - { name: In progress, color: blue }
      - { name: Done,        color: green }
    default: Not started
  Assignee: { type: person }
  Priority:
    type: select
    options: [High, Medium, Low]  # You can also list names only (the color is gray)
  Labels:   { type: multi_select }
  Due:      { type: date }
  Estimate (h): { type: number }
view:                             # The view of the database page (the full page opened from the sidebar). A table if omitted
  type: board
  group_by: Status
```

| Type | How to write it in a row's frontmatter | Notes |
|---|---|---|
| `text` | `Notes: some text` | |
| `number` | `Estimate (h): 3` | |
| `select` | `Priority: High` | Options are defined in `options` |
| `multi_select` | `Labels: [UI, Auth]` | Defining options is optional |
| `status` | `Status: In progress` | Like select, but can't be empty. New rows get the `default` |
| `date` | `Due: 2026-11-08` | Use two dates for a range |
| `person` | `Assignee: alex`, `[alex, sam]` | A `handle` from `.markus/members.yml` |
| `checkbox` | `Approved: true` | |
| `url` | `Figma: https://...` | |
| `files` | `[{ name: spec.pdf, url: https://media.markus.ink/... }]` | Upload files on the Markus web or with `node .markus/media.mjs upload <file>`, and write the URL it prints in `url` |
| `relation` | `Blocked by: [01M1C8S2..., 01M1EDEA...]` | A list of `ulid`s of rows in the same database. A property with `reverse_of: Blocked by` is the reverse direction; don't write its value |
| `created_time` | Don't write it | Created time. Shows the time of the row's `ulid` |
| `created_by` | Don't write it | Created by. Shows the row's `created_by`. Don't write a value under the property's name |

- Don't add the name column (`title`) to the properties.
- Options are `{ name: …, color: … }`. Color names are the same as in `pages.md` (`gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red`).
- Don't name a property `ulid`, `id`, `title`, `key`, or `rank` (they are reserved).
- Don't delete keys you don't know.

## 3. Properties (a row's frontmatter)

- Write a row's properties in the frontmatter. Types and options follow `properties` in `_database.yml`.
- Every database row has `created_by`, the person who created it. For new rows, the formatter adds `ai:<person>` (AGENTS.md) even if you don't write it. Don't add or change the value on existing rows.

```yaml
---
ulid: 01M48B22602GPH7G5Q4D8DJ83J
title: Implement the login API
key: TSK-3                    # Added by the formatter (don't write it)
created_by: ai:alex           # Added by the formatter (don't write it)
Status: In progress
Assignee: alex
Priority: High
Labels: [Auth, API]
Due: 2026-11-10
---
```

- Write property and option names exactly as they are in `_database.yml` (`Status: In progress`), including capitalization and spaces. The web shows the same names. Don't turn them into other keys (such as `status` or `in_progress`) or reword them.
- To rename, do it on the Markus web (rows, templates, views, and blocks on pages that show the database are rewritten together). If you rename by hand, rewrite all of them in the same commit.
- Write values as in the type table in 2 above. For values that refer to people, use the `handle` from `.markus/members.yml` (don't write email addresses).
- In a database with `key_prefix`, don't write `key` on new rows. The formatter assigns the next number and increments `_counter.yml` (`next: 8`) in the same folder. Don't choose numbers yourself or edit `_counter.yml` by hand.
  - Put the updated `_counter.yml` in the same commit as the rows.
  - If `_counter.yml` conflicts on `git pull`, take the other person's `_counter.yml`, delete the `key` line from the rows you created, and run the formatter again.
  - While the web is syncing, `_counter.yml` goes back to its previous content. That's fine (the numbers of new rows are reassigned when saved on the web).
  - If the formatter reports a duplicate `key`, delete the `key` line from the row created later and run the formatter again.
  - Adding IDs or changing `key_prefix` is done on the web (the `key` of every row changes together).

## 4. Views and embeds

- Databases appear in the sidebar of the Markus web. To show one inside a page, place a ` ```markus-db ` block.

```markus-db
database: Tasks
type: board
group_by: Status
filter: { Status: { not: Done } }
sort: [{ Due: asc }]
```

| Key | Meaning |
|---|---|
| `database` | The database's folder name (required; `Tasks` for `databases/Tasks/`) |
| `type` | The kind of view: `table` (default), `board`, `timeline` |
| `group_by` | The property to group by (status or select). For boards, the first status or select if omitted |
| `date_start`, `date_end` | The date properties for the timeline's range (the first and second date properties if omitted) |
| `table_columns` | Columns to show in the timeline's table on the left, besides the name (`[Status, Assignee]`) |
| `bar_properties` | Properties to show on the timeline's bars, besides the name |
| `filter` | Filter (see below) |
| `sort` | Sort (`[{ Due: asc }, { Priority: desc }]`; `[Due]` is ascending) |
| `columns` | Columns to show in the table (all if omitted) |

- `filter` is `{ property: value }` for "is" ("contains" for multi-select and person), and `true` / `false` for checked / unchecked. For conditions, write `{ property: { condition: value } }`, where the condition is `eq`, `not`, `contains`, `not_contains`, `gt`, `lt` (numbers), `before`, `after` (dates), `empty: true`, or `not_empty: true`. When you list several, only rows matching all of them are shown (`{ Status: { not: Done }, Due: { before: 2026-11-01 } }`).
- `type` through `bar_properties` are the view, and look the same to everyone. Changing the view on the web rewrites these lines. `filter` and `sort` are the initial display; filters and sorts a viewer changes on the web stay only in their browser (the file doesn't change).
- Write the view of the database page in `view` in `_database.yml` (separate from block views; it takes the same keys except `database`).
