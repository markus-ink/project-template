# AGENTS.md

<!-- markus:begin v43 -->
<!-- Markus rewrites everything between these markers (Markus rules). Do not change it. To add rules, write them under "Project rules" below. -->

This repository is a spec repository managed by **Markus**. People edit it from the Markus web UI, and AI agents edit this repository directly and push. Because it is edited from both sides at the same time, follow the rules below. If they conflict with "Project rules" below, these rules take precedence.

## 1. Before you start

- The Markus web may be syncing with this clone ("Sync with local folder" in the web settings). While it syncs, what people write on the web is written to the files in this clone right away, and what you change shows up on the web. You can tell whether it is syncing with `find .git/markus-sync -mmin -2` (if it prints anything, it is syncing).
- First, run `node .markus/sync.mjs` to get up to date. It checks whether the web is syncing and picks the right way (if not syncing, `git pull --rebase --autostash`; if syncing, `git fetch` → `git reset @{u}`). It writes to `.git` and uses the network, so if you run in a sandbox, run it outside the sandbox from the start.
  - While syncing, if you only read file contents, you don't need to update (the contents are already up to date). Update before you look at history (`git log`, `git show`, `git blame`, etc.) and before you change anything (while syncing, the git history lags behind what the web has saved).
  - While syncing, don't run `git pull` yourself (it stops if a page was newly created on the web).
  - Exit code 2 means the web is syncing and there are commits that have not been pushed. Don't run `git reset @{u}` (those commits would be lost). Ask a person.
  - Exit code 1 means: fix what the message says. Don't change any files until it is fixed. If you can't fix it, tell a person.
