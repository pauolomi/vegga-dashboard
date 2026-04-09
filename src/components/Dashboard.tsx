'use client'

import { useState, useEffect, useCallback } from 'react'
import IrrigationChart from './IrrigationChart'
import { IrrigationRecord } from '@/lib/types'
import { format, subDays } from 'date-fns'

type Period = '1d' | '3d' | '7d' | 'custom'
type Metric = 'mm' | 'hours'

interface EtoDay { date: string; eto: number }

export default function Dashboard() {
  const [records, setRecords]           = useState<IrrigationRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [syncing, setSyncing]           = useState(false)
  const [syncMsg, setSyncMsg]           = useState<string | null>(null)
  const [metric, setMetric]             = useState<Metric>('mm')
  const [period, setPeriod]             = useState<Period>('3d')
  const [fromDate, setFromDate]         = useState(format(subDays(new Date(), 3), 'yyyy-MM-dd'))
  const [toDate, setToDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hiddenSectors, setHiddenSectors] = useState<Set<string>>(new Set())
  const [etoDays, setEtoDays]           = useState<EtoDay[]>([])
  const [totalEto, setTotalEto]         = useState<number>(0)
  const [selectedSector, setSelectedSector] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, etoRes] = await Promise.all([
        fetch(`/api/records?from=${fromDate}&to=${toDate}`),
        fetch(`/api/eto?from=${fromDate}&to=${toDate}`),
      ])
      const recData = await recRes.json()
      const etoData = await etoRes.json()

      const recs = recData.records || []
      setRecords(recs)
      setEtoDays(etoData.days || [])
      setTotalEto(etoData.totalEto || 0)

      // Auto-seleccionar primer sector si no n'hi ha cap
      if (!selectedSector && recs.length > 0) {
        const sectors = [...new Set(recs.map((r: IrrigationRecord) => r.sector))] as string[]
        setSelectedSector(sectors[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    const today = new Date()
    const days: Record<string, number> = { '1d': 1, '3d': 3, '7d': 7 }
    if (days[p] !== undefined) {
      setFromDate(format(subDays(today, days[p]), 'yyyy-MM-dd'))
      setToDate(format(today, 'yyyy-MM-dd'))
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncMsg(`✓ ${data.inserted} nous registres afegits`)
        await fetchData()
      } else {
        setSyncMsg(`✗ Error: ${data.error}`)
      }
    } catch {
      setSyncMsg('✗ Error de connexió')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  // KPI: sectors visibles
  const visibleRecords = records.filter(r => !hiddenSectors.has(r.sector))
  const totalMm        = visibleRecords.reduce((s, r) => s + Number(r.lamina_mm), 0)
  const totalHours     = visibleRecords.reduce((s, r) => s + Number(r.durada_min), 0) / 60
  const numSectors     = new Set(visibleRecords.map(r => r.sector)).size

  // Llista de sectors visibles (ordenats) — usada per Kc i dropdown
  const allSectors = [...new Set(visibleRecords.map(r => r.sector))].sort()

  // Si el sector seleccionat ha quedat ocult, auto-seleccionar el primer visible
  const activeSector = allSectors.includes(selectedSector) ? selectedSector : (allSectors[0] ?? '')

  // KPI: Kc real del sector seleccionat (només sectors visibles)
  const sectorLamina = visibleRecords
    .filter(r => r.sector === activeSector)
    .reduce((s, r) => s + Number(r.lamina_mm), 0)
  const kc = totalEto > 0 && activeSector ? sectorLamina / totalEto : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vegga — Historial de Reg</h1>
              <p className="text-sm text-gray-500">Dashboard de reg per sectors</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {syncMsg && (
              <span className={`text-sm font-medium ${syncMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                {syncMsg}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {syncing ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Sincronitzant…
                </>
              ) : (
                <>↻ Sincronitzar Vegga</>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs — fila 1: reg */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Làmina total</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalMm.toFixed(1)} mm</p>
            <p className="text-xs text-gray-400 mt-1">sectors visibles</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Hores totals</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalHours.toFixed(1)} h</p>
            <p className="text-xs text-gray-400 mt-1">sectors visibles</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sectors actius</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{numSectors}</p>
          </div>
        </div>

        {/* KPIs — fila 2: ETo i Kc */}
        <div className="grid grid-cols-2 gap-4">
          {/* ETo acumulada */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">ETo acumulada (Lleida)</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">
              {loading ? '…' : `${totalEto.toFixed(1)} mm`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              FAO Penman-Monteith · {fromDate} → {toDate}
            </p>
            {etoDays.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {etoDays.map(d => (
                  <span key={d.date} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                    {d.date.slice(5)}: {d.eto.toFixed(1)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Kc real */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Kc real de reg</p>
              {allSectors.length > 0 && (
                <select
                  value={activeSector}
                  onChange={e => setSelectedSector(e.target.value)}
                  className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px]"
                >
                  {allSectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-2xl font-bold text-teal-600 mt-1">
              {loading ? '…' : kc !== null ? kc.toFixed(2) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeSector
                ? `Làmina: ${sectorLamina.toFixed(1)} mm / ETo: ${totalEto.toFixed(1)} mm`
                : 'Selecciona un sector'}
            </p>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-semibold text-gray-800">Reg per dia i sector</h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Metric toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['mm', 'hours'] as Metric[]).map((m) => (
                  <button key={m} onClick={() => setMetric(m)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${metric === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {m === 'mm' ? 'mm / dia' : 'Hores'}
                  </button>
                ))}
              </div>

              {/* Period selector */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['1d', '3d', '7d', 'custom'] as Period[]).map((p) => (
                  <button key={p} onClick={() => handlePeriodChange(p)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {p === '1d' ? '1 dia' : p === '3d' ? '3 dies' : p === '7d' ? '7 dies' : 'Personalitzat'}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  <span className="text-gray-400 text-sm">→</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                  <button onClick={fetchData}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <IrrigationChart
              records={records}
              metric={metric}
              hiddenSectors={hiddenSectors}
              onHiddenSectorsChange={setHiddenSectors}
            />
          )}
        </div>

        {/* Table */}
        {records.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Registres detallats</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Data inici</th>
                    <th className="px-4 py-3 text-left">Sector</th>
                    <th className="px-4 py-3 text-right">Làmina (mm)</th>
                    <th className="px-4 py-3 text-right">Durada (min)</th>
                    <th className="px-4 py-3 text-right">Volum (m³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.slice(0, 50).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">{new Date(r.data_inici).toLocaleString('ca-ES')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.sector}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">{Number(r.lamina_mm).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{Number(r.durada_min).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{Number(r.volum_m3).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 50 && (
                <p className="text-center text-sm text-gray-400 py-3">
                  Mostrant 50 de {records.length} registres
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
