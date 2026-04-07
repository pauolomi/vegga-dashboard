import { NextRequest, NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const sql = getDb()

    let records
    if (from && to) {
      records = await sql`
        SELECT * FROM irrigation_records
        WHERE data_inici >= ${from}::timestamp
          AND data_inici <= ${to}::timestamp + interval '1 day'
        ORDER BY data_inici ASC
      `
    } else {
      records = await sql`
        SELECT * FROM irrigation_records
        WHERE data_inici >= NOW() - interval '7 days'
        ORDER BY data_inici ASC
      `
    }

    return NextResponse.json({ records })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error fetching records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { records, api_key } = body

    if (api_key !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await initDb()
    const sql = getDb()

    let inserted = 0
    let skipped = 0

    for (const r of records) {
      try {
        await sql`
          INSERT INTO irrigation_records
            (data_inici, data_fi, sector, num_sector, area_ha, lamina_mm, durada_min, volum_m3, cabal_real_m3h, equip, id_equip)
          VALUES
            (${r.data_inici}, ${r.data_fi}, ${r.sector}, ${r.num_sector}, ${r.area_ha},
             ${r.lamina_mm}, ${r.durada_min}, ${r.volum_m3}, ${r.cabal_real_m3h}, ${r.equip}, ${r.id_equip})
          ON CONFLICT (data_inici, sector, id_equip) DO NOTHING
        `
        inserted++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ inserted, skipped })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error saving records' }, { status: 500 })
  }
}