- While syncing:
  - Uncommitted changes that remain after updating are what someone is writing on the web. Don't discard, revert, or stash them (`git reset --hard`, `git checkout .`, `git clean`, or `git stash` also wipes out the web draft). You don't need to report them to anyone.
  - When you commit, `git add` only the files you changed (don't mix in the web draft with `git add -A`).

## 2. Always read before writing

Before you create or change a file, always read the file below. If you write without reading it, you will produce files that the Markus web can't open or displays incorrectly.

| What you write | Read first |
|---|---|
| Pages (`.md` in `docs/`), side pages (`sidepages/`), and the body of database rows | `.markus/agents/pages.md` |
| Row properties, `_database.yml`, and databases embedded in pages | `.markus/agents/databases.md` |
| Sheet CSVs, `_sheet.yml`, and sheets embedded in pages | `.markus/agents/sheets.md` |
| Replying to, resolving, or starting comment threads; changing body text that a comment points to | `.markus/agents/comments.md` |

- When you finish writing, pass the files you changed (`.md`, `_database.yml`, `_sheet.yml`) to `node .markus/fmt.mjs <file>…` and fix what it reports (`pages.md`). It adds a `ulid` if there is none.
- When you write yourself (an AI) as the author of a comment or a database row, write `ai:<person>`. `<person>` is the content of `.git/markus-user` (or `git config user.name` if it doesn't exist). Don't write which AI you are.
- Don't change `.markus/config.yml` or `.markus/members.yml` unless asked.

## 3. How to read the repository

| Location | Contents |
|---|---|
| `docs/` | Pages (`.md`). Folders are directories. The title is `title` in the frontmatter |
| `sidepages/` | Side pages (pages inside a page; not shown in the sidebar). The parent is the page that has a ` ```markus-page ` block with `ulid: <side page's ulid>` |
| `databases/` | Databases. Each folder with a `_database.yml` is one database, and each `.md` inside it is one row. Row properties are in the frontmatter |
| `sheets/` | Sheets (spreadsheets). Each folder with a `_sheet.yml` is one sheet, with one CSV per tab |
| `.markus/templates/` | Templates. One file is one template; the file name is its name, and the content is only the body to insert (no frontmatter). People insert them anywhere in a page or row with "/template". When you write a page or row and a template fits, write it in that shape |
| `.markus/comments/` | Comments. `<page's ulid>/<thread's ulid>.md` is one thread; open threads have `status: open` |
| `.markus/members.yml` | Members' `handle`s and names (person values in databases are `handle`s) |

- When you read a page, side page or database row, also read all of its comments (the files in `.markus/comments/<its ulid>/`, resolved threads included; if the folder doesn't exist, it has no comments). They may disagree with the body, point out what isn't decided yet, or explain why something was decided.
- Internal links are `[Title](markus:<ulid>)`. Find the target with `grep -rl "ulid: <ulid>" docs/ databases/ sheets/ sidepages/` (for a database or sheet, you will find its `_database.yml` or `_sheet.yml`). Find a side page's parent with the same grep (the files it prints, minus the side page itself, are the parent).
  - A link to a sheet tab is `[Sheet name / Tab name](markus:<ulid of _sheet.yml>#<tab name>)`. In the tab name, percent-encode (`%XX`) only spaces and `(` `)` `<` `>` `[` `]` `%` `#` `\`, and write every other character as is, including non-ASCII ones (`Top 5 (beta)` → `Top%205%20%28beta%29`).
- Images, videos, and PDFs are stored at `https://media.markus.ink/...` URLs. Only project members can view them, so `curl` can't fetch them. Save them to a temporary directory with `node .markus/media.mjs <URL>…` and read the paths it prints (don't commit the fetched files).
  - The first time, or when the link has expired, it prints a URL to open and a code, and stops (exit code 2). Pass that text to a person as is, and when they say they've approved it, run the same command again. Don't open a browser and approve it yourself.
  - Don't use this script for URLs on other sites (fetch them with `curl` or similar).
  - An image with `data-figma` is a Figma frame (a Figma block). The image is enough to see what the screen looks like. Only when you need exact values (spacing, colors, text styles, components, etc.), also fetch the `data-figma` URL with the same script. `spec.json` in the zip is the layer tree (coordinates are from the frame's top-left; it is large, so search for the layers you need), and `assets/` has the original icon and image files.
  - For videos, look at the `poster` image, and if needed, extract frames with `ffmpeg`. For YouTube videos (`<iframe>`) and bookmarks (`<bookmark>`), read the `title` to see what they are.
- To put an image, video, or PDF on a page, upload it to Markus with `node .markus/media.mjs upload <file>…` and write the URL it prints (one line per file) on the page (see `pages.md` for how. Don't add the file to the repository). Only devices of people with the Editor role or higher in this project can upload. If it prints a linking code, pass it to a person, the same as when fetching.
- Commits saved from the Markus web have the Markus App (a bot) as the author. Check who actually made the change with the `Markus-User:` trailer in the commit message (the same applies to lines that `git blame` attributes to the bot).

### When someone gives you a location

| What you're given | How to read it |
|---|---|
| `docs/Features/Login.md`, `docs/Features/` | A path from the top of the repository (a trailing `/` means a folder) |
| `docs/Features/Login.md:42-48` | Lines 42–48 of that file. Count from line 1, including the frontmatter |
| `sheets/Budget/Monthly.csv B2:D7` | Rows 2–7, columns B–D of that CSV |
| A Markus web URL (`https://…/p/<project>/…`) | Don't open it (it requires login). Find the file by the ulid in the URL as above (`?row=<ulid>` is a database row). In `…/-/<path>`, what follows `-/` is the path |

- If the lines you were given don't match what the person is talking about, the clone is out of date. Update it as described in 1.

### When you tell someone a location

- If the web is syncing, the `url:` line in `.git/markus-sync` is the project's web URL (`<url>`). Use the file's ulid to link to the URLs below.
  - A page or database row is `<url>/<ulid>`, a database is `<url>/db/<ulid of _database.yml>`, a sheet is `<url>/sheet/<ulid of _sheet.yml>`, and a comment is `<url>/<page's ulid>?thread=<thread's ulid>`.
  - A place inside a page is `<url>/<page's ulid>?block=<text at the start of the block>`. Use up to 30 characters, URL-encoded. Write the text as it appears on the web (no `## `, `- `, `**`, or other markup). If an earlier block starts with the same text, add `&n=<which one>`.
- If there is no `url:` line, the web isn't syncing, or there is no ulid yet, write the path from the top of the repository (`docs/Features/Login.md`). Don't share paths on your machine like `/Users/…`, because others can't open them.

## 4. Commit and push

- Don't commit or push unless asked (people want to check your changes on the web before saving). When you finish, if the web is syncing, say "Please review it on the web and save"; if not, ask whether you may push.
- When you push, update again as described in 1, then commit and push right away (if syncing, `git add` only the files you changed). If the web is syncing and the push is rejected, start over from `git fetch` → `git reset @{u}` (your commit is lost, but its changes stay in the files; `.markus/sync.mjs` stops when there are unpushed commits, so type these commands yourself only here).

<!-- markus:end -->

## Project rules
