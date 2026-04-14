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

export async function initFertilizerDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS fertilizer_applications (
      id SERIAL PRIMARY KEY,
      applied_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      program VARCHAR(10) NOT NULL,
      total_minutes DECIMAL(10,2) NOT NULL,
      pump_flow_l_min DECIMAL(10,2) DEFAULT 4.0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS fertilizer_sector_results (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES fertilizer_applications(id) ON DELETE CASCADE,
      sector VARCHAR(255),
      num_sector INTEGER,
      proportion DECIMAL(10,6),
      liters DECIMAL(10,2),
      cabal_m3h DECIMAL(10,4)
    )
  `
}
