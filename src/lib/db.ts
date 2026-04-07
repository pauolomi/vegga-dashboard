import { neon } from '@neondatabase/serverless'

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return sql
}

export async function initDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS irrigation_records (
      id SERIAL PRIMARY KEY,
      data_inici TIMESTAMP,
      data_fi TIMESTAMP,
      sector VARCHAR(255),
      num_sector INTEGER,
      area_ha DECIMAL(10,4),
      lamina_mm DECIMAL(10,4),
      durada_min DECIMAL(10,4),
      volum_m3 DECIMAL(10,4),
      cabal_real_m3h DECIMAL(10,4),
      equip VARCHAR(255),
      id_equip INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(data_inici, sector, id_equip)
    )
  `
}
