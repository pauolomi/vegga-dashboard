export interface IrrigationRecord {
  id: number
  data_inici: string
  data_fi: string
  sector: string
  num_sector: number
  area_ha: number
  lamina_mm: number
  durada_min: number
  volum_m3: number
  cabal_real_m3h: number
  equip: string
  id_equip: number
  created_at: string
}

export interface DayData {
  date: string
  [sector: string]: number | string
}
