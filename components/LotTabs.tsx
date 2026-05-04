'use client'

import clsx from 'clsx'
import type { LotData } from '@/lib/types'

interface Props {
  lots: LotData[]
  selectedIndex: number
  onChange: (i: number) => void
}

export default function LotTabs({ lots, selectedIndex, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {lots.map((lot, i) => (
        <button
          key={`${lot.lote}-${i}`}
          onClick={() => onChange(i)}
          className={clsx(
            'px-4 py-2.5 rounded-[6px] text-sm font-medium border transition-all duration-150 focus:outline-none',
          )}
          style={
            selectedIndex === i
              ? {
                  background: 'var(--ax-header)',
                  color: 'white',
                  border: '1px solid var(--ax-header)',
                }
              : {
                  background: 'var(--ax-bg)',
                  color: 'var(--ax-text-light)',
                  border: '1px solid var(--ax-border)',
                }
          }
          onMouseEnter={(e) => {
            if (selectedIndex !== i) {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ax-accent)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--ax-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIndex !== i) {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ax-border)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--ax-text-light)'
            }
          }}
        >
          <span className="block font-semibold" style={{ letterSpacing: '-0.2px' }}>{lot.lote}</span>
          <span className="block" style={{ fontSize: 11, opacity: 0.7 }}>{lot.granja}</span>
        </button>
      ))}
    </div>
  )
}
