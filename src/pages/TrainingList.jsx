import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'

const STATUS_COLORS = {
  'On Training': 'bg-blue-50 text-blue-700 border-blue-200',
  'Passed':      'bg-green-50 text-green-700 border-green-200',
  'Not Passed':  'bg-red-50 text-red-700 border-red-200',
  'Resigned':    'bg-gray-50 text-gray-600 border-gray-200',
}

const inp = "h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"

export default function TrainingList() {
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const [modal, setModal]       = useState(null) // { type: 'passed'|'notpassed'|'resign', row }
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  // Form fields untuk modal
  const [passedDate, setPassedDate]         = useState('')
  const [joinDateProject, setJoinDateProject] = useState('')
  const [notPassedDate, setNotPassedDate]   = useState('')
  const [notPassedReason, setNotPassedReason] = useState('')
  const [resignDate, setResignDate]         = useState('')
  const [resignReason, setResignReason]     = useState('')

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

  function openModal(type, row) {
    setModal({ type, row })
    setMsg(null)
    // Reset semua field
    setPassedDate('')
    setJoinDateProject('')
    setNotPassedDate('')
    setNotPassedReason('')
    setResignDate('')
    setResignReason('')
  }

  function closeModal() {
    setModal(null)
    setMsg(null)
    setSaving(false)
  }

  // ── UPDATE: Passed ─────────────────────────────────────────
  async function handlePassed() {
    if (!joinDateProject) {
      setMsg({ type: 'error', text: 'Join Date Project wajib diisi' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const row = modal.row

      // 1. Update status di hc_training
      const { error: e1 } = await supabase
        .from('hc_training')
        .update({
          training_status: 'Passed',
          passed_date: passedDate || null,
          join_date_project: joinDateProject,
        })
        .eq('id', row.id)
      if (e1) throw e1

      // 2. Insert ke hc_active
      const activeBody = {
        nip:                row.nip,
        employee_name:      row.employee_name,
        gender:             row.gender,
        email:              row.email,
        id_card:            row.id_card,
        opg:                row.opg,
        project:            row.project,
        position:           row.position || 'Agent',
        skill:              row.skill,
        channel:            row.channel,
        site:               row.site,
        tl_name:            row.tl_name,
        spv_name:           row.spv_name,
        operational_manager:row.operational_manager,
        unit_manager:       row.unit_manager,
        join_date_company:  row.join_date_company,
        join_date_project:  joinDateProject,
        pcn_type:           'Active',
        hire_status:        row.hire_status || 'New Hire',
        training_batch:     row.training_batch,
        remarks:            row.remarks,
      }
      const { error: e2 } = await supabase.from('hc_active').insert(activeBody)
      if (e2) throw e2

      setMsg({ type: 'success', text: `✓ ${row.employee_name} berhasil Passed dan ditambahkan ke HC Aktif!` })
      fetchData()
      setTimeout(closeModal, 2000)
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── UPDATE: Not Passed ─────────────────────────────────────
  async function handleNotPassed() {
    setSaving(true)
    setMsg(null)
    try {
      const { error } = await supabase
        .from('hc_training')
        .update({
          training_status: 'Not Passed',
          not_passed_date: notPassedDate || null,
          not_passed_reason: notPassedReason || null,
        })
        .eq('id', modal.row.id)
      if (error) throw error
      setMsg({ type: 'success', text: `✓ Status ${modal.row.employee_name} diubah ke Not Passed.` })
      fetchData()
      setTimeout(closeModal, 2000)
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── UPDATE: Resign dari Training ──────────────────────────
  async function handleResign() {
    if (!resignDate) {
      setMsg({ type: 'error', text: 'Tanggal resign wajib diisi' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const row = modal.row

      // 1. Update status di hc_training
      const { error: e1 } = await supabase
        .from('hc_training')
        .update({
          training_status: 'Resigned',
          not_passed_date: resignDate,
          not_passed_reason: resignReason || 'Resign selama training',
        })
        .eq('id', row.id)
      if (e1) throw e1

      // 2. Insert ke hc_log_history sebagai Resign
      const logBody = {
        nip:                row.nip,
        employee_name:      row.employee_name,
        gender:             row.gender,
        id_card:            row.id_card,
        email:              row.email,
        opg:                row.opg,
        project:            row.project,
        position:           row.position || 'Agent',
        skill:              row.skill,
        channel:            row.channel,
        site:               row.site,
        tl_name:            row.tl_name,
        spv_name:           row.spv_name,
        operational_manager:row.operational_manager,
        unit_manager:       row.unit_manager,
        join_date_company:  row.join_date_company,
        join_date_project:  row.training_start_date,
        pcn_type:           'Resign',
        hire_status:        row.hire_status || 'New Hire',
        training_batch:     row.training_batch,
        resign_type:        'Employee Matter (Voluntary)',
        attrition_type:     'Voluntary - Training',
        effective_resign_date: resignDate,
        resignation_reason: resignReason || 'Resign selama training',
        remarks:            'Resign saat masa training',
      }
      const { error: e2 } = await supabase.from('hc_log_history').insert(logBody)
      if (e2) throw e2

      setMsg({ type: 'success', text: `✓ ${row.employee_name} diproses resign dari training. Log history dicatat.` })
      fetchData()
      setTimeout(closeModal, 2000)
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  const filtered = data.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (r.nip || '').includes(q) ||
      (r.employee_name || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.training_status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all:        data.length,
    onTraining: data.filter(r => r.training_status === 'On Training').length,
    passed:     data.filter(r => r.training_status === 'Passed').length,
    notPassed:  data.filter(r => r.training_status === 'Not Passed').length,
    resigned:   data.filter(r => r.training_status === 'Resigned').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: counts.all,        color: 'text-gray-800',  bg: 'bg-gray-50'  },
          { label: 'On Training', value: counts.onTraining, color: 'text-blue-700',  bg: 'bg-blue-50'  },
          { label: 'Passed',      value: counts.passed,     color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Not Passed',  value: counts.notPassed,  color: 'text-red-700',   bg: 'bg-red-50'   },
          { label: 'Resigned',    value: counts.resigned,   color: 'text-gray-600',  bg: 'bg-gray-100' },
        ].map(({ label, value, color, bg }) => (
          <button key={label}
            onClick={() => setStatusFilter(label === 'Total' ? 'All' : label)}
            className={`${bg} rounded-xl p-4 text-left transition-opacity hover:opacity-80 ${
              (statusFilter === label || (label === 'Total' && statusFilter === 'All')) ? 'ring-2 ring-blue-300' : ''
            }`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          </button>
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
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-gray-200 rounded-lg min-w-[130px]">
            <option value="All">All</option>
            <option>On Training</option>
            <option>Passed</option>
            <option>Not Passed</option>
            <option>Resigned</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['NIP','Nama','OPG','Project','Position','Batch','Mulai Training','Status','Aksi'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">
                    {data.length === 0
                      ? 'Belum ada data training. Gunakan menu Input / Edit → New Hire (Training).'
                      : 'Tidak ada data yang sesuai filter'}
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">{r.nip}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.employee_name}</td>
                  <td className="px-3 py-2 text-gray-500">{r.opg || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.project || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.position || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.training_batch || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(r.training_start_date)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[r.training_status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {r.training_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {/* Tombol aksi hanya muncul untuk On Training */}
                    {r.training_status === 'On Training' ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openModal('passed', r)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                          ✅ Passed
                        </button>
                        <button
                          onClick={() => openModal('notpassed', r)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                          ❌ Not Passed
                        </button>
                        <button
                          onClick={() => openModal('resign', r)}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                          🚪 Resign
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            {/* Header modal */}
            <div className="mb-4">
              {modal.type === 'passed' && (
                <>
                  <h3 className="text-base font-semibold text-gray-800">✅ Konfirmasi Passed</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Karyawan akan ditambahkan ke <strong>HC Aktif</strong> setelah dikonfirmasi.
                  </p>
                </>
              )}
              {modal.type === 'notpassed' && (
                <>
                  <h3 className="text-base font-semibold text-gray-800">❌ Konfirmasi Not Passed</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Status training akan diubah ke Not Passed.
                  </p>
                </>
              )}
              {modal.type === 'resign' && (
                <>
                  <h3 className="text-base font-semibold text-gray-800">🚪 Konfirmasi Resign</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Karyawan resign saat masa training. Data akan dicatat di <strong>Log History</strong>.
                  </p>
                </>
              )}
            </div>

            {/* Info karyawan */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium text-gray-800">{modal.row.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">NIP</span>
                <span className="font-mono text-gray-700">{modal.row.nip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Project</span>
                <span className="text-gray-700">{modal.row.project} · {modal.row.opg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="text-gray-700">{modal.row.training_batch || '—'}</span>
              </div>
            </div>

            {/* Form per tipe */}
            <div className="space-y-3 mb-5">

              {/* PASSED */}
              {modal.type === 'passed' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Passed Date</label>
                    <input type="date" value={passedDate} onChange={e => setPassedDate(e.target.value)} className={inp} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      Join Date Project <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={joinDateProject} onChange={e => setJoinDateProject(e.target.value)} className={inp} />
                    <p className="text-xs text-gray-400">Tanggal mulai resmi jadi karyawan aktif di project ini</p>
                  </div>
                </>
              )}

              {/* NOT PASSED */}
              {modal.type === 'notpassed' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Tanggal Not Passed</label>
                    <input type="date" value={notPassedDate} onChange={e => setNotPassedDate(e.target.value)} className={inp} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Alasan Not Passed</label>
                    <input type="text" value={notPassedReason} onChange={e => setNotPassedReason(e.target.value)}
                      placeholder="contoh: Nilai ujian tidak memenuhi standar"
                      className={inp} />
                  </div>
                </>
              )}

              {/* RESIGN */}
              {modal.type === 'resign' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">
                      Tanggal Resign <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={resignDate} onChange={e => setResignDate(e.target.value)} className={inp} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Alasan Resign</label>
                    <input type="text" value={resignReason} onChange={e => setResignReason(e.target.value)}
                      placeholder="contoh: Mengundurkan diri atas kemauan sendiri"
                      className={inp} />
                  </div>
                </>
              )}
            </div>

            {/* Status message */}
            {msg && (
              <div className={`p-3 rounded-lg text-xs mb-4 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            {/* Tombol */}
            <div className="flex gap-2">
              {modal.type === 'passed' && (
                <button onClick={handlePassed} disabled={saving}
                  className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60">
                  {saving ? 'Memproses...' : '✅ Konfirmasi Passed'}
                </button>
              )}
              {modal.type === 'notpassed' && (
                <button onClick={handleNotPassed} disabled={saving}
                  className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60">
                  {saving ? 'Memproses...' : '❌ Konfirmasi Not Passed'}
                </button>
              )}
              {modal.type === 'resign' && (
                <button onClick={handleResign} disabled={saving}
                  className="flex-1 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-60">
                  {saving ? 'Memproses...' : '🚪 Konfirmasi Resign'}
                </button>
              )}
              <button onClick={closeModal} disabled={saving}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}