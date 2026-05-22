import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Fetch semua data dengan pagination (1000 per batch)
async function fetchAll(tableName) {
  let allData = []
  let from = 0
  const batchSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allData = [...allData, ...data]

    // Kalau data yang dikembalikan kurang dari batchSize, berarti sudah habis
    if (data.length < batchSize) break

    from += batchSize
  }

  return allData
}

export function useHcData() {
  const [activeData, setActiveData] = useState([])
  const [logData, setLogData]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [progress, setProgress]     = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      setProgress('Memuat data karyawan aktif...')
      const active = await fetchAll('hc_active')

      setProgress('Memuat log history...')
      const log = await fetchAll('hc_log_history')

      setActiveData(active)
      setLogData(log)
      setProgress('')
    } catch (err) {
      setError(err.message)
      setProgress('')
    } finally {
      setLoading(false)
    }
  }

  return {
    activeData,
    logData,
    loading,
    error,
    progress,
    refetch: loadAll
  }
}