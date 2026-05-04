export interface WeeklyRecord {
  semana: number
  fecha: string
  edad: number         // days
  pesoPromedio: number // kg
  gdp: number          // g/day — computed from consecutive weights
  cabezas: number
  pc?: number          // reference curve kg
}

export interface LotData {
  compania: string
  granja: string
  lote: string
  records: WeeklyRecord[]
}

export interface ReportData {
  lots: LotData[]
  generatedAt: string
}
