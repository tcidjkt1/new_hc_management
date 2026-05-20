import { isDW, isNewOrOtherPJ, dateToSerial } from './utils'

function toS(dateStr) {
  return dateToSerial(dateStr)
}

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

export function calcPeriod(activeData, logData, S, E, filters = {}) {
  const A = applyFilters(activeData, filters)
  const L = applyFilters(logData, filters)

  // STARTING HC
  const s1 = A.filter(r => r.pcn_type === 'Active' && toS(r.join_date_project) < S).length
  const s2 = L.filter(r => r.pcn_type === 'Resign' && toS(r.join_date_project) < S && toS(r.effective_resign_date) >= S).length
  const s3 = L.filter(r => r.pcn_type === 'Promotion Out Of PJ' && toS(r.join_date_project) < S && r.start_probation && toS(r.start_probation) >= S).length
  const s4 = L.filter(r => r.pcn_type === 'Mutation' && toS(r.join_date_project) < S && r.start_probation && toS(r.start_probation) >= S).length
  const s5 = L.filter(r => r.pcn_type === 'Demotion Out Of PJ' && toS(r.join_date_project) < S && r.start_probation && toS(r.start_probation) >= S).length
  const startingHC = s1 + s2 + s3 + s4 + s5

  // INTERNAL ATTRITION
  const intAttr = L.filter(r =>
    ['Promotion Out Of PJ', 'Mutation', 'Demotion Out Of PJ'].includes(r.pcn_type) &&
    r.start_probation && toS(r.start_probation) >= S && toS(r.start_probation) <= E
  ).length

  // EXTERNAL ATTRITION
  const resigns = L.filter(r => r.pcn_type === 'Resign' && toS(r.effective_resign_date) >= S && toS(r.effective_resign_date) <= E)
  const extCMC  = resigns.filter(r => !isDW(r.position) && r.resign_type === 'Company Matter (Involuntary)').length
  const extEMC  = resigns.filter(r => !isDW(r.position) && r.resign_type === 'Employee Matter (Voluntary)').length
  const extCMDW = resigns.filter(r =>  isDW(r.position) && r.resign_type === 'Company Matter (Involuntary)').length
  const extEMDW = resigns.filter(r =>  isDW(r.position) && r.resign_type === 'Employee Matter (Voluntary)').length
  const totalExt = extCMC + extEMC + extCMDW + extEMDW

  // NEW HIRE
  const notYetEff = r => !r.start_probation || toS(r.start_probation) >= S
  const inPeriod  = r => toS(r.join_date_project) >= S && toS(r.join_date_project) <= E

  const nhC =
    A.filter(r => r.pcn_type === 'Active'             && isNewOrOtherPJ(r.hire_status) && !isDW(r.position) && inPeriod(r)).length +
    L.filter(r => r.pcn_type === 'Resign'             && isNewOrOtherPJ(r.hire_status) && !isDW(r.position) && inPeriod(r)).length +
    L.filter(r => r.pcn_type === 'Promotion Out Of PJ'&& isNewOrOtherPJ(r.hire_status) && !isDW(r.position) && inPeriod(r) && notYetEff(r)).length +
    L.filter(r => r.pcn_type === 'Demotion Out Of PJ' && isNewOrOtherPJ(r.hire_status) && !isDW(r.position) && inPeriod(r) && notYetEff(r)).length

  const nhDW =
    A.filter(r => r.pcn_type === 'Active'             && isNewOrOtherPJ(r.hire_status) && isDW(r.position) && inPeriod(r)).length +
    L.filter(r => r.pcn_type === 'Resign'             && isNewOrOtherPJ(r.hire_status) && isDW(r.position) && inPeriod(r)).length +
    L.filter(r => r.pcn_type === 'Promotion Out Of PJ'&& isNewOrOtherPJ(r.hire_status) && isDW(r.position) && inPeriod(r) && notYetEff(r)).length +
    L.filter(r => r.pcn_type === 'Demotion Out Of PJ' && isNewOrOtherPJ(r.hire_status) && isDW(r.position) && inPeriod(r) && notYetEff(r)).length

  const nhMut = L.filter(r => r.pcn_type === 'Mutation' && isNewOrOtherPJ(r.hire_status) && inPeriod(r)).length

  const totalNH  = nhC + nhDW + nhMut
  const endingHC = startingHC - intAttr - totalExt + totalNH
  const attrPct  = startingHC > 0 ? (totalExt / startingHC) * 100 : 0

  return {
    startingHC, intAttr,
    extCMC, extEMC, extCMDW, extEMDW, totalExt,
    nhC, nhDW, nhMut, totalNH,
    endingHC, attrPct, totalAttr: totalExt
  }
}

// Top 10 attrition by group
export function calcTop10(activeData, logData, fromS, untilS, filters = {}, groupBy = 'project') {
  const A = applyFilters(activeData, filters)
  const L = applyFilters(logData, filters)
  const colMap = { project: 'project', opg: 'opg', position: 'position', channel: 'channel', skill: 'skill' }
  const col = colMap[groupBy] || 'project'
  const groups = [...new Set([...A, ...L].map(r => r[col]).filter(Boolean))]

  return groups.map(gv => {
    const Ag = A.filter(r => r[col] === gv)
    const Lg = L.filter(r => r[col] === gv)
    const s1 = Ag.filter(r => r.pcn_type === 'Active' && toS(r.join_date_project) < fromS).length
    const s2 = Lg.filter(r => r.pcn_type === 'Resign' && toS(r.join_date_project) < fromS && toS(r.effective_resign_date) >= fromS).length
    const s3 = Lg.filter(r => r.pcn_type === 'Promotion Out Of PJ' && toS(r.join_date_project) < fromS && r.start_probation && toS(r.start_probation) >= fromS).length
    const s4 = Lg.filter(r => r.pcn_type === 'Mutation' && toS(r.join_date_project) < fromS && r.start_probation && toS(r.start_probation) >= fromS).length
    const s5 = Lg.filter(r => r.pcn_type === 'Demotion Out Of PJ' && toS(r.join_date_project) < fromS && r.start_probation && toS(r.start_probation) >= fromS).length
    const shc = s1 + s2 + s3 + s4 + s5
    const resign = Lg.filter(r => r.pcn_type === 'Resign' && toS(r.effective_resign_date) >= fromS && toS(r.effective_resign_date) <= untilS).length
    const pct = shc > 0 ? (resign / shc) * 100 : 0
    return { name: gv, shc, resign, pct }
  })
  .filter(r => r.shc > 0 || r.resign > 0)
  .sort((a, b) => b.pct - a.pct)
  .slice(0, 10)
}