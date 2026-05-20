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

export default function EditEmployeeForm() {
  const [emp, setEmp]       = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)
  const [form, setForm]     = useState({})
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSelect(selected) {
    setEmp(selected)
    setMsg(null)
    if (selected) {
      setForm({
        nip:                  selected.nip                  || '',
        employee_name:        selected.employee_name        || '',
        gender:               selected.gender               || '',
        email:                selected.email                || '',
        id_card:              selected.id_card              || '',
        access_card_number:   selected.access_card_number   || '',
        building_location:    selected.building_location    || '',
        opg:                  selected.opg                  || '',
        project:              selected.project              || '',
        position:             selected.position             || '',
        skill:                selected.skill                || '',
        channel:              selected.channel              || '',
        site:                 selected.site                 || '',
        tl_name:              selected.tl_name              || '',
        spv_name:             selected.spv_name             || '',
        operational_manager:  selected.operational_manager  || '',
        unit_manager:         selected.unit_manager         || '',
        hire_status:          selected.hire_status          || 'New Hire',
        training_batch:       selected.training_batch       || '',
        join_date_company:    selected.join_date_company    ? selected.join_date_company.split('T')[0] : '',
        join_date_project:    selected.join_date_project    ? selected.join_date_project.split('T')[0] : '',
        start_probation:      selected.start_probation      ? selected.start_probation.split('T')[0]   : '',
        end_probation:        selected.end_probation        ? selected.end_probation.split('T')[0]     : '',
        remarks:              selected.remarks              || '',
      })
    }
  }

  async function handleSave() {
    if (!emp) { setMsg({ type: 'error', text: 'Pilih karyawan terlebih dahulu' }); return }
    if (!form.nip || !form.employee_name || !form.opg || !form.project || !form.position) {
      setMsg({ type: 'error', text: 'NIP, Nama, OPG, Project, dan Position wajib diisi' }); return
    }
    setSaving(true); setMsg(null)
    try {
      const body = {
        nip:                form.nip,
        employee_name:      form.employee_name,
        gender:             form.gender               || null,
        email:              form.email                || null,
        id_card:            form.id_card              || null,
        access_card_number: form.access_card_number   || null,
        building_location:  form.building_location    || null,
        opg:                form.opg,
        project:            form.project,
        position:           form.position,
        skill:              form.skill                || null,
        channel:            form.channel              || null,
        site:               form.site                 || null,
        tl_name:            form.tl_name              || null,
        spv_name:           form.spv_name             || null,
        operational_manager:form.operational_manager  || null,
        unit_manager:       form.unit_manager         || null,
        hire_status:        form.hire_status,
        training_batch:     form.training_batch       || null,
        join_date_company:  form.join_date_company    || null,
        join_date_project:  form.join_date_project    || null,
        start_probation:    form.start_probation      || null,
        end_probation:      form.end_probation        || null,
        remarks:            form.remarks              || null,
      }
      const { error } = await supabase.from('hc_active').update(body).eq('id', emp.id)
      if (error) throw error
      setMsg({ type: 'success', text: `✓ Data ${form.employee_name} berhasil diperbarui.` })
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Edit Data Karyawan</h2>
        <p className="text-xs text-gray-400 mt-0.5">Cari karyawan aktif lalu edit datanya.</p>
      </div>

      <SearchEmployee onSelect={handleSelect} />

      {emp && (
        <>
          {/* Identitas */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Data Identitas</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="NIP" required><input className={inp} value={form.nip} onChange={e => set('nip', e.target.value)} /></Field>
              <Field label="Nama Lengkap" required><input className={inp} value={form.employee_name} onChange={e => set('employee_name', e.target.value)} /></Field>
              <Field label="Gender">
                <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">—</option><option>Male</option><option>Female</option>
                </select>
              </Field>
              <Field label="Email"><input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
              <Field label="ID Card (KTP)"><input className={inp} value={form.id_card} onChange={e => set('id_card', e.target.value)} /></Field>
              <Field label="Access Card Number"><input className={inp} value={form.access_card_number} onChange={e => set('access_card_number', e.target.value)} /></Field>
              <Field label="Building Location"><input className={inp} value={form.building_location} onChange={e => set('building_location', e.target.value)} /></Field>
            </div>
          </div>

          {/* Penempatan */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Penempatan</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Unit / OPG" required><input className={inp} value={form.opg} onChange={e => set('opg', e.target.value)} /></Field>
              <Field label="Project" required><input className={inp} value={form.project} onChange={e => set('project', e.target.value)} /></Field>
              <Field label="Position" required><input className={inp} value={form.position} onChange={e => set('position', e.target.value)} /></Field>
              <Field label="Skill"><input className={inp} value={form.skill} onChange={e => set('skill', e.target.value)} /></Field>
              <Field label="Channel"><input className={inp} value={form.channel} onChange={e => set('channel', e.target.value)} /></Field>
              <Field label="Site"><input className={inp} value={form.site} onChange={e => set('site', e.target.value)} /></Field>
            </div>
          </div>

          {/* Reporting line */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Reporting Line</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Team Leader"><input className={inp} value={form.tl_name} onChange={e => set('tl_name', e.target.value)} /></Field>
              <Field label="Supervisor"><input className={inp} value={form.spv_name} onChange={e => set('spv_name', e.target.value)} /></Field>
              <Field label="Operational Manager"><input className={inp} value={form.operational_manager} onChange={e => set('operational_manager', e.target.value)} /></Field>
              <Field label="Unit Manager"><input className={inp} value={form.unit_manager} onChange={e => set('unit_manager', e.target.value)} /></Field>
            </div>
          </div>

          {/* Tanggal & Klasifikasi */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Tanggal & Klasifikasi</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Join Date Company"><input className={inp} type="date" value={form.join_date_company} onChange={e => set('join_date_company', e.target.value)} /></Field>
              <Field label="Join Date Project"><input className={inp} type="date" value={form.join_date_project} onChange={e => set('join_date_project', e.target.value)} /></Field>
              <Field label="Hire Status">
                <select className={inp} value={form.hire_status} onChange={e => set('hire_status', e.target.value)}>
                  <option>New Hire</option><option>From Other PJ</option>
                </select>
              </Field>
              <Field label="Training Batch"><input className={inp} value={form.training_batch} onChange={e => set('training_batch', e.target.value)} /></Field>
              <Field label="Start Probation"><input className={inp} type="date" value={form.start_probation} onChange={e => set('start_probation', e.target.value)} /></Field>
              <Field label="End Probation"><input className={inp} type="date" value={form.end_probation} onChange={e => set('end_probation', e.target.value)} /></Field>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Field label="Remarks">
              <textarea className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full resize-none"
                rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
            </Field>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
            <button onClick={() => { setEmp(null); setMsg(null) }}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              Batal
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