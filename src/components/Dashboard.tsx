'use client'

import { useState, useEffect, useCallback } from 'react'
import IrrigationChart from './IrrigationChart'
import { IrrigationRecord } from '@/lib/types'
import { format, subDays } from 'date-fns'

type Period = '3d' | '7d' | '30d' | 'custom'
type Metric = 'mm' | 'hours'

export default function Dashboard() {
  const [records, setRecords] = useState<IrrigationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>('mm')
  const [period, setPeriod] = useState<Period>('3d')
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 3), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/records?from=${fromDate}&to=${toDate}`
      const res = await fetch(url)
      const data = await res.json()
      setRecords(data.records || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    const today = new Date()
    if (p === '3d') {
      setFromDate(format(subDays(today, 3), 'yyyy-MM-dd'))
      setToDate(format(today, 'yyyy-MM-dd'))
    } else if (p === '7d') {
      setFromDate(format(subDays(today, 7), 'yyyy-MM-dd'))
      setToDate(format(today, 'yyyy-MM-dd'))
    } else if (p === '30d') {
      setFromDate(format(subDays(today, 30), 'yyyy-MM-dd'))
      setToDate(format(today, 'yyyy-MM-dd'))
    }
  }

  const totalMm = records.reduce((s, r) => s + Number(r.lamina_mm), 0)
  const totalHours = records.reduce((s, r) => s + Number(r.durada_min), 0) / 60
  const sectors = new Set(records.map((r) => r.sector)).size

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vegga — Historial de Reg</h1>
            <p className="text-sm text-gray-500">Dashboard de reg per sectors</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Làmina total</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalMm.toFixed(1)} mm</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Hores totals</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalHours.toFixed(1)} h</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sectors actius</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{sectors}</p>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-base font-semibold text-gray-800">Reg per dia i sector</h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Metric toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setMetric('mm')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    metric === 'mm'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  mm / dia
                </button>
                <button
                  onClick={() => setMetric('hours')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    metric === 'hours'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Hores
                </button>
              </div>

              {/* Period selector */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['3d', '7d', '30d', 'custom'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p === '3d' ? '3 dies' : p === '7d' ? '7 dies' : p === '30d' ? '30 dies' : 'Personalitzat'}
                  </button>
                ))}
              </div>

              {/* Custom date range */}
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={fetchData}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <IrrigationChart records={records} metric={metric} />
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
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(r.data_inici).toLocaleString('ca-ES')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.sector}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">
                        {Number(r.lamina_mm).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {Number(r.durada_min).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {Number(r.volum_m3).toFixed(1)}
                      </td>
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
