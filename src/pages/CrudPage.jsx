import { useState } from 'react'
import NewHireForm   from '../components/crud/NewHireForm'
import ResignForm    from '../components/crud/ResignForm'
import PromoForm     from '../components/crud/PromoForm'
import MutationForm  from '../components/crud/MutationForm'
import EditEmployeeForm from '../components/crud/EditEmployeeForm'

const TABS = [
  { key: 'newhire',  label: '🎓 New Hire (Training)', desc: 'Input karyawan baru masuk training'    },
  { key: 'resign',   label: '🚪 Resign',              desc: 'Proses karyawan resign'                },
  { key: 'promo',    label: '⬆️ Promosi / Demosi',    desc: 'Proses promosi atau demosi karyawan'   },
  { key: 'mutation', label: '🔄 Mutasi',              desc: 'Proses mutasi karyawan antar unit'     },
  { key: 'edit',     label: '✏️ Edit Karyawan',       desc: 'Edit data karyawan aktif'              },
]

export default function CrudPage() {
  const [activeTab, setActiveTab] = useState('newhire')
  const current = TABS.find(t => t.key === activeTab)

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Input / Edit Karyawan</h1>
        <p className="text-sm text-gray-400 mt-0.5">{current?.desc}</p>
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={
              'px-4 py-2 text-xs rounded-lg border transition-colors font-medium ' +
              (activeTab === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {activeTab === 'newhire'  && <NewHireForm />}
        {activeTab === 'resign'   && <ResignForm />}
        {activeTab === 'promo'    && <PromoForm />}
        {activeTab === 'mutation' && <MutationForm />}
        {activeTab === 'edit'     && <EditEmployeeForm />}
      </div>
    </div>
  )
}