'use client'

import { Scale, TrendingUp, Users, Clock } from 'lucide-react'
import type { LotData } from '@/lib/types'

interface Props {
  lot: LotData
}

export default function SummaryCards({ lot }: Props) {
  const { records } = lot
  if (records.length === 0) return null

  const lastRecord  = records[records.length - 1]
  const firstRecord = records[0]

  const pesoFinal  = lastRecord.pesoPromedio
  // GDP from week 2 onward (week 1 has no prior reference)
  const gdpRecords = records.filter((r) => r.gdp > 0)
  const avgGDP     = gdpRecords.length > 0
    ? gdpRecords.reduce((s, r) => s + r.gdp, 0) / gdpRecords.length
    : 0
  const cabezasActuales = lastRecord.cabezas
  const duracion   = lastRecord.edad - firstRecord.edad

  const cards = [
    {
      label: 'Peso Final',
      value: `${pesoFinal.toFixed(1)} kg`,
      icon: Scale,
      accent: 'var(--ax-primary)',
      bg: '#EBF5FF',
    },
    {
      label: 'GDP Promedio',
      value: `${avgGDP.toFixed(0)} g/día`,
      icon: TrendingUp,
      accent: 'var(--ax-accent)',
      bg: '#EFF6FF',
    },
    {
      label: 'Cabezas Actuales',
      value: cabezasActuales.toLocaleString('es-MX'),
      icon: Users,
      accent: 'var(--ax-aqua-gray)',
      bg: '#F0F7FB',
    },
    {
      label: 'Duración',
      value: `${duracion} días`,
      icon: Clock,
      accent: '#7C3AED',
      bg: '#F5F3FF',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-[8px] p-4 flex flex-col gap-2"
            style={{
              background: card.bg,
              border: '1px solid var(--ax-border)',
              borderLeft: `4px solid ${card.accent}`,
            }}
          >
            <div className="flex items-center gap-2">
              <Icon size={15} style={{ color: card.accent, flexShrink: 0 }} />
              <span
                className="font-semibold uppercase"
                style={{ fontSize: 11, letterSpacing: '0.5px', color: 'var(--ax-text-light)' }}
              >
                {card.label}
              </span>
            </div>
            <div
              className="font-bold"
              style={{ fontSize: 24, lineHeight: '26px', letterSpacing: '-0.45px', color: 'var(--ax-text)' }}
            >
              {card.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
