/**
 * The app's single timezone policy for "today".
 *
 * DailyLog.date (and GratitudeEntry.date) are @db.Date columns stamped at
 * SERVER-LOCAL midnight: logs.js parses 'YYYY-MM-DD' as new Date(y, m-1, d)
 * and defaults to local now with hours zeroed. Any "did X happen today"
 * check must therefore compare against the same local-midnight Date on the
 * domain `date` field — not against createdAt, which diverges from the log's
 * calendar day on upserts, backdated entries, and timezone edges.
 */
function localDayStart(dateStr) {
  if (dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = { localDayStart };
