# Sales Dashboard — Deployment Guide

A bound Google Apps Script web app for the **SALE Data Sample** sheet. Reads the active spreadsheet, normalizes everything server-side, and renders an interactive Bootstrap + Google Charts UI.

---

## 1. What's in the data

The sheet has 11 columns: `Transaction_ID, Date, Region, Product_Category, Product_SKU, Quantity, Unit_Price, Discount_Applied, Customer_Rating, Is_Member, Total_Sales`.

- **Regions:** California, New York, Maryland, Virginia, San Diego
- **Categories:** Garden, Electronics, Toys, Clothing, Home
- **Date range:** 2023, with timestamps
- **Is_Member:** Yes / No
- **Customer_Rating:** 1 – 5
- **Discount_Applied:** 0 – 0.20

## 2. Recommended charts (and why)

| # | Chart | Type | Why this chart |
|---|---|---|---|
| 1 | **Monthly Sales Trend** | Area chart | Time-on-X is best read as a continuous trend. An area chart emphasizes cumulative volume over months. |
| 2 | **Sales by Region** | Donut (Pie) | Five regions = small categorical set, where part-to-whole comparison is more useful than absolute values. |
| 3 | **Sales by Category** | Horizontal bar | Category names are long-ish; horizontal bars keep labels readable and rank top→bottom is obvious. |
| 4 | **Avg Customer Rating by Category** | Column | Ratings are bounded (0–5), so a column chart with a fixed Y-axis makes small differences visible. |
| 5 | **Region × Category** | Stacked column | Two categorical dimensions + one measure → a stacked column shows per-region totals AND category mix in one view. |
| 6 | **Member vs Non-Member** | Donut | A simple two-slice comparison answers "is loyalty driving revenue?" at a glance. |
| 7 | **KPI cards** | Tiles | Total Sales, Transactions, Units, AOV, Avg Rating — leadership-style headline numbers. |
| 8 | **Transactions table** | Sortable table | Drill-down for the user who wants to verify any chart's underlying rows. |

Filters (Region / Category / Membership / Date-range) re-aggregate every chart in real time on the client.

---

## 3. The four files

```
Code.gs            — server (data read + normalize + payload)
Index.html         — page skeleton (templated with <?!= include() ?>)
JavaScript.html    — client logic + Google Charts
css.html           — styles
```

**Server-side `include()`** — defined in `Code.gs`, used in `Index.html` like:
```html
<?!= include('css'); ?>
<?!= include('JavaScript'); ?>
```
This is the standard Apps Script pattern for splitting one HTML page across multiple project files.

**Normalization happens server-side** in `getRawData_()`:
- Dates → `yyyy-MM-dd` strings (no timezone surprises on the client)
- Numerics → `Number()` with NaN guard → `0`
- `Is_Member` → real booleans (handles Yes/No/true/false/1/0)
- All strings trimmed

**No silent errors:**
- `try/catch` wraps the server payload; failures return `{ ok:false, error:"..." }`
- Client uses both `withSuccessHandler` AND `withFailureHandler`
- A `CHARTS_READY / RAW` gate prevents rendering before Google Charts has loaded
- Empty state and error state both have visible UI banners

---

## 4. Deployment — step by step

> **You'll need:** the `SALE Data Sample` Google Sheet open in your browser.

**Step 1 — Open the script editor**
1. Open the spreadsheet in Google Sheets.
2. Top menu → **Extensions** → **Apps Script**. A new tab opens.

**Step 2 — Create the four files**
The new project starts with one file called `Code.gs`. You need three more.

1. Click the **+** next to "Files" on the left.
   - Choose **Script**, name it `Code` *(it already exists — just open it)*.
   - Choose **HTML**, name it `Index`.
   - Choose **HTML**, name it `JavaScript` *(no .html — Apps Script adds it)*.
   - Choose **HTML**, name it `css`.

**Step 3 — Paste the code**
For each file in this folder, copy its contents into the matching Apps Script file:

| Local file | Paste into Apps Script file |
|---|---|
| `Code.gs` | `Code.gs` |
| `Index.html` | `Index` |
| `JavaScript.html` | `JavaScript` |
| `css.html` | `css` |

> If your sheet tab is **not** named `Sheet1`, edit the `SHEET_NAME` constant at the top of `Code.gs`. Otherwise the script falls back to the first tab automatically.

Click the **save** icon (or `⌘/Ctrl + S`).

**Step 4 — Deploy as a web app**
1. Top right → **Deploy** → **New deployment**.
2. Click the gear ⚙ icon next to "Select type" → **Web app**.
3. Fill in:
   - **Description:** `Sales Dashboard v1`
   - **Execute as:** `Me`
   - **Who has access:** `Only myself` *(or "Anyone with the link" if you want to share)*
4. Click **Deploy**.
5. First time only: click **Authorize access**, pick your account, then **Advanced → Go to (project name) → Allow**.
6. Copy the **Web app URL** at the end. That's your dashboard.

**Step 5 — Open it**
Paste the Web app URL into a new browser tab. The dashboard loads in 2–3 seconds.

---

## 5. Updating the code later

After editing any file, you must **redeploy the same deployment** (not create a new one) so the URL stays the same:

1. **Deploy** → **Manage deployments**.
2. Click the **pencil** icon next to your active deployment.
3. **Version** dropdown → **New version** → **Deploy**.

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| "Authorization required" forever | Make sure you clicked **Allow** in the Authorize step; re-deploy. |
| Charts area is blank | Open browser DevTools → Console. The error banner above the dashboard also surfaces server errors. |
| "TypeError: Cannot read properties of null" in console | Likely a wrong sheet tab name — set `SHEET_NAME` in `Code.gs` to match your tab. |
| Numbers look weird (zeros where data exists) | Your sheet has the column as text. The normalizer coerces with `Number()`; if a cell is non-numeric it becomes `0`. Re-format the column as Number in Sheets. |
| Wants to share with the team | Re-deploy with **Who has access: Anyone with the link**. |
