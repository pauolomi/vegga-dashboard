'use client'

import { useState, useEffect, useCallback } from 'react'

interface FertSector {
  sector: string
  num_sector: number
  cabal_m3h: number
  proportion: number
  liters: number
}

interface FertApplication {
  id: number
  applied_date: string
  start_time: string
  end_time: string
  program: string
  total_minutes: number
  pump_flow_l_min: number
  notes: string | null
  created_at: string
  sectors: FertSector[]
}

const PUMP_FLOW = 4 // L/min

export default function FertilizerSection() {
  const [applications, setApplications] = useState<FertApplication[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [preview, setPreview]           = useState<FertSector[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [msg, setMsg]                   = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // Form
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate]           = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime]     = useState('10:00')
  const [program, setProgram]     = useState<'F1' | 'F2'>('F1')
  const [minutes, setMinutes]     = useState('')
  const [notes, setNotes]         = useState('')

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/fertilizer')
      const data = await res.json()
      setApplications(data.applications || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const handlePreview = async () => {
    if (!date || !startTime || !endTime) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res  = await fetch(
        `/api/fertilizer/preview?date=${date}&start=${startTime}&end=${endTime}&minutes=${minutes || 0}`
      )
      const data = await res.json()
      setPreview(data.sectors || [])
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    if (!date || !startTime || !endTime || !minutes) return
    setSaving(true)
    try {
      const res = await fetch('/api/fertilizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applied_date: date,
          start_time:   startTime,
          end_time:     endTime,
          program,
          total_minutes: parseFloat(minutes),
          notes,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        showMsg(`✓ Aplicació desada. ${data.sectors_count} sectors distribuïts.`, true)
        setPreview(null)
        setMinutes('')
        setNotes('')
        await fetchApplications()
      } else {
        showMsg(`✗ Error: ${data.error}`, false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/fertilizer?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    await fetchApplications()
  }

  const totalLitersPreview = (preview ?? []).reduce((s, r) => s + r.liters, 0)

  return (
    <div className="space-y-6">

      {/* Formulari */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Registrar aplicació de fertilitzant
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPreview(null) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inici injecció</label>
            <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setPreview(null) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fi injecció</label>
            <input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setPreview(null) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Programa</label>
            <select value={program} onChange={e => setProgram(e.target.value as 'F1' | 'F2')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="F1">F1</option>
              <option value="F2">F2</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Minuts d&apos;injecció · cabal bomba {PUMP_FLOW} L/min
              {minutes ? <span className="ml-2 text-blue-600 font-semibold">= {(parseFloat(minutes) * PUMP_FLOW).toFixed(0)} L totals</span> : null}
            </label>
            <input
              type="number" min="0" step="1"
              value={minutes}
              onChange={e => { setMinutes(e.target.value); setPreview(null) }}
              placeholder="ex: 45"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="ex: 2a aplicació nitrogen"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePreview}
            disabled={previewLoading || !date || !startTime || !endTime}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {previewLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full" />
                Calculant…
              </span>
            ) : '👁 Previsualitzar sectors'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !minutes || !date}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Desant…' : '💾 Desar aplicació'}
          </button>
          {msg && (
            <span className={`text-sm font-medium ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
              {msg.text}
            </span>
          )}
        </div>

        {/* Previsualització */}
        {preview !== null && (
          <div className="mt-5 bg-green-50 border border-green-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-3">
              Distribució calculada
              {minutes && <span className="ml-2 font-normal text-green-600">· {totalLitersPreview.toFixed(1)} L totals</span>}
            </h3>
            {preview.length === 0 ? (
              <p className="text-sm text-gray-500">
                No s&apos;han trobat sectors regant en aquest interval de temps. Comprova les dates i hores.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2 pr-4">Sector</th>
                      <th className="text-right pb-2 pr-4">Cabal (m³/h)</th>
                      <th className="text-right pb-2 pr-4">Proporció</th>
                      <th className="text-right pb-2">Litres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(s => (
                      <tr key={s.sector} className="border-t border-green-100">
                        <td className="py-1.5 pr-4 font-medium text-gray-800">{s.sector}</td>
                        <td className="py-1.5 pr-4 text-right text-gray-600">{Number(s.cabal_m3h).toFixed(1)}</td>
                        <td className="py-1.5 pr-4 text-right text-gray-600">{(Number(s.proportion) * 100).toFixed(1)}%</td>
                        <td className="py-1.5 text-right font-bold text-green-700">{Number(s.liters).toFixed(1)} L</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-green-200 font-bold">
                      <td className="pt-2 pr-4" colSpan={3}>Total</td>
                      <td className="pt-2 text-right text-green-700">{totalLitersPreview.toFixed(1)} L</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Historial d&apos;aplicacions</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
          </div>
        ) : applications.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">
            No hi ha aplicacions registrades encara
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {applications.map(app => (
              <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Capçalera */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      app.program === 'F1'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {app.program}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(app.applied_date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {String(app.start_time).slice(0, 5)} – {String(app.end_time).slice(0, 5)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {app.total_minutes} min · {(Number(app.total_minutes) * Number(app.pump_flow_l_min)).toFixed(0)} L totals
                    </span>
                    {app.notes && (
                      <span className="text-xs text-gray-400 italic">{app.notes}</span>
                    )}
                  </div>

                  {/* Botó eliminar amb confirmació */}
                  {confirmDelete === app.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">Segur?</span>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel·lar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(app.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Sectors */}
                {app.sectors && app.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {app.sectors.map(s => (
                      <span
                        key={s.sector}
                        className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700"
                      >
                        <span className="font-semibold text-gray-900">S{s.num_sector}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-green-700 font-medium">{Number(s.liters).toFixed(1)} L</span>
                        <span className="ml-1 text-gray-400">({(Number(s.proportion) * 100).toFixed(0)}%)</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
