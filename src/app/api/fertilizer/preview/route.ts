import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date    = searchParams.get('date')!
    const start   = searchParams.get('start')!
    const end     = searchParams.get('end')!
    const minutes = parseFloat(searchParams.get('minutes') || '0')

    const sql     = getDb()
    const startDt = `${date} ${start}`
    const endDt   = `${date} ${end}`

    const sectors = await sql`
      SELECT
        sector,
        num_sector,
        AVG(cabal_real_m3h)::numeric AS cabal_m3h
      FROM irrigation_records
      WHERE data_inici <= ${endDt}::timestamp
        AND (
          data_fi   >= ${startDt}::timestamp
          OR (data_fi IS NULL AND data_inici >= ${startDt}::timestamp)
        )
        AND cabal_real_m3h > 0
      GROUP BY sector, num_sector
      ORDER BY cabal_m3h DESC
    `

    const totalCabal  = sectors.reduce((s, r) => s + Number(r.cabal_m3h), 0)
    const pumpFlow    = 4.0
    const totalLiters = minutes * pumpFlow

    const result = sectors.map(s => {
      const proportion = totalCabal > 0
        ? Number(s.cabal_m3h) / totalCabal
        : 1 / sectors.length
      return {
        sector:     s.sector,
        num_sector: s.num_sector,
        cabal_m3h:  Number(s.cabal_m3h),
        proportion,
        liters:     proportion * totalLiters,
      }
    })

    return NextResponse.json({ sectors: result, total_liters: totalLiters })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error calculating preview' }, { status: 500 })
  }
}
