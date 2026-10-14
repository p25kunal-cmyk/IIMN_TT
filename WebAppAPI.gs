/**
 * ── UPDATED WebAppAPI.gs ─────────────────────────────────────────────
 * Supports multiple terms via the `term` query parameter.
 *
 * /exec?action=data          → Term 5 data (default)
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

/**
 * Check if a RichTextValue cell (or any of its runs) has strikethrough applied.
 * Returns true if the entire visible text is struck through.
 */
function isCellStrikethrough(richCell) {
  try {
    var text = richCell.getText();
    if (!text || !text.trim()) return false;
    // Check if the whole-cell text style has strikethrough
    var style = richCell.getTextStyle();
    if (style && style.isStrikethrough && style.isStrikethrough()) return true;
    // Check individual runs - if every run is strikethrough, cell is cancelled
    var runs = richCell.getRuns ? richCell.getRuns() : [];
    if (runs.length > 0) {
      var allStruck = runs.every(function(run) {
        var rs = run.getTextStyle();
        return rs && rs.isStrikethrough && rs.isStrikethrough();
      });
      if (allStruck) return true;
    }
    return false;
  } catch(err) {
    return false;
  }
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

  // Get rich text values to detect strikethrough formatting
  var richData;
  try {
    richData = sheet.getRange(config.startRow, config.startCol, numRows, numCols).getRichTextValues();
  } catch(err) {
    richData = null;
  }

  var tz = Session.getScriptTimeZone();
  var rows = [];
  for (var i = 0; i < numRows; i++) {
    var dateVal = meta[i][2];
    var dateStr = (dateVal instanceof Date)
      ? Utilities.formatDate(dateVal, tz, "dd-MMM-yyyy")
      : dateVal.toString().trim();

    var cells = data[i].map(function(c, j) {
      var text = c.toString();
      if (!text.trim()) return text;
      // If rich text available and the cell has strikethrough, append (cancelled) marker per line
      if (richData && richData[i] && richData[i][j]) {
        var richCell = richData[i][j];
        if (isCellStrikethrough(richCell)) {
          // Append (cancelled) to each line so parseLine() in the frontend can detect it
          text = text.split('\n').map(function(line) {
            return line.trim() ? line + ' (cancelled)' : line;
          }).join('\n');
        }
      }
      return text;
    });

    rows.push({
      week: meta[i][0].toString().trim(),
      day:  meta[i][1].toString().trim(),
      date: dateStr,
      cells: cells
    });
  }
  return { updatedAt: new Date().toISOString(), term: term, slotHeaders: slotHeaders, rows: rows };
}
