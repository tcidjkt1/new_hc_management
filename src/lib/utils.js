// Konversi tanggal string ke Excel serial number
export function dateToSerial(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00Z')
  const epoch = new Date(Date.UTC(1899, 11, 30))
  return Math.round((d - epoch) / 86400000)
}

// Konversi Excel serial ke tanggal string (yyyy-mm-dd)
export function serialToDate(serial) {
  if (!serial) return null
  const epoch = new Date(Date.UTC(1899, 11, 30))
  const d = new Date(epoch.getTime() + serial * 86400000)
  return d.toISOString().split('T')[0]
}

// Hari terakhir bulan
export function monthLastDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// Check apakah posisi Daily Worker
export function isDW(position) {
  return position?.toLowerCase().includes('daily worker') ?? false
}

// Check hire status valid untuk New Hire
export function isNewOrOtherPJ(hireStatus) {
  return hireStatus === 'New Hire' || hireStatus === 'From Other PJ'
}

// Format tanggal ke dd/mm/yyyy untuk display
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Nama bulan
export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Konversi date string ke serial dari komponen y, m, d
export function dts(y, m, d) {
  return Math.round((new Date(Date.UTC(y, m - 1, d)) - new Date(Date.UTC(1899, 11, 30))) / 86400000)
}