import { useState } from 'react'
import { calcTop10 } from '../../lib/calculations'

const TABS = [
  { key: 'project',  label: 'Project'  },
  { key: 'opg',      label: 'Unit/OPG' },
  { key: 'position', label: 'Position' },
  { key: 'channel',  label: 'Channel'  },
  { key: 'skill',    label: 'Skill'    },
]

export default function Top10Table({ activeData, logData, fromS, untilS, filters }) {
  const [groupBy, setGroupBy] = useState('project')

  const data = calcTop10(activeData, logData, fromS, untilS, filters, groupBy)
  const maxPct = data[0]?.pct || 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Top 10 Attrition Rate</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGroupBy(key)}
            className={
              'px-3 py-1 text-xs rounded-full border transition-colors ' +
              (groupBy === key
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {!data.length
        ? <p className="text-xs text-gray-400 italic">Tidak ada data</p>
        : data.map((r, i) => (
          <div key={r.name} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
            <span className={`text-xs font-semibold w-5 text-right ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{r.name}</p>
              <p className="text-xs text-gray-400">HC: {r.shc} · Resign: {r.resign}</p>
            </div>
            <div className="w-16">
              <div className="h-1 bg-gray-100 rounded-full">
                <div
                  className="h-1 bg-red-400 rounded-full"
                  style={{ width: maxPct > 0 ? `${(r.pct / maxPct) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-red-500 w-12 text-right">
              {r.pct.toFixed(2)}%
            </span>
          </div>
        ))
      }
    </div>
  )
}