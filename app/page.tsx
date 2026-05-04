'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Link,
  Building2,
  Warehouse,
  Hash,
  Calendar,
} from 'lucide-react'
import clsx from 'clsx'
import { parseCSV, parseExcel, generateMockData } from '@/lib/parseData'
import type { ReportData } from '@/lib/types'

type Tab = 'archivo' | 'pigvision'

const REQUIRED_COLUMNS = [
  'Compania',
  'Granja',
  'Lote',
  'Fecha',
  'Semana',
  'Edad_dias',
  'Peso_Promedio_kg',
  'Cabezas',
  'PC_Referencia_kg',
]

export default function HomePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<Tab>('archivo')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pvCompania, setPvCompania] = useState('AgroPremex')
  const [pvGranja, setPvGranja] = useState('Granja Norte')
  const [pvLote, setPvLote] = useState('Lote-2024-001')
  const [pvSemanas, setPvSemanas] = useState(20)

  const handleFileDrop = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setError('Solo se aceptan archivos .csv, .xlsx y .xls')
      return
    }
    setError(null)
    setSelectedFile(file)
  }, [])

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileDrop(file)
  }
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileDrop(file)
  }

  const handleParseFile = async () => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      let lots
      if (ext === 'csv') {
        const text = await selectedFile.text()
        lots = parseCSV(text)
      } else {
        const buffer = await selectedFile.arrayBuffer()
        lots = parseExcel(buffer)
      }
      const reportData: ReportData = { lots, generatedAt: new Date().toISOString() }
      sessionStorage.setItem('reportData', JSON.stringify(reportData))
      router.push('/report')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.')
      setLoading(false)
    }
  }

  const handleMockGenerate = () => {
    if (!pvCompania.trim() || !pvGranja.trim() || !pvLote.trim()) {
      setError('Por favor completa todos los campos.')
      return
    }
    setLoading(true)
    setError(null)
    setTimeout(() => {
      try {
        const lot = generateMockData(pvCompania.trim(), pvGranja.trim(), pvLote.trim(), pvSemanas)
        const reportData: ReportData = { lots: [lot], generatedAt: new Date().toISOString() }
        sessionStorage.setItem('reportData', JSON.stringify(reportData))
        router.push('/report')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al generar datos de prueba.')
        setLoading(false)
      }
    }, 800)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const inputClass =
    'w-full border border-ax-border rounded-[6px] px-3 py-2.5 text-sm text-ax-text bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-ax-accent focus:border-ax-accent ' +
    'transition placeholder:text-ax-text-light'

  return (
    <div className="min-h-screen" style={{ background: 'var(--ax-bg-alt)' }}>

      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3"
        style={{ background: 'var(--ax-header)' }}
      >
        <div className="flex items-center">
          <img src="/logo-asimetrix-full.svg" alt="Asimetrix" style={{ height: 30, width: 'auto' }} />
        </div>
        <span className="text-white opacity-50 text-xs">V.01 · 2025</span>
      </header>

      {/* ── Main ── */}
      <main className="pt-20 pb-12 px-4 flex flex-col items-center">

        {/* Hero */}
        <div className="mt-10 mb-8 text-center max-w-lg">
          <h1
            className="font-bold mb-3"
            style={{ fontSize: 32, lineHeight: '32px', letterSpacing: '-0.6px', color: 'var(--ax-text)' }}
          >
            Reporte de Peso Vivo
          </h1>
          <p style={{ color: 'var(--ax-text-light)', fontSize: 16, lineHeight: '22px', letterSpacing: '-0.3px' }}>
            Sube tu archivo de datos o conecta a PigVision™ para generar
            reportes interactivos con gráficas de crecimiento y tablas semanales.
          </p>
        </div>

        {/* Card */}
        <div className="ax-card w-full max-w-2xl shadow-sm">

          {/* Tab bar */}
          <div
            className="flex border-b"
            style={{ background: 'var(--ax-bg-alt)', borderColor: 'var(--ax-border)' }}
          >
            {(['archivo', 'pigvision'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(null) }}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors duration-150 focus:outline-none',
                  activeTab === tab ? 'ax-tab-active' : 'ax-tab-inactive'
                )}
              >
                {tab === 'archivo' ? <FileSpreadsheet size={16} /> : <Link size={16} />}
                {tab === 'archivo' ? 'Subir Archivo' : 'Conectar PigVision™'}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8 space-y-5">

            {/* ── Tab: Subir Archivo ── */}
            {activeTab === 'archivo' && (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-[8px] border-2 border-dashed p-10 text-center transition-all duration-200"
                  style={{
                    borderColor: dragOver
                      ? 'var(--ax-accent)'
                      : selectedFile
                      ? 'var(--ax-primary)'
                      : 'var(--ax-border)',
                    background: dragOver
                      ? '#EFF6FF'
                      : selectedFile
                      ? '#F0F7FB'
                      : 'var(--ax-bg)',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={onFileInputChange}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle size={40} style={{ color: 'var(--ax-primary)' }} />
                      <p className="font-semibold" style={{ color: 'var(--ax-primary)', letterSpacing: '-0.2px' }}>
                        {selectedFile.name}
                      </p>
                      <p className="ax-xsmall" style={{ color: 'var(--ax-text-light)' }}>
                        {formatFileSize(selectedFile.size)} · Haz clic para cambiar
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload size={40} style={{ color: 'var(--ax-text-light)' }} />
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--ax-text)', letterSpacing: '-0.2px' }}>
                          Arrastra tu archivo aquí
                        </p>
                        <p className="ax-small mt-1" style={{ color: 'var(--ax-text-light)' }}>
                          o haz clic para seleccionar
                        </p>
                      </div>
                      <span
                        className="ax-xsmall px-3 py-1 rounded-pill"
                        style={{ background: 'var(--ax-bg-neutral)', color: 'var(--ax-text-light)' }}
                      >
                        .CSV · .XLSX · .XLS
                      </span>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-start gap-3 rounded-[8px] px-4 py-3 ax-small"
                    style={{ background: '#FFF0F3', border: '1px solid var(--ax-error)', color: 'var(--ax-error)' }}
                  >
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={handleParseFile}
                  disabled={!selectedFile || loading}
                  className="ax-btn-primary w-full py-3 text-sm rounded-[6px]"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                  ) : (
                    <><FileSpreadsheet size={16} /> Generar Reporte</>
                  )}
                </button>

                {/* Template info */}
                <div
                  className="ax-info-box rounded-[8px]"
                >
                  <div className="flex items-start gap-3">
                    <Download size={16} style={{ color: 'var(--ax-accent)', marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1">
                      <p className="font-semibold ax-small" style={{ color: 'var(--ax-primary-dark)' }}>
                        Plantilla CSV
                      </p>
                      <p className="ax-xsmall mt-1 mb-3" style={{ color: 'var(--ax-text-light)' }}>
                        Descarga la plantilla con el formato correcto. Columnas requeridas:
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {REQUIRED_COLUMNS.map((col) => (
                          <code
                            key={col}
                            className="ax-xsmall px-2 py-0.5 rounded-[4px] font-mono"
                            style={{ background: 'rgba(75,162,255,0.12)', color: 'var(--ax-primary)' }}
                          >
                            {col}
                          </code>
                        ))}
                      </div>
                      <a
                        href="/templates/plantilla_reporte_pv.csv"
                        download
                        className="ax-btn-accent ax-small"
                        style={{ textDecoration: 'none' }}
                      >
                        <Download size={13} />
                        Descargar Plantilla
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: PigVision ── */}
            {activeTab === 'pigvision' && (
              <>
                {/* Demo notice */}
                <div
                  className="flex items-start gap-3 rounded-[8px] px-4 py-3 ax-small"
                  style={{
                    background: '#FFFBEA',
                    border: '1px solid var(--ax-warning)',
                    color: '#7A5C00',
                  }}
                >
                  <span className="text-base mt-0.5 flex-shrink-0">⚠️</span>
                  <p>
                    <strong>Modo demo:</strong> los datos son generados de ejemplo para
                    previsualización. La integración real con PigVision™ requiere configuración de API.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Compañía', icon: Building2, value: pvCompania, setter: setPvCompania, placeholder: 'Ej. AgroPremex' },
                    { label: 'Granja',   icon: Warehouse,  value: pvGranja,   setter: setPvGranja,   placeholder: 'Ej. Granja Norte' },
                    { label: 'Lote',     icon: Hash,       value: pvLote,     setter: setPvLote,     placeholder: 'Ej. Lote-2024-001' },
                  ].map(({ label, icon: Icon, value, setter, placeholder }) => (
                    <div key={label}>
                      <label
                        className="flex items-center gap-1.5 mb-1.5 ax-small font-medium"
                        style={{ color: 'var(--ax-text)' }}
                      >
                        <Icon size={14} style={{ color: 'var(--ax-text-light)' }} />
                        {label}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                      />
                    </div>
                  ))}

                  <div>
                    <label
                      className="flex items-center gap-1.5 mb-1.5 ax-small font-medium"
                      style={{ color: 'var(--ax-text)' }}
                    >
                      <Calendar size={14} style={{ color: 'var(--ax-text-light)' }} />
                      Número de Semanas{' '}
                      <span style={{ color: 'var(--ax-text-light)', fontWeight: 400 }}>(1–26)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={26}
                      value={pvSemanas}
                      onChange={(e) =>
                        setPvSemanas(Math.min(26, Math.max(1, parseInt(e.target.value) || 1)))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-start gap-3 rounded-[8px] px-4 py-3 ax-small"
                    style={{ background: '#FFF0F3', border: '1px solid var(--ax-error)', color: 'var(--ax-error)' }}
                  >
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  onClick={handleMockGenerate}
                  disabled={loading}
                  className="ax-btn-primary w-full py-3 text-sm rounded-[6px]"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Generando datos...</>
                  ) : (
                    <><Link size={16} /> Generar Reporte de Prueba</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-8 ax-xsmall" style={{ color: 'var(--ax-text-light)' }}>
          Reporte PV · PigVision™ · Asimetrix · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  )
}
