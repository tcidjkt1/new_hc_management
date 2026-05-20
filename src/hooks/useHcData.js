import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useHcData() {
  const [activeData, setActiveData] = useState([])
  const [logData, setLogData]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: active, error: e1 }, { data: log, error: e2 }] = await Promise.all([
        supabase.from('hc_active').select('*'),
        supabase.from('hc_log_history').select('*'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setActiveData(active || [])
      setLogData(log || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { activeData, logData, loading, error, refetch: fetchAll }
}