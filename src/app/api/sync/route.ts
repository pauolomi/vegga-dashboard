import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

const VEGGA_LOGIN_URL = 'https://vegga-prod.azure-api.net/login'
const VEGGA_API_BASE  = 'https://vegga-prod.azure-api.net/irrigation-control-service'
const CLIENT_ID       = '70aa1ea0-8fdb-4edc-a80e-10a3da9b4146'
const DEVICE_TYPE     = 'A2500'
const DEVICE_ID       = '3006'

async function getVeggaToken(): Promise<string> {
  const body = new URLSearchParams({
    username:      process.env.VEGGA_USER!,
    password:      process.env.VEGGA_PASS!,
    grant_type:    'password',
    scope:         `openid ${CLIENT_ID} offline_access`,
    client_id:     CLIENT_ID,
    response_type: 'token',
  })

  const res = await fetch(VEGGA_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchVeggaHistory(token: string, days = 30): Promise<any[]> {
  const now   = new Date()
  const from  = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const toStr = now.toISOString().split('T')[0]
  const frStr = from.toISOString().split('T')[0]

  const allRecords = []
  let page = 1

  while (true) {
    const url = `${VEGGA_API_BASE}/devices/${DEVICE_TYPE}/${DEVICE_ID}/history/sectors` +
      `?from=${frStr}&to=${toStr}&grouping=DAY&sector=0&pageNumber=${page}&pageSize=100`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) break
    const data = await res.json()

    // Extreure registres de la resposta paginada
    let records = []
    if (Array.isArray(data)) {
      records = data
    } else if (data && typeof data === 'object') {
      for (const key of ['content', 'data', 'items', 'records', 'results', 'sectors']) {
        if (Array.isArray(data[key])) { records = data[key]; break }
      }
    }

    if (records.length === 0) break
    allRecords.push(...records)
    if (records.length < 100) break
    page++
  }

  return allRecords
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRecord(r: any) {
  const toMin = (cell: any) => {
    if (typeof cell === 'object' && cell !== null) {
      const v = cell.value ?? 0
      const u = (cell.unit ?? 'SECONDS').toUpperCase()
      return u === 'SECONDS' ? Math.round(v / 60 * 10) / 10 : v
    }
    return Number(cell) || 0
  }

  const toM3 = (cell: any) => {
    if (typeof cell === 'object' && cell !== null) {
      const v = cell.value ?? 0
      const u = (cell.unit ?? '').toUpperCase()
      return u === 'LITERS' ? Math.round(v / 1000 * 10000) / 10000 : v
    }
    return Number(cell) || 0
  }

  const toFlow = (cell: any) => {
    if (typeof cell === 'object' && cell !== null) return cell.actual ?? cell.value ?? 0
    return Number(cell) || 0
  }

  const toDate = (v: string) => {
    if (!v) return null
    try { return new Date(v).toISOString() } catch { return null }
  }

  return {
    data_inici:     toDate(r.dateFrom),
    data_fi:        toDate(r.dateTo),
    sector:         r.sectorName ?? r.sector ?? '',
    num_sector:     Number(r.sectorNumber ?? r.num_sector ?? 0),
    area_ha:        Number(r.sectorArea ?? r.area_ha ?? 0),
    lamina_mm:      Number(r.irrigationSheet ?? r.lamina_mm ?? 0),
    durada_min:     toMin(r.time ?? r.durada_min),
    volum_m3:       toM3(r.volume ?? r.volum_m3),
    cabal_real_m3h: toFlow(r.flow ?? r.cabal_real_m3h),
    equip:          r.deviceName ?? r.equip ?? '',
    id_equip:       Number(r.deviceId ?? r.id_equip ?? 0),
  }
}

export async function POST() {
  try {
    const token   = await getVeggaToken()
    const rawData = await fetchVeggaHistory(token, 30)
    const records = rawData.map(parseRecord).filter(r => r.data_inici)

    await initDb()
    const sql = getDb()

    let inserted = 0
    let skipped  = 0

    for (const r of records) {
      try {
        await sql`
          INSERT INTO irrigation_records
            (data_inici, data_fi, sector, num_sector, area_ha, lamina_mm,
             durada_min, volum_m3, cabal_real_m3h, equip, id_equip)
          VALUES
            (${r.data_inici}, ${r.data_fi}, ${r.sector}, ${r.num_sector}, ${r.area_ha},
             ${r.lamina_mm}, ${r.durada_min}, ${r.volum_m3}, ${r.cabal_real_m3h},
             ${r.equip}, ${r.id_equip})
          ON CONFLICT (data_inici, sector, id_equip) DO NOTHING
        `
        inserted++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({
      ok: true,
      fetched: records.length,
      inserted,
      skipped,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
