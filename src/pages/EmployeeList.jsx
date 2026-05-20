import { useState } from 'react'
import { useHcData } from '../hooks/useHcData'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'

const COLUMNS = [
  { key: 'nip',           label: 'NIP'          },
  { key: 'employee_name', label: 'Nama'         },
  { key: 'position',      label: 'Position'     },
  { key: 'project',       label: 'Project'      },
  { key: 'opg',           label: 'Unit/OPG'     },
  { key: 'hire_status',   label: 'Hire Status'  },
  { key: 'channel',       label: 'Channel'      },
  { key: 'skill',         label: 'Skill'        },
  { key: 'site',          label: 'Site'         },
  { key: 'join_date_project', label: 'Join Project' },
]

export default function EmployeeList() {
  const { activeData, loading, error, refetch } = useHcData()
  const [search, setSearch]   = useState('')
  const [filterOpg, setOpg]   = useState('All')
  const [filterProj, setProj] = useState('All')
  const [page, setPage]       = useState(1)
  const PER_PAGE = 15

  const opgs     = ['All', ...[...new Set(activeData.map(r => r.opg).filter(Boolean))].sort()]
  const projects = ['All', ...[...new Set(
    activeData.filter(r => filterOpg === 'All' || r.opg === filterOpg).map(r => r.project).filter(Boolean)
  )].sort()]

  const filtered = activeData.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (r.nip || '').toString().includes(q) ||
      (r.employee_name || '').toLowerCase().includes(q) ||
      (r.position || '').toLowerCase().includes(q)
    const matchOpg  = filterOpg  === 'All' || r.opg     === filterOpg
    const matchProj = filterProj === 'All' || r.project  === filterProj
    return matchSearch && matchOpg && matchProj
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Memuat data...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-medium text-red-700">Gagal memuat data: {error}</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Data Karyawan Aktif</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} dari {activeData.length} karyawan</p>
        </div>
        <button
          onClick={refetch}
          className="h-8 px-4 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Cari NIP / Nama / Posisi</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Ketik untuk mencari..."
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white text-gray-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Unit/OPG</label>
          <select
            value={filterOpg}
            onChange={e => { setOpg(e.target.value); setProj('All'); setPage(1) }}
            className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 min-w-[130px]"
          >
            {opgs.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Project</label>
          <select
            value={filterProj}
            onChange={e => { setProj(e.target.value); setPage(1) }}
            className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 min-w-[130px]"
          >
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-gray-500 font-medium w-8">#</th>
                {COLUMNS.map(c => (
                  <th key={c.key} className="px-3 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!paginated.length ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-gray-400 italic">
                    Tidak ada data karyawan
                  </td>
                </tr>
              ) : paginated.map((r, i) => (
                <tr key={r.id || r.nip} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-gray-400">{(page - 1) * PER_PAGE + i + 1}</td>
                  {COLUMNS.map(c => (
                    <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {c.key === 'join_date_project'
                        ? formatDate(r[c.key])
                        : r[c.key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 px-3 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = i + 1
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 text-xs rounded-lg border transition-colors ${
                      page === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 px-3 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}