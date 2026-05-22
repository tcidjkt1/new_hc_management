import { useState, useMemo, useCallback } from 'react'
import { calcPositionBreakdown } from '../../lib/calculations'
import { queryRawData }           from '../../lib/rawDataQuery'
import { downloadXlsx }           from '../../lib/downloadXlsx'

// ── Constants ──────────────────────────────────────────────────────────────────
const TH    = 'border border-gray-400 px-2 py-1.5 text-center font-semibold text-xs whitespace-nowrap bg-[#1f3864] text-white'
const BASE   = 'border border-gray-300 px-2 py-1 text-xs'
const NBASE  = 'border border-gray-300 px-3 py-1 text-center text-xs tabular-nums'
const DL_CLS = 'cursor-pointer hover:bg-yellow-50 hover:ring-1 hover:ring-inset hover:ring-yellow-300'

const METRIC_LABELS = {
  startingHC:    'Starting HC',
  intAttrWithin: 'Internal Attrition Within PJ',
  intAttr:       'Internal Attrition Out of PJ',
  extVol:        'Ext Attrition Voluntary',
  extInvol:      'Ext Attrition Involuntary',
  nh:            'New Hire',
  nhMovement:    'New Hire - Movements (Mutation From Other PJ)',
  endingHC:      'Ending HC',
  attrPct:       'Attrition (External)',
}
const LEVEL_LABELS = { agent: 'Agent', supp: 'Supporting Staff', all: 'All' }

const FIELD = {
  startingHC:   'startingHC',    intAttrWithin: 'intAttrWithin',
  intAttr:      'intAttr',       extVol:        'extVoluntary',
  extInvol:     'extInvoluntary',nh:            'nhNew',
  nhMovement:   'nhMovement',    endingHC:      'endingHC',
  attrPct:      'attrPct',
}

const fmtPct = v => `${(v || 0).toFixed(2).replace('.', ',')}%`
const fmtNum = v => v ?? 0

