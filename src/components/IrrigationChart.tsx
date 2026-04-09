'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LabelList, ResponsiveContainer,
} from 'recharts'
import { IrrigationRecord } from '@/lib/types'
import { useMemo, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'

const COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6d28d9',
  '#0284c7', '#15803d',
]

interface Props {
  records: IrrigationRecord[]
  metric: 'mm' | 'hours'
  hiddenSectors: Set<string>
  onHiddenSectorsChange: (s: Set<string>) => void
}

// Label vertical: "S14 · 35min"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLabel(numSector: number | string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function BarLabel(props: any) {
    const { x, y, width, value } = props
    // value = minuts del sector (des de __m__sector)
    if (!value || Number(value) === 0 || !width || width < 5) return null

    const cx = x + width / 2
    const cy = y - 5
    const mins = Math.round(Number(value))

    return (
      <text
        x={cx}
        y={cy}
        transform={`rotate(-90, ${cx}, ${cy})`}
        textAnchor="start"
        dominantBaseline="central"
        fontSize={9}
        fill="#1f2937"
        fontWeight={600}
      >
        {`S${numSector} · ${mins}min`}
      </text>
    )
  }
}

export default function IrrigationChart({ records, metric, hiddenSectors, onHiddenSectorsChange }: Props) {

  const { chartData, sectors, numSectorMap } = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {}
    const sectorSet = new Set<string>()
    const numSectorMap: Record<string, number> = {}

    for (const r of records) {
      const day = format(new Date(r.data_inici), 'yyyy-MM-dd')
      if (!byDay[day]) byDay[day] = {}

      const s = r.sector
      sectorSet.add(s)
      numSectorMap[s] = r.num_sector

      // Valor principal (mm o hores)
      const value = metric === 'mm' ? r.lamina_mm : r.durada_min / 60
      byDay[day][s] = (byDay[day][s] || 0) + value

      // Minuts (sempre, per les etiquetes)
      const mk = `__m__${s}`
      byDay[day][mk] = (byDay[day][mk] || 0) + r.durada_min
    }

    const sectors = Array.from(sectorSet).sort()

    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({
        date: format(parseISO(day), 'dd/MM', { locale: ca }),
        ...data,
      }))

    return { chartData, sectors, numSectorMap }
  }, [records, metric])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendClick = useCallback((payload: any) => {
    const key = payload?.dataKey as string | undefined
    if (!key) return
    const next = new Set(hiddenSectors)
    next.has(key) ? next.delete(key) : next.add(key)
    onHiddenSectorsChange(next)
  }, [hiddenSectors, onHiddenSectorsChange])

  const allHidden = sectors.length > 0 && sectors.every(s => hiddenSectors.has(s))
  const toggleAll = () => onHiddenSectorsChange(allHidden ? new Set() : new Set(sectors))

  const unit = metric === 'mm' ? 'mm' : 'h'

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No hi ha dades per al període seleccionat
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleAll}
          className="text-xs font-medium px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {allHidden ? '☑ Seleccionar tots' : '☐ Deseleccionar tots'}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={chartData}
          margin={{ top: 70, right: 30, left: 10, bottom: 60 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(1)}${unit}`}
            tick={{ fontSize: 12 }}
            label={{
              value: metric === 'mm' ? 'Làmina (mm)' : 'Hores (h)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fontSize: 12, fill: '#6b7280' },
            }}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`${Number(value).toFixed(2)} ${unit}`]}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px', fontSize: '12px', cursor: 'pointer' }}
            formatter={(value, entry) => (
              <span style={{
                color: hiddenSectors.has(entry.dataKey as string) ? '#9ca3af' : '#111827',
                textDecoration: hiddenSectors.has(entry.dataKey as string) ? 'line-through' : 'none',
              }}>
                {value.length > 25 ? value.substring(0, 25) + '…' : value}
              </span>
            )}
            onClick={handleLegendClick}
          />
          {sectors.map((sector, i) => (
            <Bar
              key={sector}
              dataKey={sector}
              fill={COLORS[i % COLORS.length]}
              radius={[3, 3, 0, 0]}
              hide={hiddenSectors.has(sector)}
            >
              {/* LabelList llegeix __m__sector directament de cada entrada de dades */}
              <LabelList
                dataKey={`__m__${sector}`}
                position="top"
                content={makeLabel(numSectorMap[sector] ?? '?')}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
