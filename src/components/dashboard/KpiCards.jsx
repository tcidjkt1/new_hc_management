export default function KpiCards({ results }) {
  if (!results || !results.length) return null

  const pcts       = results.map(r => r.attrPct)
  const avgPct     = pcts.reduce((a, b) => a + b, 0) / pcts.length
  const maxPct     = Math.max(...pcts)
  const minPct     = Math.min(...pcts)
  const maxLbl     = results[pcts.indexOf(maxPct)]?.label || '—'
  const minLbl     = results[pcts.indexOf(minPct)]?.label || '—'
  const totalAttr  = results.reduce((a, r) => a + r.totalAttr, 0)
  const totalResign= results.reduce((a, r) => a + r.extCMC + r.extEMC + r.extCMDW + r.extEMDW, 0)
  const startHC    = results[0]?.startingHC || 0

  const cards = [
    {
      label: 'Avg Attrition %',
      value: avgPct.toFixed(2) + '%',
      sub: 'rata-rata per bulan',
      color: avgPct > 10 ? 'text-red-600' : avgPct > 5 ? 'text-yellow-600' : 'text-green-600'
    },
    { label: 'Tertinggi',       value: maxPct.toFixed(2) + '%', sub: maxLbl,            color: 'text-red-600'   },
    { label: 'Terendah',        value: minPct.toFixed(2) + '%', sub: minLbl,            color: 'text-green-600' },
    { label: 'Total Attrition', value: totalAttr,               sub: 'seluruh periode', color: 'text-gray-800'  },
    { label: 'Total Resign',    value: totalResign,             sub: 'seluruh periode', color: 'text-gray-800'  },
    { label: 'Starting HC',     value: startHC,                 sub: 'awal periode',    color: 'text-gray-800'  },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ label, value, sub, color }) => (
        <div key={label} className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>
        </div>
      ))}
    </div>
  )
}