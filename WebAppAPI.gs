/**
 * ── UPDATED WebAppAPI.gs ─────────────────────────────────────────────
 * Supports multiple terms via the `term` query parameter.
 *
 * /exec?action=data          → Term 4 data (default, backwards compatible)
 * /exec?action=data&term=4   → Term 4 data
 * /exec?action=data&term=5   → Term 5 data
 * ────────────────────────────────────────────────────────────────────
 */

// ── Sheet configuration per term ──
// NOTE: These reference constants (DATA_START_ROW, DATA_START_COL, DATA_END_COL)
// that should already be defined in your Code.gs file.
var TERM_CONFIG = {
  '4': { sheetName: 'Term 4 (25-27)', startRow: DATA_START_ROW, startCol: DATA_START_COL, endCol: DATA_END_COL },
  '5': { sheetName: 'Term 5 (25-27) ', startRow: DATA_START_ROW, startCol: DATA_START_COL, endCol: DATA_END_COL }
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'data') {
    var term = (e.parameter.term || '5').toString();
    var output = ContentService
      .createTextOutput(JSON.stringify(getTimetableData(term)))
      .setMimeType(ContentService.MimeType.JSON);
    return output;
  }
  return HtmlService.createHtmlOutputFromFile('AppPage')
    .setTitle('MBA Timetable')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getTimetableData(term) {
  var config = TERM_CONFIG[term] || TERM_CONFIG['5'];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(config.sheetName);
  if (!sheet) return { error: "Sheet '" + config.sheetName + "' not found" };

  var lastRow = sheet.getLastRow();
  var numRows = lastRow - config.startRow + 1;
  var numCols = config.endCol - config.startCol + 1;
  if (numRows < 1) return { error: "No data rows found" };

  var slotHeaders = sheet.getRange(4, config.startCol, 1, numCols).getValues()[0]
    .map(function(h){ return h.toString().trim(); });
  var meta = sheet.getRange(config.startRow, 1, numRows, 3).getValues();
  var data = sheet.getRange(config.startRow, config.startCol, numRows, numCols).getValues();

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
  return { updatedAt: new Date().toISOString(), term: term, slotHeaders: slotHeaders, rows: rows };
}
