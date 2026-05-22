import { isDW, dateToSerial } from './utils'

function toS(d) { return dateToSerial(d) }

// Agent = posisi mengandung kata 'agent'
function isAgent(pos) { return (pos || '').toLowerCase().includes('agent') }

function applyFilters(data, { opg, proj, pos, channel, skill, site } = {}) {
  return data.filter(r =>
    (!opg     || opg     === 'All' || r.opg      === opg)     &&
    (!proj    || proj    === 'All' || r.project   === proj)    &&
    (!pos     || pos     === 'All' || r.position  === pos)     &&
    (!channel || channel === 'All' || r.channel   === channel) &&
    (!skill   || skill   === 'All' || r.skill     === skill)   &&
    (!site    || site    === 'All' || r.site      === site)
  )
}

// Hitung Starting HC per level (agent / supporting)
// Formula per image:
// Agent:   s1(Active=Agent) + s2(Resign=Agent) + s3(PromOut=Agent) + s4(Mutation=Agent) + s5(DemOut=Agent)
//        + s6(PromStillInPJ pos=Agent)                   ← Agent→Support: at S still Agent, HC_ACTIVE=Support
//        - s_neg(DemStillInPJ pos=Support, toPos=Agent)  ← Support→Agent: at S still Support, HC_ACTIVE=Agent (already in s1)
// Support: s1(Active≠Agent) + s2(Resign≠Agent) + s3(PromOut≠Agent) + s4(Mutation≠Agent) + s5(DemOut≠Agent)
//        + s7(DemStillInPJ pos≠Agent, toPos=Agent)       ← Support→Agent: at S still Support, HC_ACTIVE=Agent (not in s1)
//        + s8(PromStillInPJ pos=Agent, Failed, fixDate>=S) ← Failed promo: at S in Support probation, HC_ACTIVE=Agent (not in s1)
//        - s_neg(PromStillInPJ pos=Agent)                ← Agent→Support: at S still Agent, HC_ACTIVE=Support (already in s1)
function calcStarting(A, L, S, agentOnly) {
  const pf = r => agentOnly ? isAgent(r.position) : !isAgent(r.position)

  // s1–s5: standard terms, same for both levels
  const s1 = A.filter(r => { const j=toS(r.join_date_project); return r.pcn_type==='Active' && j!==null && j<S && pf(r) }).length
  const s2 = L.filter(r => { const j=toS(r.join_date_project); const e=toS(r.effective_resign_date); return r.pcn_type==='Resign' && j!==null && j<S && e!==null && e>=S && pf(r) }).length
  const s3 = L.filter(r => { const j=toS(r.join_date_project); const p=toS(r.start_probation); return r.pcn_type==='Promotion Out Of PJ' && j!==null && j<S && p!==null && p>=S && pf(r) }).length
  const s4 = L.filter(r => { const j=toS(r.join_date_project); const p=toS(r.start_probation); return r.pcn_type==='Mutation' && j!==null && j<S && p!==null && p>=S && pf(r) }).length
  const s5 = L.filter(r => { const j=toS(r.join_date_project); const p=toS(r.start_probation); return r.pcn_type==='Demotion Out Of PJ' && j!==null && j<S && p!==null && p>=S && pf(r) }).length

  // s6: Agent only — Promotion Still In PJ where old pos = Agent
  // (Employee was Agent at S, HC_ACTIVE already updated to Support → not in s1 for Agent → add here)
  const s6 = agentOnly
    ? L.filter(r => { const j=toS(r.join_date_project); const p=toS(r.start_probation); return r.pcn_type==='Promotion Still In PJ' && isAgent(r.position) && j!==null && j<S && p!==null && p>=S }).length
    : 0

  // s7: Support only — Demotion Still In PJ where old pos ≠ Agent AND to_position = Agent
  // (Employee was Support at S, HC_ACTIVE updated to Agent → not in s1 for Support → add here)
  const s7 = agentOnly
    ? 0
    : L.filter(r => {
        const j=toS(r.join_date_project); const p=toS(r.start_probation)
        const toPos = r.to_position ?? null
        return r.pcn_type==='Demotion Still In PJ' && !isAgent(r.position) &&
          (toPos === null || isAgent(toPos)) && j!==null && j<S && p!==null && p>=S
      }).length

  // s8: Support only — Promotion Still In PJ with Failed result
  // (Agent was in Support probation at S but promotion failed; HC_ACTIVE reverted to Agent → not in s1 for Support)
  const s8 = agentOnly
    ? 0
    : L.filter(r => {
        const j=toS(r.join_date_project); const t=toS(r.fix_new_position_date)
        return r.pcn_type==='Promotion Still In PJ' && isAgent(r.position) &&
          (r.result_promotion || '').toLowerCase().includes('failed') &&
          j!==null && j<S && t!==null && t>=S
      }).length

  // s_neg: subtract cross-level employees already in s1 at their NEW level
  // Agent: subtract Support→Agent (DemStillInPJ pos≠Agent toPos=Agent) — they're in HC_ACTIVE as Agent (s1), but at S were Support
  // Support: subtract Agent→Support (PromStillInPJ pos=Agent) — they're in HC_ACTIVE as Support (s1), but at S were Agent
  const s_neg = L.filter(r => {
    const j=toS(r.join_date_project); const p=toS(r.start_probation)
    if (agentOnly) {
      const toPos = r.to_position ?? null
      return r.pcn_type==='Demotion Still In PJ' && !isAgent(r.position) &&
        (toPos === null || isAgent(toPos)) && j!==null && j<S && p!==null && p>=S
    } else {
      return r.pcn_type==='Promotion Still In PJ' && isAgent(r.position) && j!==null && j<S && p!==null && p>=S
    }
  }).length

  return s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8 - s_neg
}

