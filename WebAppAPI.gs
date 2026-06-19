/**
 * ── UPDATED WebAppAPI.gs ─────────────────────────────────────────────
 * Add this to your existing Code.gs (replace the old doGet if any).
 * Now serves CORS headers so the Netlify app can fetch data directly.
 *
 * /exec            → serves the Apps Script HTML app (unchanged)
 * /exec?action=data → returns JSON with CORS headers (for Netlify app)
 * ────────────────────────────────────────────────────────────────────
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'data') {
    var output = ContentService
      .createTextOutput(JSON.stringify(getTimetableData()))
      .setMimeType(ContentService.MimeType.JSON);
    return output;
  }
  return HtmlService.createHtmlOutputFromFile('AppPage')
    .setTitle('MBA Term IV Timetable')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getTimetableData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // If standalone script (read-only sheet), use:
  // var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { error: "Sheet '" + SHEET_NAME + "' not found" };

  var lastRow = sheet.getLastRow();
  var numRows = lastRow - DATA_START_ROW + 1;
  var numCols = DATA_END_COL - DATA_START_COL + 1;
  if (numRows < 1) return { error: "No data rows found" };

  var slotHeaders = sheet.getRange(4, DATA_START_COL, 1, numCols).getValues()[0]
    .map(function(h){ return h.toString().trim(); });
  var meta = sheet.getRange(DATA_START_ROW, 1, numRows, 3).getValues();
  var data = sheet.getRange(DATA_START_ROW, DATA_START_COL, numRows, numCols).getValues();

  var tz = Session.getScriptTimeZone();
  var rows = [];
  for (var i = 0; i < numRows; i++) {
    var dateVal = meta[i][2];
    var dateStr = (dateVal instanceof Date)
      ? Utilities.formatDate(dateVal, tz, "dd-MMM-yyyy")
      : dateVal.toString().trim();
    rows.push({
      week: meta[i][0].toString().trim(),
      day:  meta[i][1].toString().trim(),
      date: dateStr,
      cells: data[i].map(function(c){ return c.toString(); })
    });
  }
  return { updatedAt: new Date().toISOString(), slotHeaders: slotHeaders, rows: rows };
}
