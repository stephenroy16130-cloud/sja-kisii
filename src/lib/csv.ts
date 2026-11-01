// Quote every cell, and defuse spreadsheet formulas (a cell starting with = + - @ would run in Excel)
export function csvCell(v: string) {
  const s = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return '"' + s.replace(/"/g, '""') + '"';
}