// Hitung metrik per level (agent / supporting)
function calcByLevel(A, L, S, E, agentOnly) {
  const pf      = r => agentOnly ? isAgent(r.position) : !isAgent(r.position)
  const inP     = r => { const j=toS(r.join_date_project); return j!==null && j>=S && j<=E }
  const notYet  = r => { const p=toS(r.start_probation);   return p===null || p>=S }

  const startingHC = calcStarting(A, L, S, agentOnly)

  // Internal Attrition within PJ: cross-level only
  // Agent:   Promotion Still In PJ, old pos=Agent,     to_position=non-agent (→Supporting)
  // Support: Demotion Still In PJ,  old pos=non-agent, to_position=agent     (→Agent)
  const intAttrWithin = L.filter(r => {
    const p = toS(r.start_probation)
    if (p === null || p < S || p > E) return false
    const toPos = r.to_position ?? null
    if (agentOnly) {
      return r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
        (toPos == null || !isAgent(toPos))
    } else {
      return r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
        (toPos == null || isAgent(toPos))
    }
  }).length

  // Internal Attrition out of PJ
  const intAttr = L.filter(r => {
    const p = toS(r.start_probation)
    return ['Promotion Out Of PJ','Mutation','Demotion Out Of PJ'].includes(r.pcn_type) &&
      p!==null && p>=S && p<=E && pf(r)
  }).length

  // External Attrition
  const resigns = L.filter(r => {
    const e = toS(r.effective_resign_date)
    return r.pcn_type==='Resign' && e!==null && e>=S && e<=E && pf(r)
  })
  const extVoluntary   = resigns.filter(r => r.resign_type === 'Employee Matter (Voluntary)').length
  const extInvoluntary = resigns.filter(r => r.resign_type === 'Company Matter (Involuntary)').length
  const totalExt       = extVoluntary + extInvoluntary

  const inProb = r => { const p=toS(r.start_probation); return p!==null && p>=S && p<=E }

  // Case A: new hire joins this period AND promotes cross-level in same period
  // (join_date in period) — hc_active shows new pos, so old-level pool must add from L
  const crossPromNewAgent = r =>   // Agent→Support, joined this period
    r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
    (r.to_position == null || !isAgent(r.to_position)) && inP(r)
  const crossDemNewSupp = r =>     // Support→Agent, joined this period
    r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
    (r.to_position == null || isAgent(r.to_position)) && inP(r)

  // Case B: existing employee (joined before period) crosses level within this period
  // (start_probation in period, join_date BEFORE period)
  // → old level already lost them via intAttrWithin; destination level must gain them here
  const crossPromExistSupp = r =>  // existing Agent → Support this period (Support gains)
    r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
    (r.to_position == null || !isAgent(r.to_position)) &&
    toS(r.join_date_project) !== null && toS(r.join_date_project) < S && inProb(r)
  const crossDemExistAgent = r =>  // existing Support → Agent this period (Agent gains)
    r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
    (r.to_position == null || isAgent(r.to_position)) &&
    toS(r.join_date_project) !== null && toS(r.join_date_project) < S && inProb(r)

  // New Hire — hire_status = 'New Hire' saja (fresh hire baru)
  // Case A cross-level: new hire yang join periode ini lalu cross-level di periode yang sama
  const nhNew =
    A.filter(r => r.hire_status==='New Hire' && r.pcn_type==='Active' && inP(r) && pf(r)).length +
    L.filter(r => r.hire_status==='New Hire' && r.pcn_type==='Resign' && inP(r) && pf(r)).length +
    L.filter(r => r.hire_status==='New Hire' && r.pcn_type==='Promotion Out Of PJ' && inP(r) && notYet(r) && pf(r)).length +
    L.filter(r => r.hire_status==='New Hire' && r.pcn_type==='Demotion Out Of PJ'  && inP(r) && notYet(r) && pf(r)).length +
    L.filter(r => r.hire_status==='New Hire' && r.pcn_type==='Mutation' && inP(r) && pf(r)).length +
    (agentOnly
      ? L.filter(r => r.hire_status==='New Hire' && crossPromNewAgent(r)).length   // Case A agent
      : L.filter(r => r.hire_status==='New Hire' && crossDemNewSupp(r)).length)    // Case A support

  // New Hire Movements — hire_status = 'From Other PJ' + semua cross-level existing (Case B)
  // Case B tidak filter hire_status: karyawan lama yang cross-level = "pergerakan", bukan hire baru
  const nhMovement =
    A.filter(r => r.hire_status==='From Other PJ' && r.pcn_type==='Active' && inP(r) && pf(r)).length +
    L.filter(r => r.hire_status==='From Other PJ' && r.pcn_type==='Resign' && inP(r) && pf(r)).length +
    L.filter(r => r.hire_status==='From Other PJ' && r.pcn_type==='Promotion Out Of PJ' && inP(r) && notYet(r) && pf(r)).length +
    L.filter(r => r.hire_status==='From Other PJ' && r.pcn_type==='Demotion Out Of PJ'  && inP(r) && notYet(r) && pf(r)).length +
    L.filter(r => r.hire_status==='From Other PJ' && r.pcn_type==='Mutation' && inP(r) && pf(r)).length +
    (agentOnly
      ? L.filter(r => r.hire_status==='From Other PJ' && crossPromNewAgent(r)).length + // Case A agent
        L.filter(r => crossDemExistAgent(r)).length                                      // Case B agent (all hire_status)
      : L.filter(r => r.hire_status==='From Other PJ' && crossDemNewSupp(r)).length +  // Case A support
        L.filter(r => crossPromExistSupp(r)).length)                                    // Case B support (all hire_status)

  const nh       = nhNew + nhMovement  // total NH untuk endingHC
  const endingHC = startingHC - intAttrWithin - intAttr - totalExt + nh
  const attrPct  = startingHC > 0 ? (totalExt / startingHC) * 100 : 0

  return { startingHC, intAttrWithin, intAttr, extVoluntary, extInvoluntary, totalExt, nh, nhNew, nhMovement, endingHC, attrPct }
}

