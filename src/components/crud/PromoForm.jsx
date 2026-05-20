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

export default function PromoForm() {
  const [emp, setEmp]       = useState(null)
  const [pcnType, setPcn]   = useState('Promotion Out Of PJ')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)
  const [form, setForm] = useState({
    to_opg: '', to_project: '', to_position: '', to_skill: '', to_channel: '',
    start_probation: '', end_probation: '', fix_new_position_date: '',
    result_promotion: '', remarks: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!emp) { setMsg({ type: 'error', text: 'Pilih karyawan terlebih dahulu' }); return }
    if (!form.to_opg || !form.to_project || !form.to_position || !form.start_probation) {
      setMsg({ type: 'error', text: 'To OPG, To Project, To Position, dan Start Probation wajib diisi' }); return
    }
    setSaving(true); setMsg(null)
    try {
      const logBody = {
        nip: emp.nip, employee_name: emp.employee_name, gender: emp.gender,
        id_card: emp.id_card, email: emp.email,
        opg: emp.opg, project: emp.project, position: emp.position,
        skill: emp.skill, channel: emp.channel, site: emp.site,
        tl_name: emp.tl_name, spv_name: emp.spv_name,
        operational_manager: emp.operational_manager, unit_manager: emp.unit_manager,
        join_date_company: emp.join_date_company, join_date_project: emp.join_date_project,
        pcn_type: pcnType, hire_status: emp.hire_status, training_batch: emp.training_batch,
        start_probation: form.start_probation,
        end_probation: form.end_probation || null,
        fix_new_position_date: form.fix_new_position_date || null,
        result_promotion: form.result_promotion || null,
        to_opg: form.to_opg, to_project: form.to_project, to_position: form.to_position,
        to_skill: form.to_skill || null, to_channel: form.to_channel || null,
        remarks: form.remarks || null,
      }
      const { error: e1 } = await supabase.from('hc_log_history').insert(logBody)
      if (e1) throw e1
      const { error: e2 } = await supabase.from('hc_active').delete().eq('id', emp.id)
      if (e2) throw e2
      setMsg({ type: 'success', text: `✓ ${emp.employee_name} berhasil diproses ${pcnType}. Data dipindah ke Log History.` })
      setEmp(null)
      setForm({ to_opg:'', to_project:'', to_position:'', to_skill:'', to_channel:'', start_probation:'', end_probation:'', fix_new_position_date:'', result_promotion:'', remarks:'' })
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Proses Promosi / Demosi</h2>
        <p className="text-xs text-gray-400 mt-0.5">Karyawan akan dipindahkan dari HC Aktif ke Log History.</p>
      </div>

      {/* Jenis */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Jenis Pergerakan</p>
        <div className="flex gap-2">
          {['Promotion Out Of PJ', 'Demotion Out Of PJ'].map(t => (
            <button key={t} onClick={() => setPcn(t)}
              className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                pcnType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {t === 'Promotion Out Of PJ' ? '⬆️ Promotion Out Of PJ' : '⬇️ Demotion Out Of PJ'}
            </button>
          ))}
        </div>
      </div>

      <SearchEmployee onSelect={setEmp} />

      {emp && (
        <>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Tujuan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="To OPG" required><input className={inp} value={form.to_opg} onChange={e => set('to_opg', e.target.value)} /></Field>
              <Field label="To Project" required><input className={inp} value={form.to_project} onChange={e => set('to_project', e.target.value)} /></Field>
              <Field label="To Position" required><input className={inp} value={form.to_position} onChange={e => set('to_position', e.target.value)} /></Field>
              <Field label="To Skill"><input className={inp} value={form.to_skill} onChange={e => set('to_skill', e.target.value)} /></Field>
              <Field label="To Channel"><input className={inp} value={form.to_channel} onChange={e => set('to_channel', e.target.value)} /></Field>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Tanggal</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Start Probation" required><input className={inp} type="date" value={form.start_probation} onChange={e => set('start_probation', e.target.value)} /></Field>
              <Field label="End Probation"><input className={inp} type="date" value={form.end_probation} onChange={e => set('end_probation', e.target.value)} /></Field>
              <Field label="Fix New Position Date"><input className={inp} type="date" value={form.fix_new_position_date} onChange={e => set('fix_new_position_date', e.target.value)} /></Field>
              <Field label="Result">
                <select className={inp} value={form.result_promotion} onChange={e => set('result_promotion', e.target.value)}>
                  <option value="">— belum ada —</option>
                  <option>Passed</option>
                  <option>Not Passed</option>
                </select>
              </Field>
              <Field label="Remarks"><input className={inp} value={form.remarks} onChange={e => set('remarks', e.target.value)} /></Field>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Memproses...' : '💾 Proses ' + pcnType}
            </button>
            <button onClick={() => { setEmp(null); setMsg(null) }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Reset</button>
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