# Writing formulas

Markus rewrites this file (Markus rules). Do not change it. To add rules, write them under "Project rules" in AGENTS.md.

These are the rules for showing a value calculated from the repository's files (a count of database rows, a sum from a sheet, and so on) inside the text of a page. The same functions also read databases and sheets inside an HTML block (3).

## 1. How to write one

Write a reference (`<formula ref>`) in the text, and write the code in a block (` ```markus-formula `) on the same page.

````markdown
There are <formula ref="open-tasks"></formula> open tasks.

```markus-formula id="open-tasks"
const rows = await readRows("Tasks");
return rows.filter((t) => t.Status !== "Done").length;
```
````

- Write `<formula ref="…"></formula>` inside text (a paragraph, heading, list item, or table cell). It can also go inside formatting such as `**`.
- **Don't write the calculated value.** Leave `<formula>` empty. The web calculates the value every time the page is opened. A number you write there is not read, and goes stale when the data changes.
- Write ` ```markus-formula id="…" ` right below the paragraph, list, or table that uses it. Don't write it inside a list item, callout, or toggle (write it after them). The web doesn't show this block (clicking the value in the text opens the code).
- `id` is a name that is unique on the page. Use lowercase letters, digits, and hyphens, and make it say what the value is (`open-tasks`). Formulas created on the web get names like `f-3k9x`. Leave them as they are.
- To show the same value in several places, write the same `ref` (with one formula block).
- When a formula is no longer used, delete both the `<formula>` and its block.

## 2. The code

- Write JavaScript. It runs as the body of an `async` function, so you can use `await` and `return` at the top level. **Return the value with `return`.**
- The returned value is shown as text (numbers and strings as they are; arrays joined with `, `). Add thousands separators and units in the code (`n.toLocaleString()`, `Math.round(x * 100) + "%"`).
- A formula can only read files in this repository. It can't write files, use the network (`fetch`), `import`, or touch the screen. It is stopped after 5 seconds.
- **Every function below except `today()` needs `await`** (using the result without it is an error).

| Function | Returns |
|---|---|
| `glob(pattern)` | Paths of the files that match the pattern. `*` matches within one path segment, `**` any number of folders, `?` one character, `{a,b}` either |
| `readFile(path)` | The file's text. Paths start at the top of the repository. An error if there is no such file |
| `fileExists(path)` | Whether the file exists (`true` or `false`) |
| `readFrontmatter(path)` | The frontmatter of a page or database row (an object) |
| `readFrontmatters(pattern)` | The frontmatter of every matching `.md`. Each has `_path` (the path) and `_title` (the title) |
| `readBody(path)` | The body of a page or database row (after the frontmatter) |
| `readRows(database)` | The rows of a database, in creation order. Each is the frontmatter object, with `_path` and `_title` |
| `readDatabase(database)` | The database's name and properties (`{ name, folder, properties: { Status: { type, options } } }`) |
| `listDatabases()` | The names of all databases |
| `readSheet(sheet, tab?)` | The values of a sheet tab (rows × columns). Formula cells give the calculated value. Without a tab, the first tab |
| `readTable(sheet, tab?)` | Rows as objects keyed by the first row (`[{ Month: "Jan", Amount: 100 }, …]`) |
| `readCell(sheet, "B2")` | The value of one cell. Another tab is `"Monthly!B2"` |
| `readRange(sheet, "A1:C5")` | The values of a range (rows × columns). `"Monthly!B2:B"` is everything from B2 down; `"B:B"` is the whole column |
| `listSheets()` | The names of all sheets |
| `listTabs(sheet)` | The tab names of a sheet |
| `readCsv(path)` | A CSV file as rows × columns of text (formulas are not calculated) |
| `readMembers()` | The members (`[{ handle, name }]`) |
| `parseFrontmatter(text)` | Reads frontmatter from text |
| `parseCsv(text)` | Parses CSV text into rows × columns of text |
| `parseYaml(text)` | Parses YAML text into a value |
| `today()` | Today's date (in the form `"2026-11-08"`). No `await` needed |
| `page` | The page this formula is on. `page.path` is its path (not a function) |

- Write database and sheet names as their folder names (`"Tasks"` for `databases/Tasks/`, `"Budget"` for `sheets/Budget/`).
- In a row from `readRows`, each property name is a key (`t.Status`; for names with symbols or spaces, `t["Estimate (h)"]`). A property with no value is `undefined`. A person value is a `handle` (look up the name with `readMembers()`).
- Dates are text such as `"2026-11-08"`. You can compare them as text, as in `t.Due < today()`.
- `glob` picks up folders and files that start with "." (such as `.markus/`) only when the pattern segment also starts with ".".
- Don't give a variable the same name as a function (`const readRows = …` doesn't work). Names like `rows`, `sheet`, and `cell` are fine.

### Examples

```js
// Count database rows
const rows = await readRows("Tasks");
return rows.filter((t) => t.Status !== "Done").length;
```

```js
// Open tasks past their due date
const rows = await readRows("Tasks");
return rows.filter((t) => t.Status !== "Done" && t.Due && t.Due < today()).length;
```

```js
// Add up a sheet column
const months = await readTable("Budget", "Monthly");
return months.reduce((sum, m) => sum + (Number(m.Amount) || 0), 0).toLocaleString();
```

```js
// Read files directly
const files = await glob("docs/**/*.md");
return files.length;
```

## 3. Using them in an HTML block

The functions in 2 also work as they are in a script inside ` ```html `. You can draw charts and tables from database and sheet values. With `<script type="module">`, you can use `await` at the top level.

````markdown
```html height="200"
<!DOCTYPE html>
<html lang="en">
<body>
<div id="out"></div>
<script type="module">
const rows = await readRows("Tasks");
const done = rows.filter((t) => t.Status === "Done").length;
document.getElementById("out").textContent = `${done} of ${rows.length} done`;
</script>
</body>
</html>
```
````

- The web redraws an HTML block that uses these functions when a file it read changes.
- Unlike a formula, an HTML block can load outside scripts (from a CDN). A loaded script can also see the files the block reads. Load only scripts you trust.
- The other rules for writing HTML are in `pages.md`.

## 4. Checking

- After writing, calculate with `node .markus/formula.mjs <page>…`. It prints `id = value` for each formula. If a formula fails or a `ref` has no block, it prints the reason and exits with 1, so fix it.
- To try code before writing it on a page, use `node .markus/formula.mjs -e '<code>'`. `node .markus/formula.mjs --functions` lists the functions.
- When someone asks "what is it now?", calculate it this way too (the value is not written on the page).
- Then run `node .markus/fmt.mjs <page>` as for any other page (`pages.md`).
