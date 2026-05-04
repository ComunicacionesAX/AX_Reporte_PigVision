'use client'

import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { LotData } from '@/lib/types'

interface Props {
  lots: LotData[]
}

const LOT_COLORS = ['#0E567B', '#4BA2FF', '#00E3FF', '#7EC6DE', '#050B49', '#90C0E7']

interface ChartPoint { edad: number; [key: string]: number | undefined }

interface TooltipProps {
  active?: boolean
  payload?: Array<{ color: string; name: string; value: number }>
  label?: number
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: 'var(--ax-bg)',
        border: '1px solid var(--ax-border)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: 13,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: 'var(--ax-text)', letterSpacing: '-0.2px' }}>
        Edad: {label} días
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }}
          />
          <span style={{ color: 'var(--ax-text-light)' }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--ax-text)' }}>
            {entry.value?.toFixed(1)} kg
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GrowthChart({ lots }: Props) {
  const edadSet = new Set<number>()
  lots.forEach((lot) => lot.records.forEach((r) => edadSet.add(r.edad)))
  const firstLotWithPC = lots.find((l) => l.records.some((r) => r.pc !== undefined))
  if (firstLotWithPC) firstLotWithPC.records.forEach((r) => { if (r.pc !== undefined) edadSet.add(r.edad) })

  const sortedEdades = Array.from(edadSet).sort((a, b) => a - b)

  const data: ChartPoint[] = sortedEdades.map((edad) => {
    const point: ChartPoint = { edad }
    lots.forEach((lot, i) => {
      const record = lot.records.find((r) => r.edad === edad)
      if (record) point[`lot_${i}`] = record.pesoPromedio
    })
    if (firstLotWithPC) {
      const record = firstLotWithPC.records.find((r) => r.edad === edad && r.pc !== undefined)
      if (record?.pc !== undefined) point['pc_ref'] = record.pc
    }
    return point
  })

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ax-border)" />
          <XAxis
            dataKey="edad"
            label={{ value: 'Edad (días)', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'var(--ax-text-light)' }}
            tick={{ fontSize: 11, fill: 'var(--ax-text-light)' }}
            tickLine={false}
          />
          <YAxis
            label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: 'var(--ax-text-light)' }}
            tick={{ fontSize: 11, fill: 'var(--ax-text-light)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={9} />

          {lots.map((lot, i) => (
            <Line
              key={`lot_${i}`}
              type="monotone"
              dataKey={`lot_${i}`}
              name={`${lot.lote} (${lot.granja})`}
              stroke={LOT_COLORS[i % LOT_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: LOT_COLORS[i % LOT_COLORS.length] }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}

          {firstLotWithPC && (
            <Line
              type="monotone"
              dataKey="pc_ref"
              name="Curva PC Referencia"
              stroke="var(--ax-aqua-gray)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
