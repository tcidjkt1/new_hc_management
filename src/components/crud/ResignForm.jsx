import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import SearchEmployee from '../ui/SearchEmployee'

const inp = "h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function ResignForm() {
  const [emp, setEmp]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]   = useState(null)
  const [form, setForm] = useState({
    resign_type: '', attrition_type: '',
    effective_resign_date: '', last_day: '',
    resignation_reason: '', second_resignation_reason: '', remarks: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!emp) { setMsg({ type: 'error', text: 'Pilih karyawan terlebih dahulu' }); return }
    if (!form.resign_type || !form.effective_resign_date) {
      setMsg({ type: 'error', text: 'Resign type dan effective resign date wajib diisi' }); return
    }
    setSaving(true); setMsg(null)
    try {
      // Insert ke hc_log_history
      const logBody = {
        nip: emp.nip, employee_name: emp.employee_name, gender: emp.gender,
        id_card: emp.id_card, email: emp.email, access_card_number: emp.access_card_number,
        building_location: emp.building_location,
        opg: emp.opg, project: emp.project, position: emp.position,
        skill: emp.skill, channel: emp.channel, site: emp.site,
        tl_name: emp.tl_name, spv_name: emp.spv_name,
        operational_manager: emp.operational_manager, unit_manager: emp.unit_manager,
        join_date_company: emp.join_date_company, join_date_project: emp.join_date_project,
        pcn_type: 'Resign', hire_status: emp.hire_status, training_batch: emp.training_batch,
        resign_type: form.resign_type,
        attrition_type: form.attrition_type || null,
        effective_resign_date: form.effective_resign_date,
        last_day: form.last_day || null,
        resignation_reason: form.resignation_reason || null,
        second_resignation_reason: form.second_resignation_reason || null,
        remarks: form.remarks || null,
      }
      const { error: e1 } = await supabase.from('hc_log_history').insert(logBody)
      if (e1) throw e1
      // Hapus dari hc_active
      const { error: e2 } = await supabase.from('hc_active').delete().eq('id', emp.id)
      if (e2) throw e2
      setMsg({ type: 'success', text: `✓ ${emp.employee_name} berhasil diproses resign. Data dipindah ke Log History.` })
      setEmp(null)
      setForm({ resign_type:'', attrition_type:'', effective_resign_date:'', last_day:'', resignation_reason:'', second_resignation_reason:'', remarks:'' })
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Proses Resign</h2>
        <p className="text-xs text-gray-400 mt-0.5">Karyawan akan dipindahkan dari HC Aktif ke Log History.</p>
      </div>

      <SearchEmployee onSelect={setEmp} />

      {emp && (
        <>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Data Resign</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Resign Type" required>
                <select className={inp} value={form.resign_type} onChange={e => set('resign_type', e.target.value)}>
                  <option value="">— pilih —</option>
                  <option>Employee Matter (Voluntary)</option>
                  <option>Company Matter (Involuntary)</option>
                </select>
              </Field>
              <Field label="Attrition Type">
                <select className={inp} value={form.attrition_type} onChange={e => set('attrition_type', e.target.value)}>
                  <option value="">— pilih —</option>
                  <option>Voluntary - Online</option>
                  <option>Voluntary - Training</option>
                  <option>Involuntary - Online</option>
                  <option>Involuntary - Training</option>
                </select>
              </Field>
              <Field label="Effective Resign Date" required>
                <input className={inp} type="date" value={form.effective_resign_date} onChange={e => set('effective_resign_date', e.target.value)} />
              </Field>
              <Field label="Last Day">
                <input className={inp} type="date" value={form.last_day} onChange={e => set('last_day', e.target.value)} />
              </Field>
              <Field label="Resignation Reason">
                <input className={inp} value={form.resignation_reason} onChange={e => set('resignation_reason', e.target.value)} placeholder="Career Opportunity" />
              </Field>
              <Field label="Second Reason">
                <input className={inp} value={form.second_resignation_reason} onChange={e => set('second_resignation_reason', e.target.value)} />
              </Field>
              <Field label="Remarks">
                <input className={inp} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Without Notice" />
              </Field>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
              {saving ? 'Memproses...' : '🚪 Proses Resign'}
            </button>
            <button onClick={() => { setEmp(null); setMsg(null) }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              Reset
            </button>
          </div>
        </>
      )}

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}