'use client'

import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import type { LotData } from '@/lib/types'

interface Props {
  lot: LotData
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0
  const status = value > 700 ? 'Excelente' : value >= 400 ? 'Aceptable' : 'Bajo'
  const statusColor = value > 700 ? 'var(--ax-primary)' : value >= 400 ? '#B45309' : 'var(--ax-error)'
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
      <p className="font-semibold mb-1" style={{ color: 'var(--ax-text)', letterSpacing: '-0.2px' }}>{label}</p>
      <p style={{ color: 'var(--ax-text-light)' }}>
        GDP: <span className="font-bold" style={{ color: 'var(--ax-text)' }}>{value} g/día</span>
      </p>
      <p className="font-medium mt-1" style={{ fontSize: 12, color: statusColor }}>{status}</p>
    </div>
  )
}

function getBarColor(value: number): string {
  if (value > 700) return '#0E567B'
  if (value >= 400) return '#D97706'
  return '#C0062B'
}

export default function GDPChart({ lot }: Props) {
  const data = lot.records.map((r) => ({
    name: `Sem ${r.semana}`,
    gdp: r.gdp,
  }))

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ax-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--ax-text-light)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            label={{ value: 'g/día', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: 'var(--ax-text-light)' }}
            tick={{ fontSize: 11, fill: 'var(--ax-text-light)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--ax-bg-alt)' }} />
          <ReferenceLine
            y={700}
            stroke="var(--ax-accent)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: 'Meta: 700', position: 'insideTopLeft', fontSize: 11, fill: 'var(--ax-accent)' }}
          />
          <Bar dataKey="gdp" name="GDP" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.gdp)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
