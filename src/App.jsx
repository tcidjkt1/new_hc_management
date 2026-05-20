import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import EmployeeList from './pages/EmployeeList'
import TrainingList from './pages/TrainingList'
import CrudPage from './pages/CrudPage'

const navItems = [
  { to: '/',           label: '📊 Dashboard'      },
  { to: '/employees',  label: '👥 Data Karyawan'   },
  { to: '/training',   label: '🎓 Training'         },
  { to: '/crud',       label: '✏️ Input / Edit'     },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-200">
            <h1 className="text-sm font-bold text-gray-800">HC Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">Human Capital Dashboard</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  'block px-3 py-2 rounded-lg text-sm transition-colors ' +
                  (isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-400">v1.0.0</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/training"  element={<TrainingList />} />
            <Route path="/crud"      element={<CrudPage />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  )
}