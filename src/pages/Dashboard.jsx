import { useState, useMemo } from 'react'
import { useHcData } from '../hooks/useHcData'
import { calcPeriod } from '../lib/calculations'
import { dts, monthLastDay, MONTH_NAMES, dateToSerial } from '../lib/utils'
import FilterBar from '../components/ui/FilterBar'
import KpiCards from '../components/dashboard/KpiCards'
import AttritionChart from '../components/dashboard/AttritionChart'
import Top10Table from '../components/dashboard/Top10Table'
import SummaryCards from '../components/dashboard/SummaryCards'
import HcMovementTable from '../components/dashboard/HcMovementTable'

export default function Dashboard() {
  const { activeData, logData, loading, error, progress } = useHcData()


  const [fromDate, setFromDate]   = useState('2026-01-01')
  const [untilDate, setUntilDate] = useState('2026-05-31')
  const [filters, setFilters]     = useState({ opg: 'All', proj: 'All', pos: 'All', channel: 'All', skill: 'All', site: 'All' })
  const [applied, setApplied]     = useState(null)

  function handleDisplay() {
    const fd = new Date(fromDate + 'T00:00:00Z')
    const ud = new Date(untilDate + 'T00:00:00Z')
    const fy = fd.getUTCFullYear(), fm = fd.getUTCMonth() + 1, fd_ = fd.getUTCDate()
    const uy = ud.getUTCFullYear(), um = ud.getUTCMonth() + 1, ud_ = ud.getUTCDate()

    const months = []
    let cy = fy, cm = fm
    while (cy < uy || (cy === uy && cm <= um)) {
      const isFirst = cy === fy && cm === fm
      const isLast  = cy === uy && cm === um
      const isSame  = fy === uy && fm === um
      const S = isSame ? dts(cy, cm, fd_) : isFirst ? dts(cy, cm, fd_) : dts(cy, cm, 1)
      const E = isSame ? dts(cy, cm, ud_) : isLast  ? dts(cy, cm, ud_) : dts(cy, cm, monthLastDay(cy, cm))
      const label = isSame
        ? `${MONTH_NAMES[cm-1]} ${cy} (${fd_}–${ud_})`
        : isFirst ? `${MONTH_NAMES[cm-1]} ${cy} (${fd_}–${monthLastDay(cy,cm)})`
        : isLast  ? `${MONTH_NAMES[cm-1]} ${cy} (1–${ud_})`
        :           `${MONTH_NAMES[cm-1]} ${cy}`
      months.push({ S, E, label })
      cm++; if (cm > 12) { cm = 1; cy++ }
      if (months.length > 24) break
    }

    const results = months.map(({ S, E, label }) => ({
      label,
      S, E,
      ...calcPeriod(activeData, logData, S, E, filters)
    }))

    setApplied({ results, fromS: months[0].S, untilS: months[months.length - 1].E })
  }

if (loading) return (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">{progress || 'Memuat data dari Supabase...'}</p>
      <p className="text-xs text-gray-400 mt-1">
        {activeData.length > 0 && `${activeData.length} active · ${logData.length} log dimuat`}
      </p>
    </div>
  </div>
)

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-medium text-red-700">Gagal memuat data</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Dashboard HC</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {activeData.length} karyawan aktif · {logData.length} log history
        </p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Until</label>
            <input type="date" value={untilDate} onChange={e => setUntilDate(e.target.value)}
              className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700" />
          </div>
          <button onClick={handleDisplay}
            className="h-8 px-4 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors self-end">
            Display ↗
          </button>
        </div>
        <FilterBar filters={filters} onChange={setFilters} activeData={activeData} logData={logData} />
      </div>

      {!applied ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">Pilih periode dan klik Display untuk melihat metrik</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <KpiCards results={applied.results} />

          {/* Chart */}
          <AttritionChart results={applied.results} />

          {/* Top 10 + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Top10Table
              activeData={activeData} logData={logData}
              fromS={applied.fromS} untilS={applied.untilS}
              filters={filters}
            />
            <SummaryCards
              logData={logData} activeData={activeData}
              fromS={applied.fromS} untilS={applied.untilS}
            />
          </div>

          {/* Tabel HC Movement per Bulan */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Tabel HC Movement per Bulan</h3>
              <p className="text-xs text-gray-400">Klik baris "Supporting Staff" untuk expand/collapse per posisi</p>
            </div>
            <div className="p-4">
              <HcMovementTable
                results={applied.results}
                filters={filters}
                activeData={activeData}
                logData={logData}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}