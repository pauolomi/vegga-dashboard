'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { IrrigationRecord } from '@/lib/types'
import { useMemo } from 'react'
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
}

// Label vertical sobre cada barra: "S14 · 2.5h"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBarLabel(numSector: number | string, hoursKey: string, chartData: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function BarLabel(props: any) {
    const { x, y, width, value, index } = props
    if (!value || value === 0 || width < 5) return null

    const hours = chartData[index]?.[hoursKey] ?? value
    const cx = x + width / 2
    const cy = y - 5

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
        {`S${numSector} · ${Number(hours).toFixed(1)}h`}
      </text>
    )
  }
}

export default function IrrigationChart({ records, metric }: Props) {
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

      // Valor del mètric principal (mm o hores)
      const value = metric === 'mm' ? r.lamina_mm : r.durada_min / 60
      byDay[day][s] = (byDay[day][s] || 0) + value

      // Hores acumulades (sempre, per l'etiqueta)
      const hk = `__h__${s}`
      byDay[day][hk] = (byDay[day][hk] || 0) + r.durada_min / 60
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

  const unit = metric === 'mm' ? 'mm' : 'h'

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No hi ha dades per al període seleccionat
      </div>
    )
  }

  return (
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
          formatter={(value: any, name: string) => [
            `${Number(value).toFixed(2)} ${unit}`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
          formatter={(value) => value.length > 25 ? value.substring(0, 25) + '…' : value}
        />
        {sectors.map((sector, i) => (
          <Bar
            key={sector}
            dataKey={sector}
            fill={COLORS[i % COLORS.length]}
            radius={[3, 3, 0, 0]}
            label={makeBarLabel(numSectorMap[sector] ?? '?', `__h__${sector}`, chartData)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
