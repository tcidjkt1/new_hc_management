export default function FilterBar({ filters, onChange, activeData, logData }) {
  const all = [...(activeData || []), ...(logData || [])]

  const unique = (col, parent = {}) => ['All', ...[...new Set(
    all.filter(r =>
      (!parent.opg  || parent.opg  === 'All' || r.opg     === parent.opg) &&
      (!parent.proj || parent.proj === 'All' || r.project  === parent.proj)
    ).map(r => r[col]).filter(Boolean)
  )].sort()]

  const sel = (id, val) => {
    const reset = {}
    if (id === 'opg') reset.proj = 'All'
    if (id === 'opg' || id === 'proj') {
      reset.pos = 'All'
      reset.channel = 'All'
      reset.skill = 'All'
      reset.site = 'All'
    }
    onChange({ ...filters, [id]: val, ...reset })
  }

  const fields = [
    { id: 'opg',     label: 'Unit/OPG',  opts: unique('opg') },
    { id: 'proj',    label: 'Project',   opts: unique('project',  { opg: filters.opg }) },
    { id: 'pos',     label: 'Position',  opts: unique('position', { opg: filters.opg, proj: filters.proj }) },
    { id: 'channel', label: 'Channel',   opts: unique('channel',  { opg: filters.opg, proj: filters.proj }) },
    { id: 'skill',   label: 'Skill',     opts: unique('skill',    { opg: filters.opg, proj: filters.proj }) },
    { id: 'site',    label: 'Site',      opts: unique('site',     { opg: filters.opg, proj: filters.proj }) },
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {fields.map(({ id, label, opts }) => (
        <div key={id} className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>
          <select
            value={filters[id] || 'All'}
            onChange={e => sel(id, e.target.value)}
            className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 min-w-[110px]"
          >
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}