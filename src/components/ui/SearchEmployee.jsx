import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function SearchEmployee({ onSelect, selectedNip = '' }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(false)

  async function search(q) {
    setQuery(q)
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('hc_active')
      .select('id, nip, employee_name, position, project, opg, skill, channel, site, hire_status, join_date_project, join_date_company, tl_name, spv_name, operational_manager, unit_manager, gender, email, id_card, access_card_number, building_location, training_batch, start_probation, end_probation, remarks')
      .or(`nip.ilike.%${q}%,employee_name.ilike.%${q}%`)
      .limit(8)
    setResults(data || [])
    setLoading(false)
  }

  function select(emp) {
    setSelected(emp)
    setQuery(emp.employee_name + ' — ' + emp.nip)
    setResults([])
    onSelect(emp)
  }

  function clear() {
    setSelected(null)
    setQuery('')
    setResults([])
    onSelect(null)
  }

  return (
    <div className="relative">
      <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
        Cari Karyawan <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Ketik NIP atau nama karyawan..."
          className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {selected && (
          <button onClick={clear}
            className="h-9 px-3 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Dropdown hasil pencarian */}
      {results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map(emp => (
            <div
              key={emp.id}
              onClick={() => select(emp)}
              className="flex justify-between items-center px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{emp.employee_name}</p>
                <p className="text-xs text-gray-500">{emp.position} · {emp.project} · {emp.opg}</p>
              </div>
              <span className="text-xs text-gray-400 font-mono">{emp.nip}</span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-xs text-gray-400 mt-1">Mencari...</p>
      )}

      {/* Info karyawan terpilih */}
      {selected && (
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-gray-500">NIP:</span> <span className="font-medium">{selected.nip}</span></div>
            <div><span className="text-gray-500">Posisi:</span> <span className="font-medium">{selected.position}</span></div>
            <div><span className="text-gray-500">Project:</span> <span className="font-medium">{selected.project}</span></div>
            <div><span className="text-gray-500">OPG:</span> <span className="font-medium">{selected.opg}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}