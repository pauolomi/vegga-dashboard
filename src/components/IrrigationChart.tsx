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

export default function IrrigationChart({ records, metric }: Props) {
  const { chartData, sectors } = useMemo(() => {
    // Group by day
    const byDay: Record<string, Record<string, number>> = {}
    const sectorSet = new Set<string>()

    for (const r of records) {
      const day = format(new Date(r.data_inici), 'yyyy-MM-dd')
      if (!byDay[day]) byDay[day] = {}

      const sectorName = r.sector
      sectorSet.add(sectorName)

      const value = metric === 'mm' ? r.lamina_mm : r.durada_min / 60
      byDay[day][sectorName] = (byDay[day][sectorName] || 0) + value
    }

    const sectors = Array.from(sectorSet).sort()

    const chartData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, sectorData]) => ({
        date: format(parseISO(day), 'dd/MM', { locale: ca }),
        fullDate: day,
        ...sectorData,
      }))

    return { chartData, sectors }
  }, [records, metric])

  const unit = metric === 'mm' ? 'mm' : 'h'

  const formatTooltip = (value: number, name: string) => [
    `${value.toFixed(2)} ${unit}`,
    name,
  ]

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No hi ha dades per al període seleccionat
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
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
        <Tooltip formatter={formatTooltip} />
        <Legend
          wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
          formatter={(value) => value.length > 25 ? value.substring(0, 25) + '…' : value}
        />
        {sectors.map((sector, i) => (
          <Bar
            key={sector}
            dataKey={sector}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
            radius={i === sectors.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
