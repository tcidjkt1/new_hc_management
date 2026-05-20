import { dateToSerial } from '../../lib/utils'

const COLORS = ['#5B8FF9','#61DDAA','#F6BD16','#7262FD','#78D3F8','#9661BC','#F4664A']

function counter(arr, key) {
  const m = {}
  arr.forEach(r => { const v = r[key] || '(kosong)'; m[v] = (m[v] || 0) + 1 })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

function BreakdownList({ entries, total }) {
  if (!entries.length) return <p className="text-xs text-gray-400 italic">Tidak ada data</p>
  return (
    <>
      {entries.slice(0, 5).map(([k, v], i) => {
        const pct = total > 0 ? Math.round((v / total) * 100) : 0
        return (
          <div key={k} className="mb-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }} />
                {k}
              </span>
              <span className="text-xs font-medium text-gray-700 ml-2 flex-shrink-0">
                {v} <span className="text-gray-400">({pct}%)</span>
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full mt-0.5">
              <div className="h-1 rounded-full"
                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        )
      })}
    </>
  )
}

function ToList({ rows }) {
  if (!rows.length) return <p className="text-xs text-gray-400 italic">Tidak ada data</p>
  return (
    <>
      {rows.slice(0, 5).map((r, i) => (
        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
          <span className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }} />
            {r.to_project || '—'} → {r.to_position || '—'}
          </span>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{r.to_opg || '—'}</span>
        </div>
      ))}
    </>
  )
}

export default function SummaryCards({ logData, activeData, fromS, untilS }) {
  const L = logData || []
  const A = activeData || []

  const toS = (d) => d ? dateToSerial(d) : null

  const allResign = L.filter(r => r.pcn_type === 'Resign')
  const actives   = A.filter(r => r.pcn_type === 'Active')
  const promos    = L.filter(r =>
    ['Promotion Out Of PJ','Demotion Out Of PJ'].includes(r.pcn_type) &&
    r.start_probation && toS(r.start_probation) >= fromS && toS(r.start_probation) <= untilS
  )
  const muts = L.filter(r =>
    r.pcn_type === 'Mutation' &&
    r.start_probation && toS(r.start_probation) >= fromS && toS(r.start_probation) <= untilS
  )

  const cards = [
    {
      title: `Resign — Resign Type (${allResign.length})`,
      content: <BreakdownList entries={counter(allResign, 'resign_type')} total={allResign.length} />
    },
    {
      title: `Active — Hire Status (${actives.length})`,
      content: <BreakdownList entries={counter(actives, 'hire_status')} total={actives.length} />
    },
    {
      title: `Promotion/Demotion — Tujuan (${promos.length})`,
      content: <ToList rows={promos} />
    },
    {
      title: `Mutation — Tujuan (${muts.length})`,
      content: <ToList rows={muts} />
    },
  ]

  return (
    <div className="space-y-3">
      {cards.map(({ title, content }) => (
        <div key={title} className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">{title}</h3>
          {content}
        </div>
      ))}
    </div>
  )
}