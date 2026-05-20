import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const TRAINING_STATUS = ['On Training', 'Passed', 'Not Passed']

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

const inp = "h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
const sel = inp

export default function NewHireForm() {
  const [status, setStatus] = useState('On Training')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState(null)

  const [form, setForm] = useState({
    nip: '', employee_name: '', gender: '', email: '', id_card: '',
    opg: '', project: '', position: 'Agent', skill: '', channel: '', site: '',
    tl_name: '', spv_name: '', operational_manager: '', unit_manager: '',
    join_date_company: '', training_start_date: '', training_end_date: '',
    training_batch: '', hire_status: 'New Hire',
    passed_date: '', join_date_project: '',
    not_passed_date: '', not_passed_reason: '', remarks: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.nip || !form.employee_name || !form.opg || !form.project || !form.join_date_company || !form.training_start_date) {
      setMsg({ type: 'error', text: 'Field bertanda * wajib diisi' })
      return
    }
    if (status === 'Passed' && !form.join_date_project) {
      setMsg({ type: 'error', text: 'Join Date Project wajib diisi untuk status Passed' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      // Insert ke hc_training
      const trainingBody = {
        nip: form.nip, employee_name: form.employee_name,
        gender: form.gender || null, email: form.email || null, id_card: form.id_card || null,
        opg: form.opg, project: form.project,
        position: form.position || 'Agent',
        skill: form.skill || null, channel: form.channel || null, site: form.site || null,
        tl_name: form.tl_name || null, spv_name: form.spv_name || null,
        operational_manager: form.operational_manager || null, unit_manager: form.unit_manager || null,
        join_date_company: form.join_date_company,
        training_start_date: form.training_start_date,
        training_end_date: form.training_end_date || null,
        training_batch: form.training_batch || null,
        hire_status: form.hire_status,
        training_status: status,
        passed_date: form.passed_date || null,
        join_date_project: form.join_date_project || null,
        not_passed_date: form.not_passed_date || null,
        not_passed_reason: form.not_passed_reason || null,
        remarks: form.remarks || null,
      }
      const { error: e1 } = await supabase.from('hc_training').insert(trainingBody)
      if (e1) throw e1

      // Kalau Passed → insert ke hc_active
      if (status === 'Passed') {
        const activeBody = {
          nip: form.nip, employee_name: form.employee_name,
          gender: form.gender || null, email: form.email || null, id_card: form.id_card || null,
          opg: form.opg, project: form.project,
          position: form.position || 'Agent',
          skill: form.skill || null, channel: form.channel || null, site: form.site || null,
          tl_name: form.tl_name || null, spv_name: form.spv_name || null,
          operational_manager: form.operational_manager || null, unit_manager: form.unit_manager || null,
          join_date_company: form.join_date_company,
          join_date_project: form.join_date_project,
          pcn_type: 'Active', hire_status: form.hire_status,
          training_batch: form.training_batch || null,
          remarks: form.remarks || null,
        }
        const { error: e2 } = await supabase.from('hc_active').insert(activeBody)
        if (e2) throw e2
        setMsg({ type: 'success', text: `✓ Disimpan ke Training Bucket & ditambahkan ke HC Aktif sebagai karyawan Passed` })
      } else {
        setMsg({ type: 'success', text: `✓ Disimpan ke Training Bucket dengan status "${status}"` })
      }

      // Reset form
      setForm({
        nip: '', employee_name: '', gender: '', email: '', id_card: '',
        opg: '', project: '', position: 'Agent', skill: '', channel: '', site: '',
        tl_name: '', spv_name: '', operational_manager: '', unit_manager: '',
        join_date_company: '', training_start_date: '', training_end_date: '',
        training_batch: '', hire_status: 'New Hire',
        passed_date: '', join_date_project: '',
        not_passed_date: '', not_passed_reason: '', remarks: ''
      })
      setStatus('On Training')
    } catch (err) {
      setMsg({ type: 'error', text: 'Error: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Input New Hire — Training</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Karyawan baru masuk training terlebih dahulu. Belum dihitung sebagai HC aktif sampai Passed.
        </p>
      </div>

      {/* Status Training */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Status Training</p>
        <div className="flex gap-2">
          {TRAINING_STATUS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                status === s
                  ? s === 'On Training' ? 'bg-blue-600 text-white border-blue-600'
                  : s === 'Passed'      ? 'bg-green-600 text-white border-green-600'
                  :                       'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {s === 'On Training' ? '🎓 On Training' : s === 'Passed' ? '✅ Passed' : '❌ Not Passed'}
            </button>
          ))}
        </div>
      </div>

      {/* Data Karyawan */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Data Karyawan</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="NIP Sementara" required>
            <input className={inp} value={form.nip} onChange={e => set('nip', e.target.value)} placeholder="contoh: 2260001" />
          </Field>
          <Field label="Nama Lengkap" required>
            <input className={inp} value={form.employee_name} onChange={e => set('employee_name', e.target.value)} placeholder="Nama karyawan" />
          </Field>
          <Field label="Gender">
            <select className={sel} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">— pilih —</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </Field>
          <Field label="Email">
            <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@company.com" />
          </Field>
          <Field label="ID Card (KTP)">
            <input className={inp} value={form.id_card} onChange={e => set('id_card', e.target.value)} placeholder="No KTP" />
          </Field>
          <Field label="Hire Status">
            <select className={sel} value={form.hire_status} onChange={e => set('hire_status', e.target.value)}>
              <option>New Hire</option>
              <option>From Other PJ</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Penempatan */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Penempatan Target (jika Passed)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Unit / OPG" required>
            <input className={inp} value={form.opg} onChange={e => set('opg', e.target.value)} placeholder="Unit-1 OPG-1" />
          </Field>
          <Field label="Project" required>
            <input className={inp} value={form.project} onChange={e => set('project', e.target.value)} placeholder="Projects As" />
          </Field>
          <Field label="Position">
            <input className={inp} value={form.position} onChange={e => set('position', e.target.value)} />
          </Field>
          <Field label="Skill">
            <input className={inp} value={form.skill} onChange={e => set('skill', e.target.value)} placeholder="Bahasa" />
          </Field>
          <Field label="Channel">
            <input className={inp} value={form.channel} onChange={e => set('channel', e.target.value)} placeholder="Call" />
          </Field>
          <Field label="Site">
            <input className={inp} value={form.site} onChange={e => set('site', e.target.value)} placeholder="CCS Jakarta" />
          </Field>
          <Field label="Team Leader">
            <input className={inp} value={form.tl_name} onChange={e => set('tl_name', e.target.value)} />
          </Field>
          <Field label="Supervisor">
            <input className={inp} value={form.spv_name} onChange={e => set('spv_name', e.target.value)} />
          </Field>
          <Field label="Operational Manager">
            <input className={inp} value={form.operational_manager} onChange={e => set('operational_manager', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Tanggal */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Tanggal</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Join Date Company" required>
            <input className={inp} type="date" value={form.join_date_company} onChange={e => set('join_date_company', e.target.value)} />
          </Field>
          <Field label="Training Start Date" required>
            <input className={inp} type="date" value={form.training_start_date} onChange={e => set('training_start_date', e.target.value)} />
          </Field>
          <Field label="Training End Date (estimasi)">
            <input className={inp} type="date" value={form.training_end_date} onChange={e => set('training_end_date', e.target.value)} />
          </Field>
          <Field label="Training Batch">
            <input className={inp} value={form.training_batch} onChange={e => set('training_batch', e.target.value)} placeholder="Batch 01/2026" />
          </Field>
        </div>
      </div>

      {/* Hasil Training — muncul hanya kalau bukan On Training */}
      {status !== 'On Training' && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Hasil Training
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status === 'Passed' && (
              <>
                <Field label="Passed Date">
                  <input className={inp} type="date" value={form.passed_date} onChange={e => set('passed_date', e.target.value)} />
                </Field>
                <Field label="Join Date Project" required>
                  <input className={inp} type="date" value={form.join_date_project} onChange={e => set('join_date_project', e.target.value)} />
                </Field>
              </>
            )}
            {status === 'Not Passed' && (
              <>
                <Field label="Not Passed Date">
                  <input className={inp} type="date" value={form.not_passed_date} onChange={e => set('not_passed_date', e.target.value)} />
                </Field>
                <Field label="Alasan Not Passed">
                  <input className={inp} value={form.not_passed_reason} onChange={e => set('not_passed_reason', e.target.value)} placeholder="Alasan..." />
                </Field>
              </>
            )}
          </div>
        </div>
      )}

      {/* Remarks */}
      <div>
        <Field label="Remarks">
          <textarea
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full resize-none"
            rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)}
          />
        </Field>
      </div>

      {/* Tombol */}
      <div className="flex gap-3 items-center pt-2">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? 'Menyimpan...' : '💾 Simpan'}
        </button>
        <button onClick={() => {
          setForm({ nip:'',employee_name:'',gender:'',email:'',id_card:'',opg:'',project:'',position:'Agent',skill:'',channel:'',site:'',tl_name:'',spv_name:'',operational_manager:'',unit_manager:'',join_date_company:'',training_start_date:'',training_end_date:'',training_batch:'',hire_status:'New Hire',passed_date:'',join_date_project:'',not_passed_date:'',not_passed_reason:'',remarks:''})
          setStatus('On Training')
          setMsg(null)
        }}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
          Reset
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}
    </div>
  )
}