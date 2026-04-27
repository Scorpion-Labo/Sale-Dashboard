/**
 * SALES DASHBOARD — bound Google Apps Script
 *
 * Reads data from the active spreadsheet (bound script), normalizes every
 * field on the SERVER side, then ships a single payload to the client.
 *
 * Tabs / files in this project:
 *   Code.gs        — this file (server)
 *   Index.html     — page skeleton (templated)
 *   JavaScript.html — client logic + Google Charts
 *   css.html       — styles
 */

/** ---- CONFIG ---- */
const SHEET_NAME = 'Sheet1';   // change if your tab is named differently

/** Web app entry point */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Sales Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Server-side include() helper — used inside Index.html templates as <?!= include('foo') ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Reads and NORMALIZES the raw sales data:
 *   - Date            -> ISO 'yyyy-MM-dd' string
 *   - Numerics        -> Number()
 *   - Is_Member       -> boolean (Yes/No/true/false/1/0 all handled)
 *   - String fields   -> trimmed
 */
function getRawData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(h => String(h).trim());
  const tz = Session.getScriptTimeZone();

  const numericKeys = ['Transaction_ID','Quantity','Unit_Price','Discount_Applied','Customer_Rating','Total_Sales'];
  const stringKeys  = ['Region','Product_Category','Product_SKU'];

  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });

    // --- Date ---
    let d = obj['Date'];
    if (d instanceof Date && !isNaN(d)) {
      obj['Date'] = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    } else if (d) {
      const parsed = new Date(d);
      obj['Date'] = isNaN(parsed) ? '' : Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
    } else {
      obj['Date'] = '';
    }

    // --- Numerics ---
    numericKeys.forEach(k => {
      const v = obj[k];
      obj[k] = (v === '' || v == null || isNaN(Number(v))) ? 0 : Number(v);
    });

    // --- Boolean ---
    const m = String(obj['Is_Member']).trim().toLowerCase();
    obj['Is_Member'] = (m === 'yes' || m === 'true' || m === '1' || m === 'y');

    // --- Strings ---
    stringKeys.forEach(k => {
      obj[k] = obj[k] == null ? '' : String(obj[k]).trim();
    });

    return obj;
  }).filter(r => r['Date']);  // drop rows with no usable date
}

/**
 * Master payload for the dashboard: rows + filter options + KPIs + aggregates.
 * Doing this server-side keeps the client lean and avoids surprises from
 * spreadsheet locale / type quirks.
 */
function getDashboardData() {
  try {
    const rows = getRawData_();

    if (!rows.length) {
      return { ok: true, empty: true, filters: { regions: [], categories: [] } };
    }

    const regions    = uniqueSorted_(rows.map(r => r.Region));
    const categories = uniqueSorted_(rows.map(r => r.Product_Category));

    // KPIs across the whole dataset (the client recomputes for filtered views)
    const totalSales = sum_(rows.map(r => r.Total_Sales));
    const totalTx    = rows.length;
    const totalUnits = sum_(rows.map(r => r.Quantity));
    const avgOrder   = totalTx ? totalSales / totalTx : 0;
    const avgRating  = totalTx ? sum_(rows.map(r => r.Customer_Rating)) / totalTx : 0;

    return {
      ok: true,
      empty: false,
      filters: { regions, categories },
      kpi: { totalSales, totalTx, totalUnits, avgOrder, avgRating },
      rows  // full normalized dataset — client filters & re-aggregates from here
    };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* ---------------- helpers ---------------- */
function sum_(arr) { return arr.reduce((a, b) => a + (Number(b) || 0), 0); }
function uniqueSorted_(arr) { return [...new Set(arr)].filter(Boolean).sort(); }
