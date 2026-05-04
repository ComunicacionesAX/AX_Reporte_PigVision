'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Calendar, Building2, Warehouse, Hash, Loader2 } from 'lucide-react'
import type { ReportData } from '@/lib/types'
import SummaryCards from '@/components/SummaryCards'
import GrowthChart from '@/components/GrowthChart'
import GDPChart from '@/components/GDPChart'
import WeeklyTable from '@/components/WeeklyTable'
import LotTabs from '@/components/LotTabs'
import { generateExportHTML } from '@/lib/exportHTML'

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
  } catch {
    return isoStr
  }
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function ReportPage() {
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedLotIndex, setSelectedLotIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('reportData')
      if (!raw) { setError('no-data'); setLoading(false); return }
      const data: ReportData = JSON.parse(raw)
      if (!data.lots || data.lots.length === 0) { setError('empty'); setLoading(false); return }
      setReportData(data)
    } catch {
      setError('parse')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDownloadHTML = () => {
    if (!reportData) return
    const html = generateExportHTML(reportData.lots)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = `reporte_pv_${(reportData.lots[0]?.compania ?? 'reporte').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ax-bg-alt)' }}>
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-4" style={{ color: 'var(--ax-accent)' }} />
          <p style={{ color: 'var(--ax-text-light)', fontSize: 14 }}>Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ax-bg-alt)' }}>
        <div className="ax-card max-w-md w-full p-10 text-center shadow-sm">
          <span className="text-5xl block mb-4">📭</span>
          <h2 className="font-bold mb-2" style={{ fontSize: 20, color: 'var(--ax-text)' }}>
            No hay datos de reporte
          </h2>
          <p className="ax-small mb-6" style={{ color: 'var(--ax-text-light)' }}>
            {error === 'no-data'
              ? 'No se encontraron datos en la sesión. Por favor regresa y carga un archivo.'
              : error === 'empty'
              ? 'El reporte no contiene lotes de datos. Verifica tu archivo.'
              : 'Ocurrió un error al leer los datos del reporte.'}
          </p>
          <button onClick={() => router.push('/')} className="ax-btn-primary">
            <ArrowLeft size={15} /> Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (!reportData) return null

  const { lots, generatedAt } = reportData
  const selectedLot = lots[selectedLotIndex] ?? lots[0]
  const firstRecord = selectedLot?.records[0]
  const lastRecord = selectedLot?.records[selectedLot.records.length - 1]

  return (
    <div className="min-h-screen" style={{ background: 'var(--ax-bg-alt)' }}>

      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--ax-header)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="ax-btn-ghost">
              <ArrowLeft size={14} /> Volver
            </button>
            <div className="hidden sm:block w-px h-5 bg-white opacity-15" />
            <img src="/logo-asimetrix.png" alt="Asimetrix" className="hidden sm:block" style={{ height: 28, width: 'auto' }} />
            <div className="hidden sm:block w-px h-5 bg-white opacity-15" />
            <div className="hidden sm:block">
              <p className="font-semibold" style={{ color: 'white', fontSize: 14, letterSpacing: '-0.2px' }}>
                Reporte de Peso Vivo
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                Generado: {generatedAt ? formatDate(generatedAt) : '—'}
              </p>
            </div>
          </div>

          <button onClick={handleDownloadHTML} className="ax-btn-accent">
            <Download size={14} />
            <span className="hidden sm:inline">Descargar HTML</span>
            <span className="sm:hidden">HTML</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Lot tabs */}
        {lots.length > 1 && (
          <div className="ax-card p-4 shadow-sm">
            <p
              className="mb-3 font-semibold uppercase"
              style={{ fontSize: 11, letterSpacing: '0.5px', color: 'var(--ax-text-light)' }}
            >
              {lots.length} lotes en este reporte
            </p>
            <LotTabs lots={lots} selectedIndex={selectedLotIndex} onChange={setSelectedLotIndex} />
          </div>
        )}

        {/* Comparison chart (multi-lot) */}
        {lots.length > 1 && (
          <div className="ax-card p-5 shadow-sm">
            <h2
              className="font-bold mb-4"
              style={{ fontSize: 16, letterSpacing: '-0.3px', color: 'var(--ax-text)' }}
            >
              Curva de Crecimiento — Comparativa de Lotes
            </h2>
            <GrowthChart lots={lots} />
          </div>
        )}

        {/* Lot info bar */}
        {selectedLot && (
          <div
            className="ax-card px-5 py-4 shadow-sm"
            style={{ borderLeft: '4px solid var(--ax-accent)' }}
          >
            <div className="flex flex-wrap items-center gap-4 ax-small" style={{ color: 'var(--ax-text-light)' }}>
              {[
                { icon: Building2, label: 'Compañía', value: selectedLot.compania },
                { icon: Warehouse, label: 'Granja',   value: selectedLot.granja },
                { icon: Hash,      label: 'Lote',     value: selectedLot.lote },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={14} />
                  <span>{label}:</span>
                  <span className="font-semibold" style={{ color: 'var(--ax-text)' }}>{value}</span>
                </div>
              ))}
              {firstRecord && lastRecord && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Período:</span>
                  <span className="font-semibold" style={{ color: 'var(--ax-text)' }}>
                    {formatShortDate(firstRecord.fecha)} — {formatShortDate(lastRecord.fecha)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary cards */}
        {selectedLot && <SummaryCards lot={selectedLot} />}

        {/* Charts grid */}
        {selectedLot && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 ax-card p-5 shadow-sm">
              <h2
                className="font-semibold mb-4"
                style={{ fontSize: 13, letterSpacing: '-0.2px', color: 'var(--ax-text-light)', textTransform: 'uppercase' }}
              >
                Curva de Crecimiento
              </h2>
              <GrowthChart lots={[selectedLot]} />
            </div>
            <div className="lg:col-span-2 ax-card p-5 shadow-sm">
              <h2
                className="font-semibold mb-4"
                style={{ fontSize: 13, letterSpacing: '-0.2px', color: 'var(--ax-text-light)', textTransform: 'uppercase' }}
              >
                GDP Semanal (g/día)
              </h2>
              <GDPChart lot={selectedLot} />
            </div>
          </div>
        )}

        {/* Weekly table */}
        {selectedLot && (
          <div className="ax-card p-5 shadow-sm">
            <h2
              className="font-semibold mb-4"
              style={{ fontSize: 13, letterSpacing: '-0.2px', color: 'var(--ax-text-light)', textTransform: 'uppercase' }}
            >
              Tabla Semanal
            </h2>
            <WeeklyTable lot={selectedLot} />
          </div>
        )}

        <p className="text-center ax-xsmall pb-4" style={{ color: 'var(--ax-text-light)' }}>
          Reporte PV · PigVision™ · Asimetrix · {generatedAt ? formatDate(generatedAt) : ''}
        </p>
      </main>
    </div>
  )
}
