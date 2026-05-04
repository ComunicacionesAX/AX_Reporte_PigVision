'use client'

import type { LotData } from '@/lib/types'

interface Props {
  lot: LotData
}

function gdpStyle(gdp: number, isFirst: boolean): React.CSSProperties {
  if (isFirst) return { color: 'var(--ax-text-light)', fontStyle: 'italic' }
  if (gdp > 700) return { background: 'rgba(14,86,123,0.12)', color: 'var(--ax-primary)', fontWeight: 700 }
  if (gdp >= 400) return { background: '#FEF3C7', color: '#92400E', fontWeight: 700 }
  return { background: 'rgba(192,6,43,0.1)', color: 'var(--ax-error)', fontWeight: 700 }
}

function deltaStyle(delta: number | null): React.CSSProperties {
  if (delta === null) return {}
  return { color: delta >= 0 ? 'var(--ax-primary)' : 'var(--ax-error)', fontWeight: 600 }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: 'var(--ax-text-light)',
  background: 'var(--ax-bg-alt)',
  borderBottom: '1px solid var(--ax-border)',
  whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...thStyle, textAlign: 'right' }

export default function WeeklyTable({ lot }: Props) {
  const { records } = lot

  return (
    <div className="overflow-x-auto" style={{ borderRadius: 8, border: '1px solid var(--ax-border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>Semana</th>
            <th style={thStyle}>Fecha de cierre</th>
            <th style={thR}>Edad (días)</th>
            <th style={thR}>Peso Prom. (kg)</th>
            <th style={thR}>GDP (g/día)</th>
            <th style={thR}>Cabezas</th>
            <th style={thR}>PC Ref. (kg)</th>
            <th style={thR}>Δ vs PC (kg)</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, idx) => {
            const isFirst = idx === 0
            const deltaPc =
              record.pc !== undefined
                ? Math.round((record.pesoPromedio - record.pc) * 10) / 10
                : null
            const rowBg = idx % 2 === 1 ? 'var(--ax-bg-alt)' : 'var(--ax-bg)'
            const td: React.CSSProperties  = { padding: '9px 12px', borderBottom: '1px solid var(--ax-border)', color: 'var(--ax-text)' }
            const tdR: React.CSSProperties = { ...td, textAlign: 'right' }
            const tdM: React.CSSProperties = { ...td, color: 'var(--ax-text-light)' }
            const tdMR: React.CSSProperties = { ...tdM, textAlign: 'right' }

            return (
              <tr
                key={record.semana}
                style={{ background: rowBg, transition: 'background 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
              >
                <td style={{ ...td, fontWeight: 600 }}>{record.semana}</td>
                <td style={{ ...tdM, whiteSpace: 'nowrap' }}>{formatDate(record.fecha)}</td>
                <td style={tdR}>{record.edad}</td>
                <td style={{ ...tdR, fontWeight: 600 }}>{record.pesoPromedio.toFixed(1)}</td>
                <td style={tdR}>
                  {isFirst ? (
                    <span style={{ color: 'var(--ax-text-light)', fontStyle: 'italic', fontSize: 12 }}>—</span>
                  ) : (
                    <span style={{ ...gdpStyle(record.gdp, false), display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      {record.gdp}
                    </span>
                  )}
                </td>
                <td style={tdR}>{record.cabezas.toLocaleString('es-MX')}</td>
                <td style={tdMR}>{record.pc !== undefined ? record.pc.toFixed(1) : '—'}</td>
                <td style={{ ...tdR, ...deltaStyle(deltaPc) }}>
                  {deltaPc !== null ? `${deltaPc >= 0 ? '+' : ''}${deltaPc.toFixed(1)}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
