import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'

const LLEIDA_LAT = 41.6171
const LLEIDA_LON = 0.6288

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || format(subDays(new Date(), 3), 'yyyy-MM-dd')
  const to   = searchParams.get('to')   || format(new Date(), 'yyyy-MM-dd')

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${LLEIDA_LAT}&longitude=${LLEIDA_LON}` +
      `&start_date=${from}&end_date=${to}` +
      `&daily=et0_fao_evapotranspiration&timezone=Europe%2FMadrid`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

    const data = await res.json()
    const days: { date: string; eto: number }[] = data.daily.time.map(
      (date: string, i: number) => ({
        date,
        eto: data.daily.et0_fao_evapotranspiration[i] ?? 0,
      })
    )
    const totalEto = days.reduce((s, d) => s + d.eto, 0)

    return NextResponse.json({ days, totalEto: Math.round(totalEto * 100) / 100 })
  } catch (error) {
    console.error('ETo fetch error:', error)
    return NextResponse.json({ error: 'Error fetching ETo data' }, { status: 500 })
  }
}
