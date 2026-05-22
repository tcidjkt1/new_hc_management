import { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useHcData } from '../hooks/useHcData'
import { calcPeriod, calcTop10 } from '../lib/calculations'
import { dts, monthLastDay, MONTH_NAMES, dateToSerial } from '../lib/utils'
import { supabase } from '../lib/supabase'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend,
)

const isAgent = pos => (pos || '').toLowerCase().includes('agent')
const fmtPct  = v  => `${(v  || 0).toFixed(2)}%`
const fmtNum  = v  => (v  ?? 0).toLocaleString('id-ID')

const OPG_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#84cc16','#ec4899','#14b8a6','#f43f5e']

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, alert = false, delta = null, lowerIsBetter = false, isPct = false }) {
  const better     = delta === null || delta === 0 ? null : (lowerIsBetter ? delta < 0 : delta > 0)
  const deltaColor = better === null ? 'text-gray-400' : better ? 'text-green-600' : 'text-red-600'
  const arrow      = delta === null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '—'
  const absDelta   = delta !== null ? Math.abs(delta) : null
  return (
    <div className={`bg-white border rounded-xl p-4 ${alert ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500 leading-tight">{title}</p>
      <p className={`text-xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
      {delta !== null && (
        <p className={`text-xs mt-1 ${deltaColor}`}>
          {arrow}{absDelta != null ? ' ' + (isPct ? absDelta.toFixed(2) + '%' : absDelta.toLocaleString('id-ID')) : ''} vs periode lalu
        </p>
      )}
    </div>
  )
}

// ── Dropdown helper ───────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 min-w-[110px]"
      >
        {options.map(opt => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExecutiveOverview() {
  const { activeData, logData, loading, error } = useHcData()
  const [trainingData, setTrainingData] = useState([])

  useEffect(() => {
    supabase.from('hc_training').select('*')
      .then(({ data }) => { if (data) setTrainingData(data) })
      .catch(() => {})
  }, [])

  // ── Today ─────────────────────────────────────────────────────────────────
  const today  = useMemo(() => new Date(), [])
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1

  // ── Filter state (pending — changes on input) ─────────────────────────────
  const [selYear,    setSelYear]    = useState(todayY)
  const [selMonth,   setSelMonth]   = useState(todayM) // 1–12 or 'ytd'
  const [selOpg,     setSelOpg]     = useState('All')
  const [selProject, setSelProject] = useState('All')
  const [selSite,    setSelSite]    = useState('All')

  // Applied filter — only updates on button click
  const [applied, setApplied] = useState({
    year: todayY, month: todayM, opg: 'All', project: 'All', site: 'All',
  })

  function handleApply() {
    setApplied({ year: selYear, month: selMonth, opg: selOpg, project: selProject, site: selSite })
  }

  function handleOPGChange(v) { setSelOpg(v); setSelProject('All') }

  // ── Dropdown options (derived from data in memory) ────────────────────────
  const yearOpts = useMemo(() => {
    const yrs = new Set()
    ;[...activeData, ...logData].forEach(r => {
      ;[r.join_date_project, r.effective_resign_date].forEach(d => {
        if (d) { const y = new Date(d).getFullYear(); if (y > 2000 && y < 2100) yrs.add(y) }
      })
    })
    return [...yrs].sort((a, b) => b - a)
  }, [activeData, logData])

  const opgOpts = useMemo(() => {
    const vals = [...new Set([...activeData, ...logData].map(r => r.opg).filter(Boolean))].sort()
    return ['All', ...vals]
  }, [activeData, logData])

  const projOpts = useMemo(() => {
    const src = selOpg === 'All'
      ? [...activeData, ...logData]
      : [...activeData, ...logData].filter(r => r.opg === selOpg)
    const vals = [...new Set(src.map(r => r.project).filter(Boolean))].sort()
    return ['All', ...vals]
  }, [activeData, logData, selOpg])

  const siteOpts = useMemo(() => {
    const vals = [...new Set(activeData.map(r => r.site).filter(Boolean))].sort()
    return ['All', ...vals]
  }, [activeData])

  const monthOpts = [
    ...MONTH_NAMES.map((label, i) => ({ value: i + 1, label })),
    { value: 'ytd', label: 'All (YTD)' },
  ]

  // ── Date ranges from applied ───────────────────────────────────────────────
  const dates = useMemo(() => {
    const ay = applied.year
    const am = applied.month
    if (am === 'ytd') {
      return {
        periS: dts(ay, 1, 1), periE: dts(ay, 12, 31),
        prevS: dts(ay - 1, 1, 1), prevE: dts(ay - 1, 12, 31),
        refM: 12, refY: ay, isYtd: true,
      }
    }
    const pm = am === 1 ? 12 : am - 1
    const py = am === 1 ? ay - 1 : ay
    return {
      periS: dts(ay, am, 1), periE: dts(ay, am, monthLastDay(ay, am)),
      prevS: dts(py, pm, 1), prevE: dts(py, pm, monthLastDay(py, pm)),
      refM: am, refY: ay, isYtd: false,
    }
  }, [applied])

  const appliedFilters = useMemo(() => ({
    opg: applied.opg, proj: applied.project, site: applied.site,
  }), [applied])

  const ready = activeData.length > 0

  // ── Core calculations ─────────────────────────────────────────────────────
  const periCalc = useMemo(() =>
    ready ? calcPeriod(activeData, logData, dates.periS, dates.periE, appliedFilters) : null
  , [ready, activeData, logData, dates, appliedFilters])

  const prevCalc = useMemo(() =>
    ready ? calcPeriod(activeData, logData, dates.prevS, dates.prevE, appliedFilters) : null
  , [ready, activeData, logData, dates, appliedFilters])

  const ytdCalc = useMemo(() => {
    if (!ready) return null
    const ytdS = dts(applied.year, 1, 1)
    return calcPeriod(activeData, logData, ytdS, dates.periE, appliedFilters)
  }, [ready, activeData, logData, dates, applied, appliedFilters])

  // ── HC counts ─────────────────────────────────────────────────────────────
  const totalHC    = activeData.filter(r => r.pcn_type === 'Active').length
  const filteredHC = periCalc?.endingHC ?? 0
  const hasFilter  = applied.opg !== 'All' || applied.project !== 'All' || applied.site !== 'All'

  // ── Training (filtered by opg + project) ─────────────────────────────────
  const trainingCounts = useMemo(() => {
    const c = { 'On Training': 0, 'Passed': 0, 'Not Passed': 0, 'Resigned': 0 }
    trainingData
      .filter(r =>
        (applied.opg     === 'All' || r.opg     === applied.opg)     &&
        (applied.project === 'All' || r.project === applied.project)
      )
      .forEach(r => { const s = r.training_status || ''; if (c[s] !== undefined) c[s]++ })
    return c
  }, [trainingData, applied])

  // ── 12-month trend ────────────────────────────────────────────────────────
  const trend12 = useMemo(() => {
    if (!ready) return []
    return Array.from({ length: 12 }, (_, i) => {
      const offset = 11 - i
      let tm = dates.refM - offset, ty = dates.refY
      while (tm <= 0) { tm += 12; ty-- }
      const S = dts(ty, tm, 1)
      const E = dts(ty, tm, monthLastDay(ty, tm))
      const r = calcPeriod(activeData, logData, S, E, appliedFilters)
      return { label: `${MONTH_NAMES[tm - 1]} '${String(ty).slice(2)}`, ...r }
    })
  }, [ready, activeData, logData, dates, appliedFilters])

  // ── Top 5 — groupBy depends on filter depth ───────────────────────────────
  const top5 = useMemo(() => {
    if (!ready) return []
    const groupBy = applied.project !== 'All' ? 'position' : 'project'
    return calcTop10(activeData, logData, dates.periS, dates.periE, appliedFilters, groupBy).slice(0, 5)
  }, [ready, activeData, logData, dates, appliedFilters, applied.project])

  const top5Label = applied.project !== 'All' ? 'Top 5 Position' : 'Top 5 Project'

  // ── Resign analysis YTD — voluntary/involuntary from ytdCalc, tenure from raw ──
  const resignAnalysis = useMemo(() => {
    const ytdS = dts(applied.year, 1, 1)
    const resigns = logData.filter(r => {
      const e = dateToSerial(r.effective_resign_date)
      if (!e || e < ytdS || e > dates.periE) return false
      if (applied.opg     !== 'All' && r.opg     !== applied.opg)     return false
      if (applied.project !== 'All' && r.project !== applied.project) return false
      if (applied.site    !== 'All' && r.site    !== applied.site)    return false
      return r.pcn_type === 'Resign'
    })
    const tenure = { lt3: 0, t3to6: 0, t6to12: 0, gt12: 0 }
    resigns.forEach(r => {
      const e = dateToSerial(r.effective_resign_date)
      const j = dateToSerial(r.join_date_project)
      if (!e || !j) return
      const months = (e - j) / 30.44
      if      (months < 3)  tenure.lt3++
      else if (months < 6)  tenure.t3to6++
      else if (months < 12) tenure.t6to12++
      else                  tenure.gt12++
    })
    const voluntary   = (ytdCalc?.agent.extVoluntary   || 0) + (ytdCalc?.supp.extVoluntary   || 0)
    const involuntary = (ytdCalc?.agent.extInvoluntary || 0) + (ytdCalc?.supp.extInvoluntary || 0)
    return { voluntary, involuntary, total: ytdCalc?.totalExt || 0, tenure }
  }, [logData, applied, dates, ytdCalc])

  // ── HC composition (by OPG when All, by Project when OPG selected) ────────
  const hcComposition = useMemo(() => {
    const groupKey = applied.opg !== 'All' ? 'project' : 'opg'
    const filtered = activeData.filter(r =>
      (applied.opg     === 'All' || r.opg     === applied.opg)     &&
      (applied.project === 'All' || r.project === applied.project) &&
      (applied.site    === 'All' || r.site    === applied.site)
    )
    const c = {}
    filtered.forEach(r => { const k = r[groupKey] || 'Unknown'; c[k] = (c[k] || 0) + 1 })
    return { data: c, chartLabel: applied.opg !== 'All' ? 'by Project' : 'by Unit/OPG' }
  }, [activeData, applied])

  // ── Agent vs Support — derived from calcPeriod results ───────────────────
  const agentCount = periCalc?.agent.endingHC ?? 0
  const suppCount  = periCalc?.supp.endingHC  ?? 0

  // ── Top 5 by Project helpers ──────────────────────────────────────────────
  const projFilter = r =>
    (applied.opg  === 'All' || r.opg  === applied.opg) &&
    (applied.site === 'All' || r.site === applied.site)

  const top5ByHC = useMemo(() => {
    if (!ready) return []
    const counts = {}
    activeData.filter(r => r.pcn_type === 'Active' && projFilter(r))
      .forEach(r => { const k = r.project || 'Unknown'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([name, v]) => ({ name, v }))
      .sort((a, b) => b.v - a.v).slice(0, 5)
  }, [ready, activeData, applied])

  const top5ByNH = useMemo(() => {
    if (!ready) return []
    const counts = {}
    const inP = r => { const j = dateToSerial(r.join_date_project); return j !== null && j >= dates.periS && j <= dates.periE }
    const NH_TYPES = ['New Hire', 'From Other PJ']
    activeData.filter(r => NH_TYPES.includes(r.hire_status) && r.pcn_type === 'Active' && inP(r) && projFilter(r))
      .forEach(r => { const k = r.project || 'Unknown'; counts[k] = (counts[k] || 0) + 1 })
    logData.filter(r => NH_TYPES.includes(r.hire_status) &&
      ['Resign','Promotion Out Of PJ','Demotion Out Of PJ','Mutation'].includes(r.pcn_type) &&
      inP(r) && projFilter(r))
      .forEach(r => { const k = r.project || 'Unknown'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([name, v]) => ({ name, v }))
      .sort((a, b) => b.v - a.v).slice(0, 5)
  }, [ready, activeData, logData, applied, dates])

  const top5ByAttr = useMemo(() => {
    if (!ready) return []
    const counts = {}
    logData.filter(r => {
      const e = dateToSerial(r.effective_resign_date)
      return r.pcn_type === 'Resign' && e !== null && e >= dates.periS && e <= dates.periE && projFilter(r)
    }).forEach(r => { const k = r.project || 'Unknown'; counts[k] = (counts[k] || 0) + 1 })
    return Object.entries(counts).map(([name, v]) => ({ name, v }))
      .sort((a, b) => b.v - a.v).slice(0, 5)
  }, [ready, logData, applied, dates])

  // ── Risk ──────────────────────────────────────────────────────────────────
  const riskProjects = top5.filter(p => p.pct > 5)
  const alertRisk    = riskProjects.length > 0
  const riskScopeLabel = applied.project !== 'All' ? 'Posisi' : 'Project'

  // ── Period display labels ─────────────────────────────────────────────────
  const periLabel = applied.month === 'ytd'
    ? `YTD ${applied.year}`
    : `${MONTH_NAMES[applied.month - 1]} ${applied.year}`

  const prevLabel = applied.month === 'ytd'
    ? String(applied.year - 1)
    : MONTH_NAMES[(applied.month - 2 + 12) % 12]

  // ── Chart: Trend Starting HC vs Ending HC 12 bulan ──────────────────────
  const trendChartData = {
    labels: trend12.map(r => r.label),
    datasets: [
      {
        label: 'Starting HC',
        data: trend12.map(r => r.startingHC),
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.08)',
        pointBackgroundColor: 'rgb(59,130,246)',
        borderWidth: 2, fill: false, tension: 0.3, order: 1,
      },
      {
        label: 'Ending HC',
        data: trend12.map(r => r.endingHC),
        borderColor: 'rgb(168,85,247)',
        backgroundColor: 'rgba(168,85,247,0.08)',
        pointBackgroundColor: 'rgb(168,85,247)',
        borderWidth: 2, fill: false, tension: 0.3, order: 1,
      },
      {
        label: 'Gap (End − Start)',
        data: trend12.map(r => r.endingHC - r.startingHC),
        borderColor: 'rgba(0,0,0,0)',
        backgroundColor: trend12.map(r =>
          r.endingHC >= r.startingHC ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'
        ),
        type: 'bar',
        yAxisID: 'y1',
        order: 2,
      },
    ],
  }
  const trendChartOpts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 12 } },
      tooltip: {
        callbacks: {
          afterBody: items => {
            const start = items.find(i => i.dataset.label === 'Starting HC')?.raw ?? null
            const end   = items.find(i => i.dataset.label === 'Ending HC')?.raw ?? null
            if (start !== null && end !== null) {
              const gap = end - start
              return [`Gap: ${gap >= 0 ? '+' : ''}${gap}`]
            }
            return []
          },
        },
      },
    },
    scales: {
      y:  {
        type: 'linear', position: 'left', beginAtZero: false,
        ticks: { font: { size: 9 } },
        title: { display: true, text: 'Headcount', font: { size: 9 } },
      },
      y1: {
        type: 'linear', position: 'right', beginAtZero: false,
        ticks: { font: { size: 9 }, callback: v => (v >= 0 ? '+' : '') + v },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Gap', font: { size: 9 } },
      },
    },
  }

  // ── Chart: Donuts ─────────────────────────────────────────────────────────
  const donutOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } },
  }

  const tenureChartData = {
    labels: ['< 3 Bln', '3–6 Bln', '6–12 Bln', '> 1 Thn'],
    datasets: [{ data: [resignAnalysis.tenure.lt3, resignAnalysis.tenure.t3to6, resignAnalysis.tenure.t6to12, resignAnalysis.tenure.gt12], backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e'], borderWidth: 1 }],
  }

  const compLabels = Object.keys(hcComposition.data)
  const compChartData = {
    labels: compLabels,
    datasets: [{ data: compLabels.map(k => hcComposition.data[k]), backgroundColor: compLabels.map((_, i) => OPG_COLORS[i % OPG_COLORS.length]), borderWidth: 1 }],
  }

  const levelChartData = {
    labels: ['Agent', 'Supporting Staff'],
    datasets: [{ data: [agentCount, suppCount], backgroundColor: ['#3b82f6','#f59e0b'], borderWidth: 1 }],
  }

  const TRAIN_KEYS   = ['On Training','Passed','Not Passed','Resigned']
  const TRAIN_COLORS = ['#3b82f6','#22c55e','#ef4444','#9ca3af']
  const trainingChartData = {
    labels: TRAIN_KEYS,
    datasets: [{ data: TRAIN_KEYS.map(s => trainingCounts[s] || 0), backgroundColor: TRAIN_COLORS, borderWidth: 1 }],
  }

  // ── MoM table ─────────────────────────────────────────────────────────────
  const momRows = [
    { label: 'Starting HC', prev: prevCalc?.startingHC, curr: periCalc?.startingHC, lowerIsBetter: false },
    { label: 'Ending HC',   prev: prevCalc?.endingHC,   curr: periCalc?.endingHC,   lowerIsBetter: false },
    { label: 'New Hire',    prev: prevCalc?.totalNH,    curr: periCalc?.totalNH,    lowerIsBetter: false },
    { label: 'Resign',      prev: prevCalc?.totalExt,   curr: periCalc?.totalExt,   lowerIsBetter: true  },
    { label: 'Attrition %', prev: prevCalc?.attrPct,    curr: periCalc?.attrPct,    lowerIsBetter: true,  isPct: true },
  ]
  const momDelta = (p, c) => c != null && p != null ? c - p : null
  const momArrow = dv => dv === null ? '—' : dv > 0 ? '▲' : dv < 0 ? '▼' : '—'
  const momColor = (dv, lib) => {
    if (dv === null || dv === 0) return 'text-gray-400'
    return (lib ? dv < 0 : dv > 0) ? 'text-green-600' : 'text-red-600'
  }

  // ── Filter badge text ─────────────────────────────────────────────────────
  const badgeParts = [
    applied.opg     !== 'All' ? applied.opg     : null,
    applied.project !== 'All' ? applied.project : null,
    applied.site    !== 'All' ? applied.site    : null,
  ].filter(Boolean)
  const filterBadge = `${badgeParts.length ? badgeParts.join(' › ') : 'Semua Data'} | ${periLabel}`

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Memuat data Executive Overview...</p>
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
    <div className="p-6 space-y-5 bg-gray-50 min-h-full">

      {/* A) Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Executive Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            &nbsp;·&nbsp;Total HC: <b className="text-gray-600">{totalHC.toLocaleString('id-ID')}</b>
            &nbsp;·&nbsp;Ending HC ({periLabel}): <b className={hasFilter ? 'text-blue-600' : 'text-gray-600'}>{filteredHC.toLocaleString('id-ID')}</b>
          </p>
        </div>
        {alertRisk && (
          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 border border-red-300 text-xs font-semibold px-3 py-1.5 rounded-full">
            ⚠ {riskProjects.length} {riskScopeLabel} Risiko Tinggi
          </span>
        )}
      </div>

      {/* Filter Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect
            label="Year"
            value={selYear}
            onChange={v => setSelYear(Number(v))}
            options={yearOpts.length ? yearOpts : [todayY]}
          />
          <FilterSelect
            label="Month"
            value={selMonth}
            onChange={v => setSelMonth(v === 'ytd' ? 'ytd' : Number(v))}
            options={monthOpts}
          />
          <FilterSelect
            label="Unit / OPG"
            value={selOpg}
            onChange={handleOPGChange}
            options={opgOpts}
          />
          <FilterSelect
            label="Project"
            value={selProject}
            onChange={setSelProject}
            options={projOpts}
          />
          <FilterSelect
            label="Site"
            value={selSite}
            onChange={setSelSite}
            options={siteOpts.length ? ['All', ...siteOpts.filter(s => s !== 'All')] : ['All']}
          />
          <button
            onClick={handleApply}
            className="h-9 px-6 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors self-end"
          >
            Terapkan Filter ↗
          </button>
        </div>
        <div className="mt-2">
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1">
            Menampilkan data: {filterBadge}
          </span>
        </div>
      </div>

      {/* B) 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title={`Attrition % ${dates.isYtd ? 'YTD' : 'Bulan Ini'}`}
          value={fmtPct(periCalc?.attrPct)}
          alert={(periCalc?.attrPct || 0) > 5}
          delta={momDelta(prevCalc?.attrPct, periCalc?.attrPct)}
          lowerIsBetter isPct
        />
        <KpiCard
          title="Attrition % YTD"
          value={fmtPct(ytdCalc?.attrPct)}
          alert={(ytdCalc?.attrPct || 0) > 5}
        />
        <KpiCard
          title={`Total Resign ${dates.isYtd ? 'YTD' : 'Bulan Ini'}`}
          value={fmtNum(periCalc?.totalExt)}
          delta={momDelta(prevCalc?.totalExt, periCalc?.totalExt)}
          lowerIsBetter
        />
        <KpiCard
          title={`New Hire ${dates.isYtd ? 'YTD' : 'Bulan Ini'}`}
          value={fmtNum(periCalc?.totalNH)}
          delta={momDelta(prevCalc?.totalNH, periCalc?.totalNH)}
        />
        <KpiCard
          title="Net HC Change"
          value={(() => {
            const n = (periCalc?.totalNH || 0) - (periCalc?.totalExt || 0)
            return (n >= 0 ? '+' : '') + n.toLocaleString('id-ID')
          })()}
          alert={((periCalc?.totalNH || 0) - (periCalc?.totalExt || 0)) < 0}
        />
        <KpiCard title="On Training" value={fmtNum(trainingCounts['On Training'])} />
      </div>

      {/* C) Trend Starting HC vs Ending HC */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Starting HC vs Ending HC — 12 Bulan s/d {periLabel}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Bar hijau = HC bertambah · Bar merah = HC berkurang
            </p>
          </div>
        </div>
        <div style={{ height: 250 }}>
          <Bar data={trendChartData} options={trendChartOpts} />
        </div>
      </div>

      {/* D) Top 5 + Resign Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 5 Attrition */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {top5Label} Attrition ({periLabel})
          </h3>
          <div className="space-y-3">
            {top5.length === 0 && <p className="text-xs text-gray-400">Tidak ada data pada periode ini.</p>}
            {top5.map((p, i) => {
              const barColor   = p.pct > 10 ? 'bg-red-500' : p.pct > 5 ? 'bg-orange-400' : 'bg-blue-400'
              const labelColor = p.pct > 10 ? 'text-red-600' : p.pct > 5 ? 'text-orange-500' : 'text-blue-600'
              return (
                <div key={p.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0 ml-2">
                      <span>SHC: <b className="text-gray-600">{p.shc}</b></span>
                      <span>Resign: <b className="text-gray-600">{p.resign}</b></span>
                      <span className={`font-bold ${labelColor}`}>{fmtPct(p.pct)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(p.pct * 6, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resign Analysis YTD */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Analisis Resign YTD {applied.year}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Voluntary</p>
              <p className="text-2xl font-bold text-orange-600">{resignAnalysis.voluntary}</p>
              <p className="text-xs text-gray-400">Employee Matter</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Involuntary</p>
              <p className="text-2xl font-bold text-red-600">{resignAnalysis.involuntary}</p>
              <p className="text-xs text-gray-400">Company Matter</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mb-2">Resign by Tenure (YTD)</p>
          <div style={{ height: 150 }}>
            <Doughnut data={tenureChartData} options={donutOpts} />
          </div>
        </div>
      </div>

      {/* D2) Top 5 by Project — HC, New Hire, Attrition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top 5 by Total HC */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top 5 Project — Total HC</h3>
          <p className="text-xs text-gray-400 mb-4">Ending HC aktif saat ini</p>
          {top5ByHC.length === 0
            ? <p className="text-xs text-gray-400">Tidak ada data.</p>
            : top5ByHC.map((p, i) => {
                const max = top5ByHC[0].v || 1
                return (
                  <div key={p.name} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 ml-2 flex-shrink-0">{p.v.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(p.v / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* Top 5 by New Hire */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top 5 Project — New Hire</h3>
          <p className="text-xs text-gray-400 mb-4">Total NH masuk periode {periLabel}</p>
          {top5ByNH.length === 0
            ? <p className="text-xs text-gray-400">Tidak ada data.</p>
            : top5ByNH.map((p, i) => {
                const max = top5ByNH[0].v || 1
                return (
                  <div key={p.name} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-bold text-green-600 ml-2 flex-shrink-0">{p.v.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(p.v / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* Top 5 by Attrition (resign count) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top 5 Project — Attrition</h3>
          <p className="text-xs text-gray-400 mb-4">Total resign periode {periLabel}</p>
          {top5ByAttr.length === 0
            ? <p className="text-xs text-gray-400">Tidak ada data.</p>
            : top5ByAttr.map((p, i) => {
                const max = top5ByAttr[0].v || 1
                const color = p.v >= 5 ? 'bg-red-500' : p.v >= 3 ? 'bg-orange-400' : 'bg-yellow-400'
                const textColor = p.v >= 5 ? 'text-red-600' : p.v >= 3 ? 'text-orange-500' : 'text-yellow-600'
                return (
                  <div key={p.name} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-700 truncate">{p.name}</span>
                      </div>
                      <span className={`text-xs font-bold ml-2 flex-shrink-0 ${textColor}`}>{p.v.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${(p.v / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* E) Tiga Kolom: Komposisi | Level+Training | MoM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* HC Composition (OPG or Project) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Komposisi HC {hcComposition.chartLabel}
          </h3>
          <div style={{ height: 180 }}>
            <Doughnut data={compChartData} options={donutOpts} />
          </div>
          <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
            {compLabels.map((k, i) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: OPG_COLORS[i % OPG_COLORS.length] }} />
                  <span className="truncate max-w-[130px]">{k}</span>
                </span>
                <span className="font-semibold text-gray-700">{hcComposition.data[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent/Support + Training Pipeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Agent vs Supporting Staff</h3>
            <div style={{ height: 140 }}>
              <Doughnut data={levelChartData} options={donutOpts} />
            </div>
            <div className="flex justify-around mt-2 text-center">
              <div>
                <p className="text-blue-600 font-bold text-lg leading-none">{agentCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Agent</p>
              </div>
              <div>
                <p className="text-amber-600 font-bold text-lg leading-none">{suppCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Supporting</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Training Pipeline</h3>
            <div style={{ height: 140 }}>
              <Doughnut data={trainingChartData} options={donutOpts} />
            </div>
          </div>
        </div>

        {/* Month-over-Month */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {dates.isYtd ? 'Year-over-Year' : 'Month-over-Month'}
          </h3>
          <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
            <span>Item</span>
            <div className="flex gap-2">
              <span className="w-14 text-right">{prevLabel}</span>
              <span className="w-16 text-center">Perubahan</span>
              <span className="w-14 text-right">{periLabel}</span>
            </div>
          </div>
          <div>
            {momRows.map(row => {
              const dv = momDelta(row.prev, row.curr)
              return (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-600">{row.label}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-14 text-right">
                      {row.prev != null ? (row.isPct ? fmtPct(row.prev) : fmtNum(row.prev)) : '—'}
                    </span>
                    <span className={`w-16 text-center font-medium ${momColor(dv, row.lowerIsBetter)}`}>
                      {momArrow(dv)}{dv !== null && dv !== 0
                        ? ' ' + (row.isPct ? Math.abs(dv).toFixed(2) + '%' : Math.abs(dv).toLocaleString('id-ID'))
                        : ''}
                    </span>
                    <span className="font-semibold text-gray-800 w-14 text-right">
                      {row.curr != null ? (row.isPct ? fmtPct(row.curr) : fmtNum(row.curr)) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* F) Risk Indicator */}
      {alertRisk && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-700 mb-3">
            ⚠ {riskScopeLabel} Risiko Tinggi — Attrition &gt; 5% ({periLabel})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {riskProjects.map(p => (
              <div key={p.name} className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 truncate" title={p.name}>{p.name}</p>
                <p className={`text-2xl font-bold mt-1 ${p.pct > 10 ? 'text-red-600' : 'text-orange-500'}`}>
                  {fmtPct(p.pct)}
                </p>
                <div className="text-xs text-gray-400 mt-1.5 space-y-0.5">
                  <p>Starting HC: <span className="text-gray-600 font-medium">{p.shc}</span></p>
                  <p>Resign: <span className="text-gray-600 font-medium">{p.resign}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
