import { dateToSerial } from './utils'

function toS(d) { return dateToSerial(d) }
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

/**
 * Returns the raw employee rows that make up a given table cell.
 *
 * @param {string}  metricKey  - 'startingHC' | 'intAttrWithin' | 'intAttr' |
 *                               'extVol' | 'extInvol' | 'nh' | 'endingHC' | 'attrPct'
 * @param {string}  level      - 'agent' | 'supp' | 'all'
 * @param {number}  S          - period start serial (inclusive)
 * @param {number}  E          - period end serial   (inclusive)
 * @param {Array}   activeData
 * @param {Array}   logData
 * @param {object}  filters    - { opg, proj, pos, channel, skill, site }
 * @param {string|null} position - specific position name (for sub-row drill-down)
 */
export function queryRawData(metricKey, level, S, E, activeData, logData, filters, position = null) {
  const A = applyFilters(activeData, filters)
  const L = applyFilters(logData, filters)

  const levelOk = r => {
    if (level === 'agent') return isAgent(r.position)
    if (level === 'supp')  return !isAgent(r.position)
    return true
  }
  const posOk = r => !position || r.position === position
  const ok    = r => levelOk(r) && posOk(r)

  const tag = (src, rows) => rows.map(r => ({ ...r, _keterangan: src }))

  switch (metricKey) {

    case 'startingHC': {
      return [
        ...tag('Active', A.filter(r => {
          const j = toS(r.join_date_project)
          return r.pcn_type === 'Active' && j !== null && j < S && ok(r)
        })),
        ...tag('Resign (masih aktif saat periode mulai)', L.filter(r => {
          const j = toS(r.join_date_project); const e = toS(r.effective_resign_date)
          return r.pcn_type === 'Resign' && j !== null && j < S && e !== null && e >= S && ok(r)
        })),
        ...tag('Internal Move Out (masih aktif saat periode mulai)', L.filter(r => {
          const j = toS(r.join_date_project); const p = toS(r.start_probation)
          return ['Promotion Out Of PJ','Mutation','Demotion Out Of PJ'].includes(r.pcn_type) &&
            j !== null && j < S && p !== null && p >= S && ok(r)
        })),
        // Agent→Support promotion: agent at S, HC_ACTIVE already Support
        ...tag('Promosi Agent→Support (masih Agent saat periode mulai)', L.filter(r => {
          const j = toS(r.join_date_project); const p = toS(r.start_probation)
          return r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
            j !== null && j < S && p !== null && p >= S && ok(r)
        })),
        // Support→Agent demotion: support at S, HC_ACTIVE already Agent
        ...tag('Demosi Support→Agent (masih Support saat periode mulai)', L.filter(r => {
          const j = toS(r.join_date_project); const p = toS(r.start_probation)
          const toPos = r.to_position ?? null
          return r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
            (toPos === null || isAgent(toPos)) && j !== null && j < S && p !== null && p >= S && ok(r)
        })),
        // Failed promotion: agent was in Support probation at S, HC_ACTIVE reverted to Agent
        ...tag('Promosi Gagal (posisi Support saat periode mulai)', L.filter(r => {
          const j = toS(r.join_date_project); const t = toS(r.fix_new_position_date)
          return r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
            (r.result_promotion || '').toLowerCase().includes('failed') &&
            j !== null && j < S && t !== null && t >= S && ok(r)
        })),
      ]
    }

    case 'intAttrWithin':
      return L.filter(r => {
        const p = toS(r.start_probation)
        if (!(['Promotion Still In PJ','Demotion Still In PJ'].includes(r.pcn_type))) return false
        if (p === null || p < S || p > E) return false
        if (!ok(r)) return false
        const toPos = r.to_position ?? null
        if (r.pcn_type === 'Promotion Still In PJ')
          return isAgent(r.position) && (toPos == null || !isAgent(toPos))
        if (r.pcn_type === 'Demotion Still In PJ')
          return !isAgent(r.position) && (toPos == null || isAgent(toPos))
        return false
      }).map(r => ({
        ...r,
        _keterangan: r.pcn_type === 'Promotion Still In PJ' ? 'Promosi Agent → Support' : 'Demosi Support → Agent',
      }))

    case 'intAttr':
      return tag('Internal Attrition Out of PJ', L.filter(r => {
        const p = toS(r.start_probation)
        return ['Promotion Out Of PJ','Mutation','Demotion Out Of PJ'].includes(r.pcn_type) &&
          p !== null && p >= S && p <= E && ok(r)
      }))

    case 'extVol':
      return tag('Voluntary Resign', L.filter(r => {
        const e = toS(r.effective_resign_date)
        return r.pcn_type === 'Resign' && e !== null && e >= S && e <= E &&
          r.resign_type === 'Employee Matter (Voluntary)' && ok(r)
      }))

    case 'extInvol':
      return tag('Involuntary Resign', L.filter(r => {
        const e = toS(r.effective_resign_date)
        return r.pcn_type === 'Resign' && e !== null && e >= S && e <= E &&
          r.resign_type === 'Company Matter (Involuntary)' && ok(r)
      }))

    case 'nh': {
      const inP    = r => { const j = toS(r.join_date_project); return j !== null && j >= S && j <= E }
      const inProb = r => { const p = toS(r.start_probation);   return p !== null && p >= S && p <= E }
      const notYet = r => { const p = toS(r.start_probation);   return p === null || p >= S }
      // Case A: joined this period, cross-level promotion/demotion in same period
      const crossPromNewAgent = r => r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
        (r.to_position == null || !isAgent(r.to_position)) && inP(r)
      const crossDemNewSupp   = r => r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
        (r.to_position == null || isAgent(r.to_position)) && inP(r)
      // Case B: joined before period, cross-level promotion this period (start_probation in period)
      const crossPromExistSupp = r => r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
        (r.to_position == null || !isAgent(r.to_position)) &&
        toS(r.join_date_project) !== null && toS(r.join_date_project) < S && inProb(r)
      return [
        ...tag('New Hire (Active)', A.filter(r =>
          r.hire_status === 'New Hire' && r.pcn_type === 'Active' && inP(r) && ok(r)
        )),
        ...tag('New Hire (Resigned)', L.filter(r =>
          r.hire_status === 'New Hire' && r.pcn_type === 'Resign' && inP(r) && ok(r)
        )),
        ...tag('New Hire (Promotion Out)', L.filter(r =>
          r.hire_status === 'New Hire' && r.pcn_type === 'Promotion Out Of PJ' && inP(r) && notYet(r) && ok(r)
        )),
        ...tag('New Hire (Demotion Out)', L.filter(r =>
          r.hire_status === 'New Hire' && r.pcn_type === 'Demotion Out Of PJ' && inP(r) && notYet(r) && ok(r)
        )),
        ...tag('New Hire (Mutation)', L.filter(r =>
          r.hire_status === 'New Hire' && r.pcn_type === 'Mutation' && inP(r) && ok(r)
        )),
        ...tag('New Hire (Promosi Agent→Support, baru masuk periode ini)', L.filter(r =>
          r.hire_status === 'New Hire' && crossPromNewAgent(r) && ok(r)
        )),
        ...tag('New Hire (Demosi Support→Agent, baru masuk periode ini)', L.filter(r =>
          r.hire_status === 'New Hire' && crossDemNewSupp(r) && ok(r)
        )),
      ]
    }

    case 'nhMovement': {
      const inP    = r => { const j = toS(r.join_date_project); return j !== null && j >= S && j <= E }
      const inProb = r => { const p = toS(r.start_probation);   return p !== null && p >= S && p <= E }
      const notYet = r => { const p = toS(r.start_probation);   return p === null || p >= S }
      // Case A: joined this period, cross-level in same period
      const crossPromNewAgent  = r => r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
        (r.to_position == null || !isAgent(r.to_position)) && inP(r)
      const crossDemNewSupp    = r => r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
        (r.to_position == null || isAgent(r.to_position)) && inP(r)
      // Case B: joined before period, cross-level this period (start_probation in period)
      const crossPromExistSupp = r => r.pcn_type === 'Promotion Still In PJ' && isAgent(r.position) &&
        (r.to_position == null || !isAgent(r.to_position)) &&
        toS(r.join_date_project) !== null && toS(r.join_date_project) < S && inProb(r)
      const crossDemExistAgent = r => r.pcn_type === 'Demotion Still In PJ' && !isAgent(r.position) &&
        (r.to_position == null || isAgent(r.to_position)) &&
        toS(r.join_date_project) !== null && toS(r.join_date_project) < S && inProb(r)
      return [
        ...tag('Mutation From Other PJ (Active)', A.filter(r =>
          r.hire_status === 'From Other PJ' && r.pcn_type === 'Active' && inP(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Resigned)', L.filter(r =>
          r.hire_status === 'From Other PJ' && r.pcn_type === 'Resign' && inP(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Promotion Out)', L.filter(r =>
          r.hire_status === 'From Other PJ' && r.pcn_type === 'Promotion Out Of PJ' && inP(r) && notYet(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Demotion Out)', L.filter(r =>
          r.hire_status === 'From Other PJ' && r.pcn_type === 'Demotion Out Of PJ' && inP(r) && notYet(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Mutation)', L.filter(r =>
          r.hire_status === 'From Other PJ' && r.pcn_type === 'Mutation' && inP(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Promosi Agent→Support, baru masuk periode ini)', L.filter(r =>
          r.hire_status === 'From Other PJ' && crossPromNewAgent(r) && ok(r)
        )),
        ...tag('Mutation From Other PJ (Demosi Support→Agent, baru masuk periode ini)', L.filter(r =>
          r.hire_status === 'From Other PJ' && crossDemNewSupp(r) && ok(r)
        )),
        ...tag('Cross-level Promosi Agent→Support (existing employee, semua hire_status)', L.filter(r =>
          crossPromExistSupp(r) && ok(r)
        )),
        ...tag('Cross-level Demosi Support→Agent (existing employee, semua hire_status)', L.filter(r =>
          crossDemExistAgent(r) && ok(r)
        )),
      ]
    }

    case 'endingHC': {
      // Ending HC = employees active at end of period E (= calcStarting with S = E+1)
      const Ep1 = E + 1
      return [
        ...tag('Active', A.filter(r => {
          const j = toS(r.join_date_project)
          return r.pcn_type === 'Active' && j !== null && j < Ep1 && ok(r)
        })),
        ...tag('Resign (masih aktif saat periode berakhir)', L.filter(r => {
          const j = toS(r.join_date_project); const e = toS(r.effective_resign_date)
          return r.pcn_type === 'Resign' && j !== null && j < Ep1 && e !== null && e >= Ep1 && ok(r)
        })),
        ...tag('Internal Move Out (masih aktif saat periode berakhir)', L.filter(r => {
          const j = toS(r.join_date_project); const p = toS(r.start_probation)
          return ['Promotion Out Of PJ','Mutation','Demotion Out Of PJ'].includes(r.pcn_type) &&
            j !== null && j < Ep1 && p !== null && p >= Ep1 && ok(r)
        })),
      ]
    }

    case 'attrPct':
      // Klik Attrition % → download data attrisi eksternal (dasar perhitungan %)
      return L.filter(r => {
        const e = toS(r.effective_resign_date)
        return r.pcn_type === 'Resign' && e !== null && e >= S && e <= E && ok(r)
      }).map(r => ({ ...r, _keterangan: r.resign_type || 'Resign' }))

    default:
      return []
  }
}