export function calcPeriod(activeData, logData, S, E, filters = {}) {
  const A = applyFilters(activeData, filters)
  const L = applyFilters(logData, filters)

  const agent = calcByLevel(A, L, S, E, true)
  const supp  = calcByLevel(A, L, S, E, false)

  // Total keseluruhan
  const startingHC     = agent.startingHC     + supp.startingHC
  const intAttrWithin  = agent.intAttrWithin  + supp.intAttrWithin
  const intAttr        = agent.intAttr        + supp.intAttr
  const totalExt       = agent.totalExt       + supp.totalExt
  const totalNH         = agent.nh          + supp.nh
  const totalNHNew      = agent.nhNew       + supp.nhNew
  const totalNHMovement = agent.nhMovement  + supp.nhMovement
  const endingHC        = startingHC - intAttrWithin - intAttr - totalExt + totalNH
  const attrPct         = startingHC > 0 ? (totalExt / startingHC) * 100 : 0

  // Breakdown detail (untuk KPI cards)
  const resigns = L.filter(r => { const e=toS(r.effective_resign_date); return r.pcn_type==='Resign' && e!==null && e>=S && e<=E })
  const extCMC  = resigns.filter(r => !isDW(r.position) && r.resign_type==='Company Matter (Involuntary)').length
  const extEMC  = resigns.filter(r => !isDW(r.position) && r.resign_type==='Employee Matter (Voluntary)').length
  const extCMDW = resigns.filter(r =>  isDW(r.position) && r.resign_type==='Company Matter (Involuntary)').length
  const extEMDW = resigns.filter(r =>  isDW(r.position) && r.resign_type==='Employee Matter (Voluntary)').length

  return {
    // Total
    startingHC, intAttrWithin, intAttr, totalExt, totalNH, totalNHNew, totalNHMovement, endingHC, attrPct, totalAttr: totalExt,
    extCMC, extEMC, extCMDW, extEMDW,
    // Level breakdown
    agent, supp
  }
}

