# Writing sheets

Markus rewrites this file (Markus rules). Do not change it. To add rules, write them under "Project rules" in AGENTS.md.

These are the rules for creating or changing sheet (spreadsheet) CSVs, `_sheet.yml`, and sheets embedded in pages.

## 1. Sheets and CSVs

- Sheets are under `sheets/`. Each folder with a `_sheet.yml` is one sheet, with one CSV per tab (`sheets/Budget/Monthly.csv`). The file name is the tab name + `.csv`.
- Don't write the `ulid` of a new sheet's `_sheet.yml`; formatting adds it (`pages.md`). Don't write one by hand by imitating another example's `ulid`.
- **Write values in the CSV.** Don't write appearance in the CSV (that goes in `_sheet.yml`).

```csv
Month,Engineering,Design,Infrastructure,Total
Jul,18000,6000,1200,=SUM(B2:D2)
Total,=SUM(B2:B7),=SUM(C2:C7),=SUM(D2:D7),=SUM(E2:E7)
```

- A normal CSV from the first row. Wrap in `"` only cells that contain commas, quotes, line breaks, or leading/trailing spaces (also wrap formulas that contain commas, like `"=ROUND(B2,0)"`).
- Give every row the same number of columns, and don't write empty rows at the end or empty columns on the right.
- Numbers are `1800000`, dates are `2026-10-23` (with a time, `2026-10-23 09:30`), and booleans are `TRUE` / `FALSE`.
- Write formulas starting with `=`, like `=SUM(B2:B7)` (don't write the computed value). Refer to other tabs as `Monthly!B8`.
- For merged cells (`merges`), write the value only in the top-left cell and leave the rest empty.

## 2. Appearance (`_sheet.yml`)

```yaml
ulid: 01M5KG5J7B37NMAAHZVDN1EZ6B   # The sheet's fixed ID. Don't write it for a new sheet (formatting adds it)
name: Budget                        # The sheet's name (the folder name is made from it too)
tabs:                               # The order of the tabs
  - name: Monthly
    freeze: { rows: 1, cols: 1 }    # Number of frozen rows and columns
    widths: { A: 80, B: 110 }       # Column widths (px)
    merges: [ A14:B14 ]             # Merged cells
    styles:                         # Appearance. Later entries win
      - { range: A1:E1, bold: true, bg: gray-1, align: center }
      - { range: B2:E8, format: "#,##0" }
    charts:                         # Charts (3 below)
      - { type: bar, range: A1:D7, title: Monthly costs, at: G2, width: 480, height: 300 }
  - name: Summary
```

| `styles` key | Meaning |
|---|---|
| `range` | The range (`A1:C3`, `B2`; a whole column is `B:B`, a whole row is `2:2`) |
| `bold` `italic` `underline` `strike` `wrap` | Write only when `true` |
| `color` | Text color. One of `gray` `brown` `orange` `yellow` `green` `blue` `purple` `pink` `red` (the same color names as in the body). If omitted, the default text color |
| `bg` | Background color. A color name with a level (`green-1` light to `green-4` strong). The level means "how much it stands out" in both light and dark mode; when shading shows quantity, raise the level. Don't write hex (`#rrggbb`) (it is read, but snapped to a nearby color) |
| `align` | `left` `center` `right` |
| `valign` | `top` `middle` (bottom if omitted) |
| `size` | Font size (pt) |
| `format` | Number format (`#,##0`, `0.0%`, `m/d/yyyy`, etc.; the same syntax as spreadsheets). Omit it to show dates as `yyyy-mm-dd` |

- **When you add or remove rows or columns in the middle of a CSV, shift the ranges in `_sheet.yml` (`merges`, `styles`, `charts`) by the same amount.** Otherwise colors and merges end up on other cells. Add rows at the end when you can.
- To add a tab, place a CSV and add `- name: <the CSV file name without .csv>` to `tabs` (if you don't, it becomes a later tab in name order).
- Don't write row heights. Don't delete keys you don't know.

## 3. Charts

- Charts float over the table (as in spreadsheets). If you gather charts on the first tab ("Charts") and put the numbers on the next tab, the page block shows the charts first.
- Write `{ type: bar, range: A1:D7, title: Name, at: G2, width: 480, height: 300 }` in `charts`.

| Key | Meaning |
|---|---|
| `type` | `bar`, `line`, `pie` |
| `range` | The range. The first row is the series names, the first column is the category names. Refer to other tabs as `Monthly!A1:D7` |
| `title` | The chart title |
| `at` | The cell at the chart's top-left (if omitted, placed to the right of the table) |
| `width`, `height` | Size (px) |
| `transpose` | `true` swaps rows and columns |
| `hide` | A list of series names not to show (`[Infrastructure]`) |
| `stacked` | `true` stacks the bars |
| `x_title`, `y_title` | Axis titles |
| `y_min`, `y_max` | The vertical axis range |
| `legend` | Legend position: `bottom` or `none` (hidden). Top if omitted |

## 4. Embeds

- To show a sheet inside a page, place a ` ```markus-sheet ` block. Charts placed within the range are shown on top too.

```markus-sheet
sheet: Budget
tab: Monthly
range: A1:E8
```

| Key | Meaning |
|---|---|
| `sheet` | The sheet's folder name (required) |
| `tab` | The tab to show first (the first tab if omitted) |
| `range` | The range to show on the `tab:` tab (if omitted, from the top-left to the last cell with content, with at least 12 columns; either way, up to 100 rows and 26 columns) |
