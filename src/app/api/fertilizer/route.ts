import { NextRequest, NextResponse } from 'next/server'
import { getDb, initFertilizerDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    const apps = await sql`
      SELECT
        fa.*,
        COALESCE(
          json_agg(
            json_build_object(
              'sector',     fsr.sector,
              'num_sector', fsr.num_sector,
              'proportion', fsr.proportion,
              'liters',     fsr.liters,
              'cabal_m3h',  fsr.cabal_m3h
            ) ORDER BY fsr.liters DESC
          ) FILTER (WHERE fsr.id IS NOT NULL),
          '[]'
        ) AS sectors
      FROM fertilizer_applications fa
      LEFT JOIN fertilizer_sector_results fsr ON fsr.application_id = fa.id
      GROUP BY fa.id
      ORDER BY fa.applied_date DESC, fa.created_at DESC
    `
    return NextResponse.json({ applications: apps })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error fetching fertilizer data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { applied_date, start_time, end_time, program, total_minutes, notes } = await req.json()

    await initFertilizerDb()
    const sql = getDb()

    const startDt = `${applied_date} ${start_time}`
    const endDt   = `${applied_date} ${end_time}`

    // Sectors que regaven durant la finestra d'injecció
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
    `

    const totalCabal  = sectors.reduce((s, r) => s + Number(r.cabal_m3h), 0)
    const pumpFlow    = 4.0  // L/min
    const totalLiters = Number(total_minutes) * pumpFlow

    // Inserir aplicació
    const [app] = await sql`
      INSERT INTO fertilizer_applications
        (applied_date, start_time, end_time, program, total_minutes, notes)
      VALUES
        (${applied_date}, ${start_time}, ${end_time}, ${program}, ${total_minutes}, ${notes || null})
      RETURNING id
    `

    // Inserir distribució per sector
    for (const s of sectors) {
      const proportion = totalCabal > 0
        ? Number(s.cabal_m3h) / totalCabal
        : 1 / sectors.length
      const liters = proportion * totalLiters
      await sql`
        INSERT INTO fertilizer_sector_results
          (application_id, sector, num_sector, proportion, liters, cabal_m3h)
        VALUES
          (${app.id}, ${s.sector}, ${s.num_sector}, ${proportion}, ${liters}, ${s.cabal_m3h})
      `
    }

    return NextResponse.json({ ok: true, id: app.id, sectors_count: sectors.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error saving fertilizer application' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const sql = getDb()
    await sql`DELETE FROM fertilizer_applications WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error deleting' }, { status: 500 })
  }
}