// ── Component ──────────────────────────────────────────────────────────────────
export default function HcMovementTable({ results, filters, activeData, logData }) {
  const [expandedItems, setExpandedItems] = useState(new Set())

  const toggle = key => setExpandedItems(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const isExp    = key => expandedItems.has(key)
  const agentKey = key => `${key}_a`

  const opg  = filters?.opg  && filters.opg  !== 'All' ? filters.opg  : 'All'
  const proj = filters?.proj && filters.proj !== 'All' ? filters.proj : 'All'

  // ── Per-position data ───────────────────────────────────────────────────────
  const agentPosData = useMemo(() => {
    if (!activeData || !logData || !results?.length) return []
    return results.map(r => calcPositionBreakdown(activeData, logData, r.S, r.E, filters, true))
  }, [activeData, logData, results, filters])

  const agentPositions = useMemo(() => {
    const all = new Set()
    agentPosData.forEach(pd => pd.forEach(p => all.add(p.position)))
    return [...all].sort()
  }, [agentPosData])

  const posData = useMemo(() => {
    if (!activeData || !logData || !results?.length) return []
    return results.map(r => calcPositionBreakdown(activeData, logData, r.S, r.E, filters, false))
  }, [activeData, logData, results, filters])

  const suppPositions = useMemo(() => {
    const all = new Set()
    posData.forEach(pd => pd.forEach(p => all.add(p.position)))
    return [...all].sort()
  }, [posData])

  const agentN = agentPositions.length
  const suppN  = suppPositions.length

  // ── Download handler ────────────────────────────────────────────────────────
  const handleCellClick = useCallback(({ metricKey, level, period, position }) => {
    const rows = queryRawData(
      metricKey, level, period.S, period.E,
      activeData, logData, filters, position ?? null
    )
    const mLabel = METRIC_LABELS[metricKey] || metricKey
    const lLabel = LEVEL_LABELS[level]      || level
    const pLabel = position ? `_${position}` : ''
    const tLabel = period.label.replace(/[^a-zA-Z0-9]/g, '_')
    downloadXlsx(rows, `${mLabel}_${lLabel}${pLabel}_${tLabel}`)
  }, [activeData, logData, filters])

  // Click-context factory
  const mkCtx = (metricKey, level, position = null) => ({ metricKey, level, position })

  // ── Cell renderers ──────────────────────────────────────────────────────────
  const mkNum = (fn, cls = '', ctx = null) =>
    results.map(r => (
      <td
        key={r.label}
        className={`${NBASE}${cls ? ' ' + cls : ''}${ctx ? ' ' + DL_CLS : ''}`}
        onClick={ctx ? () => handleCellClick({ ...ctx, period: r }) : undefined}
        title={ctx
          ? `⬇ Download: ${METRIC_LABELS[ctx.metricKey]} · ${LEVEL_LABELS[ctx.level]}${ctx.position ? ' · ' + ctx.position : ''} · ${r.label}`
          : undefined}
      >
        {fmtNum(fn(r))}
      </td>
    ))

  const mkPct = (fn, cls = '', ctx = null) =>
    results.map(r => (
      <td
        key={r.label}
        className={`${NBASE} font-bold${cls ? ' ' + cls : ''}${ctx ? ' ' + DL_CLS : ''}`}
        onClick={ctx ? () => handleCellClick({ ...ctx, period: r }) : undefined}
        title={ctx
          ? `⬇ Download: ${METRIC_LABELS[ctx.metricKey]} · ${LEVEL_LABELS[ctx.level]}${ctx.position ? ' · ' + ctx.position : ''} · ${r.label}`
          : undefined}
      >
        {fmtPct(fn(r))}
      </td>
    ))

  // ── Position sub-row renderers ──────────────────────────────────────────────
  const getVal = (data, key, pos, periodIdx) =>
    data[periodIdx]?.find(p => p.position === pos)?.[FIELD[key]] ?? 0

  const agentPosRows = (key, pct = false, bg = 'bg-blue-50', labelSpan = 2) =>
    isExp(agentKey(key))
      ? agentPositions.map(pos => (
          <tr key={`${agentKey(key)}_${pos}`}>
            <td className={`${BASE} pl-6 text-blue-700 italic ${bg}`} colSpan={labelSpan}>{pos}</td>
            {results.map((r, i) => (
              <td
                key={r.label}
                className={`${NBASE} text-blue-700 italic ${bg}${pct ? ' font-bold' : ''} ${DL_CLS}`}
                onClick={() => handleCellClick({ metricKey: key, level: 'agent', period: r, position: pos })}
                title={`⬇ Download: ${METRIC_LABELS[key]} · ${pos} · ${r.label}`}
              >
                {pct ? fmtPct(getVal(agentPosData, key, pos, i)) : fmtNum(getVal(agentPosData, key, pos, i))}
              </td>
            ))}
          </tr>
        ))
      : null

  const suppPosRows = (key, pct = false, bg = 'bg-amber-50', labelSpan = 2) =>
    isExp(key)
      ? suppPositions.map(pos => (
          <tr key={`${key}_${pos}`}>
            <td className={`${BASE} pl-6 text-amber-700 italic ${bg}`} colSpan={labelSpan}>{pos}</td>
            {results.map((r, i) => (
              <td
                key={r.label}
                className={`${NBASE} text-amber-700 italic ${bg}${pct ? ' font-bold' : ''} ${DL_CLS}`}
                onClick={() => handleCellClick({ metricKey: key, level: 'supp', period: r, position: pos })}
                title={`⬇ Download: ${METRIC_LABELS[key]} · ${pos} · ${r.label}`}
              >
                {pct ? fmtPct(getVal(posData, key, pos, i)) : fmtNum(getVal(posData, key, pos, i))}
              </td>
            ))}
          </tr>
        ))
      : null

  // ── Rowspan helpers ─────────────────────────────────────────────────────────
  const expAgN  = key => isExp(agentKey(key)) ? agentN : 0
  const expSuppN = key => isExp(key)           ? suppN  : 0

  const stdSpan = key => 2 + expAgN(key) + expSuppN(key)
  const subSpan = key => 2 + expAgN(key) + expSuppN(key)
  const extSpan = () =>
    4 + expAgN('extVol') + expSuppN('extVol') + expAgN('extInvol') + expSuppN('extInvol')
  const endSpan = key => 3 + expAgN(key) + expSuppN(key)

  const totalRows = useMemo(() => {
    let n = 20
    expandedItems.forEach(key => { n += key.endsWith('_a') ? agentN : suppN })
    return n
  }, [expandedItems, agentN, suppN])

  // ── Shared row builders ─────────────────────────────────────────────────────
  // Agent cell (white bg, colSpan=2)
  const tdAgent = (key, extraCls = '') => (
    <td
      className={`${BASE} cursor-pointer select-none hover:bg-blue-50${extraCls ? ' ' + extraCls : ''}`}
      colSpan={2}
      onClick={() => toggle(agentKey(key))}
      title="Klik untuk expand/collapse per tipe Agent"
    >
      {isExp(agentKey(key)) ? '▼' : '▶'}&nbsp;Agent
    </td>
  )

  // Agent cell variants
  const tdAgentRed = key => (
    <td
      className={`${BASE} bg-red-600 text-white cursor-pointer select-none hover:bg-red-700`}
      onClick={() => toggle(agentKey(key))}
      title="Klik untuk expand/collapse per tipe Agent"
    >
      {isExp(agentKey(key)) ? '▼' : '▶'}&nbsp;Agent
    </td>
  )

  const tdAgentGreen = key => (
    <td
      className={`${BASE} bg-[#70ad47] text-white cursor-pointer select-none hover:bg-green-600`}
      colSpan={2}
      onClick={() => toggle(agentKey(key))}
      title="Klik untuk expand/collapse per tipe Agent"
    >
      {isExp(agentKey(key)) ? '▼' : '▶'}&nbsp;Agent
    </td>
  )

  // Supporting Staff rows (with download on numeric cells)
  const ssRow = (key, fn, cls = '') => (
    <tr>
      <td
        className={`${BASE} text-amber-800 font-medium cursor-pointer select-none hover:bg-amber-50${cls ? ' ' + cls : ''}`}
        colSpan={2}
        onClick={() => toggle(key)}
        title="Klik untuk expand/collapse per posisi"
      >
        {isExp(key) ? '▼' : '▶'}&nbsp;Supporting Staff
      </td>
      {mkNum(fn, cls, mkCtx(key, 'supp'))}
    </tr>
  )

  const ssRowRed = (key, fn) => (
    <tr>
      <td
        className={`${BASE} bg-red-600 text-white font-medium cursor-pointer select-none hover:bg-red-700`}
        onClick={() => toggle(key)}
        title="Klik untuk expand/collapse per posisi"
      >
        {isExp(key) ? '▼' : '▶'}&nbsp;Supporting Staff
      </td>
      {mkNum(fn, 'bg-red-50', mkCtx(key, 'supp'))}
    </tr>
  )

  const ssRowGreen = (key, fn) => (
    <tr>
      <td
        className={`${BASE} bg-[#70ad47] text-white font-medium cursor-pointer select-none hover:bg-green-600`}
        colSpan={2}
        onClick={() => toggle(key)}
        title="Klik untuk expand/collapse per posisi"
      >
        {isExp(key) ? '▼' : '▶'}&nbsp;Supporting Staff
      </td>
      {mkNum(fn, 'bg-green-50', mkCtx(key, 'supp'))}
    </tr>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-x-auto">
      {/* Legend */}
      <p className="text-xs text-gray-400 mb-2">
        💡 Klik angka pada tabel untuk download raw data (.xlsx)
      </p>

      <table className="border-collapse text-xs">
        <colgroup>
          <col style={{ width: 90 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 210 }} />
          <col style={{ width: 95 }} />
          <col style={{ width: 125 }} />
          {results.map((_, i) => <col key={i} style={{ width: 82 }} />)}
        </colgroup>

        <thead>
          <tr>
            <th className={TH}>Unit / OPG</th>
            <th className={TH}>Project</th>
            <th className={TH}>Item</th>
            <th className={TH} colSpan={2}>Level</th>
            {results.map(r => <th key={r.label} className={TH}>{r.label}</th>)}
          </tr>
        </thead>

        <tbody>

          {/* ── Starting HC ─────────────────────────────── */}
          <tr>
            <td className={`${BASE} align-top text-center font-semibold`} rowSpan={totalRows}>{opg}</td>
            <td className={`${BASE} align-top text-center font-semibold`} rowSpan={totalRows}>{proj}</td>
            <td className={`${BASE} font-medium`} rowSpan={stdSpan('startingHC')}>Starting HC</td>
            {tdAgent('startingHC')}
            {mkNum(r => r.agent.startingHC, '', mkCtx('startingHC', 'agent'))}
          </tr>
          {agentPosRows('startingHC')}
          {ssRow('startingHC', r => r.supp.startingHC)}
          {suppPosRows('startingHC')}

          {/* ── Internal Attrition within PJ ────────────── */}
          <tr>
            <td className={`${BASE} font-medium`} rowSpan={stdSpan('intAttrWithin')}>Internal Attrition within PJ</td>
            {tdAgent('intAttrWithin')}
            {mkNum(r => r.agent.intAttrWithin ?? 0, '', mkCtx('intAttrWithin', 'agent'))}
          </tr>
          {agentPosRows('intAttrWithin')}
          {ssRow('intAttrWithin', r => r.supp.intAttrWithin ?? 0)}
          {suppPosRows('intAttrWithin')}

          {/* ── Internal Attrition out of PJ ────────────── */}
          <tr>
            <td className={`${BASE} font-medium`} rowSpan={stdSpan('intAttr')}>Internal Attrition out of PJ</td>
            {tdAgent('intAttr')}
            {mkNum(r => r.agent.intAttr, '', mkCtx('intAttr', 'agent'))}
          </tr>
          {agentPosRows('intAttr')}
          {ssRow('intAttr', r => r.supp.intAttr)}
          {suppPosRows('intAttr')}

          {/* ── External Attrition — Voluntary ──────────── */}
          <tr>
            <td className={`${BASE} bg-red-600 text-white font-medium`} rowSpan={extSpan()}>
              External Attrition
            </td>
            <td className={`${BASE} bg-red-600 text-white font-medium`} rowSpan={subSpan('extVol')}>
              Voluntary
            </td>
            {tdAgentRed('extVol')}
            {mkNum(r => r.agent.extVoluntary, 'bg-red-50', mkCtx('extVol', 'agent'))}
          </tr>
          {agentPosRows('extVol', false, 'bg-red-50', 1)}
          {ssRowRed('extVol', r => r.supp.extVoluntary)}
          {suppPosRows('extVol', false, 'bg-red-50', 1)}

          {/* ── External Attrition — Involuntary ────────── */}
          <tr>
            <td className={`${BASE} bg-red-600 text-white font-medium`} rowSpan={subSpan('extInvol')}>
              Involuntary
            </td>
            {tdAgentRed('extInvol')}
            {mkNum(r => r.agent.extInvoluntary, 'bg-red-50', mkCtx('extInvol', 'agent'))}
          </tr>
          {agentPosRows('extInvol', false, 'bg-red-50', 1)}
          {ssRowRed('extInvol', r => r.supp.extInvoluntary)}
          {suppPosRows('extInvol', false, 'bg-red-50', 1)}

          {/* ── New Hire ────────────────────────────────── */}
          <tr>
            <td className={`${BASE} bg-[#70ad47] text-white font-medium`} rowSpan={stdSpan('nh')}>
              New Hire
            </td>
            {tdAgentGreen('nh')}
            {mkNum(r => r.agent.nhNew, 'bg-green-50', mkCtx('nh', 'agent'))}
          </tr>
          {agentPosRows('nh', false, 'bg-green-50')}
          {ssRowGreen('nh', r => r.supp.nhNew)}
          {suppPosRows('nh', false, 'bg-green-50')}

          {/* ── New Hire - Movements ─────────────────────── */}
          <tr>
            <td className={`${BASE} bg-[#70ad47] text-white font-medium`} rowSpan={stdSpan('nhMovement')}>
              New Hire - Movements (Mutation From Other PJ)
            </td>
            {tdAgentGreen('nhMovement')}
            {mkNum(r => r.agent.nhMovement, 'bg-green-50', mkCtx('nhMovement', 'agent'))}
          </tr>
          {agentPosRows('nhMovement', false, 'bg-green-50')}
          {ssRowGreen('nhMovement', r => r.supp.nhMovement)}
          {suppPosRows('nhMovement', false, 'bg-green-50')}

          {/* ── Ending HC ───────────────────────────────── */}
          <tr>
            <td className={`${BASE} font-medium`} rowSpan={endSpan('endingHC')}>Ending HC</td>
            {tdAgent('endingHC')}
            {mkNum(r => r.agent.endingHC, '', mkCtx('endingHC', 'agent'))}
          </tr>
          {agentPosRows('endingHC')}
          {ssRow('endingHC', r => r.supp.endingHC)}
          {suppPosRows('endingHC')}
          <tr>
            <td className={`${BASE} font-semibold`} colSpan={2}>All</td>
            {mkNum(r => r.endingHC, 'font-semibold', mkCtx('endingHC', 'all'))}
          </tr>

          {/* ── Attrition % ─────────────────────────────── */}
          <tr>
            <td className={`${BASE} bg-gray-100 font-bold italic`} rowSpan={endSpan('attrPct')}>
              Attrition %
            </td>
            <td
              className={`${BASE} bg-gray-100 font-bold italic text-blue-700 cursor-pointer select-none hover:bg-blue-50`}
              colSpan={2}
              onClick={() => toggle(agentKey('attrPct'))}
              title="Klik untuk expand/collapse per tipe Agent"
            >
              {isExp(agentKey('attrPct')) ? '▼' : '▶'}&nbsp;Agent
            </td>
            {mkPct(r => r.agent.attrPct, 'bg-gray-50', mkCtx('attrPct', 'agent'))}
          </tr>
          {agentPosRows('attrPct', true, 'bg-gray-50')}
          <tr>
            <td
              className={`${BASE} bg-gray-100 font-bold italic text-amber-800 cursor-pointer select-none hover:bg-gray-200`}
              colSpan={2}
              onClick={() => toggle('attrPct')}
              title="Klik untuk expand/collapse per posisi"
            >
              {isExp('attrPct') ? '▼' : '▶'}&nbsp;Supporting Staff
            </td>
            {mkPct(r => r.supp.attrPct, 'bg-gray-50', mkCtx('attrPct', 'supp'))}
          </tr>
          {suppPosRows('attrPct', true, 'bg-gray-50')}
          <tr>
            <td className={`${BASE} bg-gray-100 font-bold italic`} colSpan={2}>All</td>
            {mkPct(r => r.attrPct, 'bg-gray-50', mkCtx('attrPct', 'all'))}
          </tr>

        </tbody>
      </table>
    </div>
  )
}
