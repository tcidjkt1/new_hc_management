import * as XLSX from 'xlsx'

// Kolom yang diutamakan & label-nya (sisanya ditambah di belakang)
const PREFERRED_COLS = [
  { key: '_keterangan',           label: 'Keterangan'            },
  { key: 'nik',                   label: 'NIK'                   },
  { key: 'name',                  label: 'Nama'                  },
  { key: 'employee_name',         label: 'Nama Karyawan'         },
  { key: 'position',              label: 'Position'              },
  { key: 'opg',                   label: 'Unit / OPG'            },
  { key: 'project',               label: 'Project'               },
  { key: 'channel',               label: 'Channel'               },
  { key: 'skill',                 label: 'Skill'                 },
  { key: 'site',                  label: 'Site'                  },
  { key: 'hire_status',           label: 'Hire Status'           },
  { key: 'pcn_type',              label: 'PCN Type'              },
  { key: 'to_position',           label: 'To Position'           },
  { key: 'join_date_project',     label: 'Join Date (Project)'   },
  { key: 'effective_resign_date', label: 'Effective Resign Date' },
  { key: 'resign_type',           label: 'Resign Type'           },
  { key: 'start_probation',       label: 'Start Probation'       },
]

export function downloadXlsx(rows, filename) {
  if (!rows || !rows.length) {
    alert('Tidak ada data untuk didownload.')
    return
  }

  // Build ordered column list: preferred first, then remaining keys
  const allKeys = Object.keys(rows[0])
  const prefKeys = PREFERRED_COLS.map(c => c.key).filter(k => allKeys.includes(k))
  const extraKeys = allKeys.filter(k => !prefKeys.includes(k) && !k.startsWith('_'))
  const orderedKeys = [...prefKeys, ...extraKeys]

  // Label map
  const labelMap = Object.fromEntries(PREFERRED_COLS.map(c => [c.key, c.label]))

  // Convert rows to sheet data with friendly column names
  const sheetData = rows.map(row => {
    const out = {}
    orderedKeys.forEach(k => {
      out[labelMap[k] || k] = row[k] ?? ''
    })
    return out
  })

  const ws = XLSX.utils.json_to_sheet(sheetData)

  // Set auto column widths
  const headers = Object.keys(sheetData[0] || {})
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 14) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Raw Data')

  // Sanitize filename
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 100)
  XLSX.writeFile(wb, `${safe}.xlsx`)
}
