# Writing comments

Markus rewrites this file (Markus rules). Do not change it. To add rules, write them under "Project rules" in AGENTS.md.

These are the rules for replying to comments, resolving them, starting new threads, and for when you change body text that a comment points to.

## 1. Files

- Comments are in `.markus/comments/<page's ulid>/<thread's ulid>.md` (comments on database rows too). One file is one thread.

```markdown
---
ulid: 01JC1A2B3C4D5E6F7G8H9J0K1M
page: 01JB8Z6Q3K4M5N6P7R8S9T0V1W
status: open
created_by: sam
original_quote: "The reset URL expires after 24 hours"
anchor:
  type: text
  quote: "The reset URL expires after 24 hours"
  prefix: "In the email, "
  suffix: "."
  section: "Rules"
---

### sam · 2026-11-02T10:15-05:00
Is 24 hours the right expiry?

### ai:alex · 2026-11-02T11:03-05:00
The implementation (`src/auth/reset.ts`) uses 1 hour. Should I change the spec to 1 hour?
```

| Key | Meaning |
|---|---|
| `ulid` | The thread's fixed ID (same as the file name) |
| `page` | The `ulid` of the page (or database row) it is on |
| `status` | `open` (unresolved) or `resolved` |
| `created_by`, `resolved_by` | Who started it and who resolved it. People are `handle`s; an AI is `ai:<person>` (`ai:alex`; `<person>` is the content of `.git/markus-user`, or `git config user.name` if it doesn't exist). `resolved_by` only when resolved |
| `original_quote` | The text the comment pointed to when it was posted. Never change it afterwards |
| `anchor` | Clues to find the target in the current body (table below) |

- Each comment is a `### <author> · <datetime>` heading with its body (Markdown) below. A heading ending with ` · edited <datetime>` (or ` · 編集 <datetime>`, written by someone using Markus in Japanese) is a comment its author edited.

## 2. Writing the target

| Target | `original_quote` | `anchor` |
|---|---|---|
| The whole page | Don't write it | Don't write it |
| Part of the body | The selected text | `type: text`, `quote` (the target text), `prefix`, `suffix` (the text right before and right after; up to 30 characters), `section` (the nearest heading containing the target) |
| A whole block | Don't write it | `type: block`, `block` (the kind), the clue below, `section` |

- `quote`, `prefix`, and `suffix` must be text that appears in the page body exactly, character for character. Write the text as it appears on screen, without Markdown markup (`**`, `[...](...)`, etc.). `prefix` and `suffix` contain only text within the same block as the target (paragraph, heading, list item, table cell, etc.); omit them at the start or end of the block.

Clues for comments on a whole block:

| `block` | Clue |
|---|---|
| `database` (embedded database) | `database: <database's ulid>` (the `ulid` in `_database.yml`) |
| `sheet` (embedded sheet) | `sheet: <sheet's ulid>` |
| `image`, `video`, `pdf` | `src: <file URL>` (YouTube videos are `video`, with the `<iframe>`'s `src`) |
| `bookmark` | `src: <link URL>` (the `<bookmark>`'s `href`) |
| `html`, `mermaid`, `code` | `quote`: the start of the content (up to 30 characters) |
| `table` | `quote`: the first row's cell texts joined with `\|` (up to 30 characters) |
| Others (paragraph, heading, list, quote, callout, toggle, divider) | `quote`: the text at the start of the block (up to 30 characters; for toggles, the summary text). Don't write it for a divider, which has no text |

```yaml
anchor:
  type: block
  block: database
  database: 01M3Y1ABCDEFGHJKMNPQRSTVWX
  section: "Related tasks"
```

## 3. Replying and resolving

- Add a reply at the end of the file under a `### ai:<person> · <datetime>` heading (for example, `### ai:alex · 2026-10-19T10:00-05:00`). The body is Markdown; link to pages with `[Title](markus:<ulid>)`.
- Don't edit or delete people's comments (those whose heading doesn't start with `ai:`).
- If you aren't sure whether it's OK to resolve, don't change `status`. To resolve, write `status: resolved` and `resolved_by: ai:<person>`. Don't delete the file.

## 4. When you change the body

- When you change body text and the text a comment points to changes, update `anchor.quote` (and `prefix` and `suffix`) to the new text. Don't change `original_quote`.
- When you change the start of a block (the `quote` in the table above), update the `quote` of comments on that block to the new start too. The target is found by its start, so if you don't, it can no longer be found.

## 5. New threads

- Create the thread's ulid with `node .markus/fmt.mjs --ulid`, and use it for the file name (`.markus/comments/<page's ulid>/<thread's ulid>.md`) and `ulid`.
- In the shape of 1 above, write `page`, `status: open`, `created_by: ai:<person>`, and, depending on the target, `original_quote` and `anchor` (2 above). Below that, write the first comment under a `### ai:<person> · <datetime>` heading. When you finish, pass the file to the formatter (`pages.md`).
