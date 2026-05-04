import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { LotData, WeeklyRecord } from './types'

interface RawRow {
  Compania?: string
  Granja?: string
  Lote?: string
  Fecha?: string
  Semana?: string | number
  Edad_dias?: string | number
  Peso_Promedio_kg?: string | number
  Cabezas?: string | number
  PC_Referencia_kg?: string | number
  [key: string]: string | number | undefined
}

function parseNum(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function parseStr(val: string | number | undefined): string {
  if (val === undefined || val === null) return ''
  return String(val).trim()
}

// GDP is derived from consecutive weight records (g/day over the interval).
// For the first record there's no prior weight, so GDP = 0 as a sentinel
// that the chart/table will render as "—".
function computeGDP(records: Array<{ edad: number; pesoPromedio: number }>): number[] {
  return records.map((r, i) => {
    if (i === 0) return 0
    const prev = records[i - 1]
    const deltaDays = r.edad - prev.edad
    if (deltaDays <= 0) return 0
    return Math.round(((r.pesoPromedio - prev.pesoPromedio) * 1000) / deltaDays)
  })
}

function rowsToLots(rows: RawRow[]): LotData[] {
  const lotsMap = new Map<string, { compania: string; granja: string; lote: string; raw: Array<{ semana: number; fecha: string; edad: number; pesoPromedio: number; cabezas: number; pc?: number }> }>()

  for (const row of rows) {
    const compania = parseStr(row.Compania)
    const granja   = parseStr(row.Granja)
    const lote     = parseStr(row.Lote)

    if (!compania || compania.startsWith('#')) continue
    if (!lote) continue

    const key = `${compania}||${granja}||${lote}`
    if (!lotsMap.has(key)) lotsMap.set(key, { compania, granja, lote, raw: [] })

    const pcVal = parseNum(row.PC_Referencia_kg)
    lotsMap.get(key)!.raw.push({
      semana:       parseNum(row.Semana),
      fecha:        parseStr(row.Fecha),
      edad:         parseNum(row.Edad_dias),
      pesoPromedio: parseNum(row.Peso_Promedio_kg),
      cabezas:      parseNum(row.Cabezas),
      pc:           pcVal > 0 ? pcVal : undefined,
    })
  }

  return Array.from(lotsMap.values()).map(({ compania, granja, lote, raw }) => {
    raw.sort((a, b) => a.semana - b.semana)
    const gdps = computeGDP(raw)
    const records: WeeklyRecord[] = raw.map((r, i) => ({ ...r, gdp: gdps[i] }))
    return { compania, granja, lote, records }
  })
}

export function parseCSV(text: string): LotData[] {
  // Strip comment lines before parsing so PapaParse treats the first
  // non-comment line as the header row.
  const stripped = text
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')

  const firstLine = stripped.split('\n').find((l) => l.trim().length > 0) || ''
  const delimiter = firstLine.includes(';') ? ';' : ','

  const result = Papa.parse<RawRow>(stripped, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  })

  if (result.errors.length > 0) {
    const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.type === 'Quotes')
    if (fatal.length > 0) throw new Error(`Error al parsear CSV: ${fatal[0].message}`)
  }

  const rows = result.data.filter((row) => {
    const first = Object.values(row)[0]
    return first && !String(first).startsWith('#')
  })

  const lots = rowsToLots(rows)
  if (lots.length === 0) {
    throw new Error('No se encontraron datos válidos en el archivo. Verifica que las columnas sean correctas.')
  }
  return lots
}

export function parseExcel(buffer: ArrayBuffer): LotData[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('El archivo Excel no contiene hojas.')

  const worksheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: '', raw: false })

  const lots = rowsToLots(jsonData)
  if (lots.length === 0) {
    throw new Error('No se encontraron datos válidos en el archivo Excel. Verifica que las columnas sean correctas.')
  }
  return lots
}

export function generateMockData(
  compania: string,
  granja: string,
  lote: string,
  semanas: number
): LotData {
  const n = Math.min(Math.max(semanas, 1), 26)

  const baseWeights = [
    2.1, 3.8, 6.2, 9.5, 13.8, 18.9, 24.5, 30.8, 37.4, 44.1,
    51.2, 57.8, 64.1, 70.0, 75.5, 80.5, 85.1, 89.2, 93.0, 96.4,
    99.5, 102.1, 104.4, 106.3, 108.0, 109.4,
  ]
  const baseAges  = [7,14,21,28,35,42,49,56,63,70,77,84,91,98,105,112,119,126,133,140,147,154,161,168,175,182]
  const baseCabezas = 1000 + Math.floor(Math.random() * 300)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - n * 7)

  const raw = Array.from({ length: n }, (_, i) => {
    const v = 1 + (Math.random() - 0.5) * 0.06
    const peso = Math.round(baseWeights[i] * v * 10) / 10
    const pc   = Math.round(baseWeights[i] * 1.05 * 10) / 10
    const fecha = new Date(startDate)
    fecha.setDate(fecha.getDate() + i * 7)
    return {
      semana:       i + 1,
      fecha:        fecha.toISOString().split('T')[0],
      edad:         baseAges[i],
      pesoPromedio: peso,
      cabezas:      Math.round(baseCabezas * (1 - i * 0.0025)),
      pc,
    }
  })

  const gdps = computeGDP(raw)
  const records: WeeklyRecord[] = raw.map((r, i) => ({ ...r, gdp: gdps[i] }))
  return { compania, granja, lote, records }
}