// Hitung metrik per posisi untuk satu periode
// agentOnly=true → posisi agent; agentOnly=false → posisi supporting staff
export function calcPositionBreakdown(activeData, logData, S, E, filters = {}, agentOnly = false) {
  const A = applyFilters(activeData, filters)
  const L = applyFilters(logData, filters)

  const match = r => agentOnly ? isAgent(r.position) : !isAgent(r.position)
  const positions = [...new Set([
    ...A.filter(match).map(r => r.position),
    ...L.filter(match).map(r => r.position),
  ].filter(Boolean))].sort()

  // Employees who moved positions within PJ with effective date on/after S:
  // at time S they were still at their OLD position (in log), but HC_ACTIVE already shows new position.
  // Exclude them from Active (s1) so they're only counted via their old position in log (Lp).
  const movedWithinPJNIKs = new Set(
    L.filter(r => {
      const j = toS(r.join_date_project), p = toS(r.start_probation)
      return ['Promotion Still In PJ','Demotion Still In PJ'].includes(r.pcn_type) &&
        j !== null && j < S && p !== null && p >= S
    }).map(r => r.nik).filter(Boolean)
  )

  return positions.map(pos => {
    const Ap = A.filter(r => r.position === pos)
    const Lp = L.filter(r => r.position === pos)
    const metrics = calcByLevel(Ap, Lp, S, E, agentOnly)

    // startingHC per-position: strict-start (j < S), matches aggregate calcStarting logic.
    // Active excludes employees whose position changed within PJ on/after S (counted via Lp instead).
    const startingHC =
      Ap.filter(r => {
        const j = toS(r.join_date_project)
        return r.pcn_type === 'Active' && j !== null && j < S && !movedWithinPJNIKs.has(r.nik)
      }).length +
      Lp.filter(r => {
        const j = toS(r.join_date_project), e = toS(r.effective_resign_date)
        return r.pcn_type === 'Resign' && j !== null && j < S && e !== null && e >= S
      }).length +
      Lp.filter(r => {
        const j = toS(r.join_date_project), p = toS(r.start_probation)
        return ['Promotion Out Of PJ','Mutation','Demotion Out Of PJ'].includes(r.pcn_type) &&
          j !== null && j < S && p !== null && p >= S
      }).length +
      Lp.filter(r => {
        const j = toS(r.join_date_project), p = toS(r.start_probation)
        return ['Promotion Still In PJ','Demotion Still In PJ'].includes(r.pcn_type) &&
          j !== null && j < S && p !== null && p >= S
      }).length

    return { position: pos, ...metrics, startingHC }
  })
}

export function calcTop10(activeData, logData, fromS, untilS, filters = {}, groupBy = 'project') {
  const colMap = { project:'project', opg:'opg', position:'position', channel:'channel', skill:'skill' }
  const col    = colMap[groupBy] || 'project'
  const A      = applyFilters(activeData, filters)
  const L      = applyFilters(logData, filters)
  const groups = [...new Set([...A,...L].map(r=>r[col]).filter(Boolean))]

  return groups.map(gv => {
    const Ag = A.filter(r=>r[col]===gv), Lg = L.filter(r=>r[col]===gv)
    const s1 = Ag.filter(r=>{const j=toS(r.join_date_project);return r.pcn_type==='Active'&&j!==null&&j<fromS}).length
    const s2 = Lg.filter(r=>{const j=toS(r.join_date_project);const e=toS(r.effective_resign_date);return r.pcn_type==='Resign'&&j!==null&&j<fromS&&e!==null&&e>=fromS}).length
    const s3 = Lg.filter(r=>{const j=toS(r.join_date_project);const p=toS(r.start_probation);return r.pcn_type==='Promotion Out Of PJ'&&j!==null&&j<fromS&&p!==null&&p>=fromS}).length
    const s4 = Lg.filter(r=>{const j=toS(r.join_date_project);const p=toS(r.start_probation);return r.pcn_type==='Mutation'&&j!==null&&j<fromS&&p!==null&&p>=fromS}).length
    const s5 = Lg.filter(r=>{const j=toS(r.join_date_project);const p=toS(r.start_probation);return r.pcn_type==='Demotion Out Of PJ'&&j!==null&&j<fromS&&p!==null&&p>=fromS}).length
    const shc = s1+s2+s3+s4+s5
    const resign = Lg.filter(r=>{const e=toS(r.effective_resign_date);return r.pcn_type==='Resign'&&e!==null&&e>=fromS&&e<=untilS}).length
    return { name:gv, shc, resign, pct: shc>0?(resign/shc)*100:0 }
  }).filter(r=>r.shc>0||r.resign>0).sort((a,b)=>b.pct-a.pct).slice(0,10)
}