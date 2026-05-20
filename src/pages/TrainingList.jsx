import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'

const STATUS_COLORS = {
  'On Training': 'bg-blue-50 text-blue-700',
  'Passed':      'bg-green-50 text-green-700',
  'Not Passed':  'bg-red-50 text-red-700',
}

export default function TrainingList() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('All')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('hc_training')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setData(rows || [])
    setLoading(false)
  }

  const filtered = data.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (r.nip || '').includes(q) ||
      (r.employee_name || '').toLowerCase().includes(q)
    const matchStatus = status === 'All' || r.training_status === status
    return matchSearch && matchStatus
  })

  const counts = {
    all:        data.length,
    onTraining: data.filter(r => r.training_status === 'On Training').length,
    passed:     data.filter(r => r.training_status === 'Passed').length,
    notPassed:  data.filter(r => r.training_status === 'Not Passed').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Training Bucket</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            New hire dalam masa training — belum dihitung sebagai HC aktif
          </p>
        </div>
        <button onClick={fetchData}
          className="h-8 px-4 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          🔄 Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: counts.all,        color: 'text-gray-800',  bg: 'bg-gray-50'  },
          { label: 'On Training', value: counts.onTraining, color: 'text-blue-700',  bg: 'bg-blue-50'  },
          { label: 'Passed',      value: counts.passed,     color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Not Passed',  value: counts.notPassed,  color: 'text-red-700',   bg: 'bg-red-50'   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Cari NIP / Nama</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ketik untuk mencari..."
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-8 px-2 text-xs border border-gray-200 rounded-lg min-w-[130px]">
            <option>All</option>
            <option>On Training</option>
            <option>Passed</option>
            <option>Not Passed</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['NIP','Nama','OPG','Project','Position','Skill','Batch Training','Tgl Mulai Training','Status','Join Project'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400 italic">
                    {data.length === 0
                      ? 'Belum ada data training. Gunakan menu Input / Edit untuk menambah.'
                      : 'Tidak ada data yang sesuai filter'}
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">{r.nip}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.employee_name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.opg || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.project || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.position || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.skill || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.training_batch || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(r.training_start_date)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.training_status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.training_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(r.join_date_project) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}