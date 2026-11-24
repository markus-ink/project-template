# Writing Files

Markus rewrites this file (Markus rules). Do not change it. To add rules, write them under "Project rules" in AGENTS.md.

These are the rules for storing, moving, renaming, describing, and deleting files in Files (the "Files" screen in Markus).

## 1. Records

- The content of a stored file is in Markus. The repository only has one record per file, `files/<folder>/<file name>.yml`. Don't put anything other than `.yml` in `files/` (an image or PDF placed there doesn't show up in Markus).
- The name of the record is the file name, including its extension, plus `.yml` (`Logo.svg` becomes `Logo.svg.yml`).

```yaml
ulid: 01JC1A2B3C4D5E6F7G8H9J0K1M
url: https://media.markus.ink/p/prj_abcdefghij/3f9c2e7a1b8d4f60a5c3e9d27b1f8a46/file.pdf
size: 497664
created_by: ai:sarah
note: Signed on 2026-11-05. Valid for two years
```

| Key | Content |
|---|---|
| `ulid` | The ID of this record. Don't change it |
| `url` | The URL of the content. Only URLs uploaded to Markus (a URL on another site doesn't show up in Markus). Don't change it |
| `size` | Size in bytes. Don't change it |
| `created_by` | Who stored it |
| `note` | Description (what the file is and when to use it). Optional. People can find the file by it, too |

## 2. Storing and changing

- **Store**: `node .markus/media.mjs upload --to files/<folder> <file>…`. It uploads the content to Markus, writes the record, and prints the URL, a tab, and the record's path on one line per file. The folder is created if it doesn't exist. If nobody told you where to put it, choose one of the existing folders (directories under `files/`). To add a description, add one `note:` line to the record it printed.
- **Move or rename**: move the record's `.yml` (with `git mv` in a clone). Don't change its content. Keep the extension when you rename.
- **Change the description**: change only `note`. Write several lines with `note: |`.
- **Delete**: delete the record, only when asked. Pages that use the file keep showing it (the content isn't deleted).
- **Folders**: a folder exists when there is a record in it. To keep an empty folder, put an empty `_folder.yml` in it. Folders are listed by name (the order can't be changed). To rename a folder, rename the directory.
- Names can't contain `/ \ : * ? " < > |` and must not start with `.` or `_`. In one folder, don't use names that differ only in upper and lower case.

## 3. Putting a file on a page

- Write the record's `url` on the page as described in `pages.md` (image, video, audio, PDF, or file). Don't upload the same file again.
- Use the `url` for links to a stored file, too (the record's path and `markus:` links don't work).
