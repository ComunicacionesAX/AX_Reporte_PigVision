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
        <div className="flex items-center gap-3">
          {/* Asimetrix wordmark (simplified) */}
          <svg width="120" height="28" viewBox="0 0 564.5 149.17" fill="white" aria-label="Asimetrix">
            <path d="m525.15,67.21l-15.57-21.65h10.99l10.16,14.49,10.16-14.49h10.74l-15.57,21.4,16.24,22.57h-10.99l-10.83-15.41-10.74,15.41h-10.74l16.16-22.32Zm-35.98-37.98h10.83v9.58h-10.83v-9.58Zm.42,16.32h10.08v43.97h-10.08v-43.97Zm-34.98,0h10.08v9.91c1.39-3.33,3.36-6,5.91-8,2.56-2,5.77-2.92,9.66-2.75v10.66h-.58c-2.22,0-4.25.36-6.08,1.08-1.83.72-3.42,1.8-4.75,3.25-1.33,1.44-2.36,3.26-3.08,5.45-.72,2.19-1.08,4.73-1.08,7.62v16.74h-10.08v-43.97Zm-19.4,44.72c-1.83,0-3.52-.22-5.08-.67-1.55-.44-2.9-1.17-4.04-2.17-1.14-1-2.01-2.32-2.62-3.96-.61-1.64-.92-3.68-.92-6.12v-23.15h-5.58v-8.66h5.58v-12.08h10.08v12.08h11.83v8.66h-11.83v21.57c0,1.94.47,3.35,1.42,4.21.94.86,2.28,1.29,4,1.29,2.17,0,4.25-.5,6.25-1.5v8.25c-1.28.72-2.64,1.28-4.08,1.67-1.44.39-3.11.58-5,.58Zm-44.89.25c-3.16,0-6.12-.55-8.87-1.67-2.75-1.11-5.14-2.66-7.16-4.66-2.03-2-3.62-4.4-4.79-7.2-1.17-2.8-1.75-5.9-1.75-9.29v-.17c0-3.16.53-6.14,1.58-8.91,1.06-2.78,2.54-5.21,4.46-7.29,1.92-2.08,4.18-3.72,6.79-4.91,2.61-1.19,5.5-1.79,8.66-1.79,3.5,0,6.57.64,9.2,1.92,2.64,1.28,4.83,3,6.58,5.16,1.75,2.17,3.07,4.68,3.96,7.54.89,2.86,1.33,5.87,1.33,9.04,0,.44-.01.9-.04,1.37-.03.47-.07.96-.12,1.46h-32.31c.55,3.61,1.98,6.37,4.29,8.29,2.3,1.91,5.09,2.87,8.37,2.87,2.5,0,4.66-.44,6.5-1.33,1.83-.89,3.64-2.19,5.41-3.91l5.91,5.25c-2.11,2.5-4.62,4.5-7.54,6-2.92,1.5-6.4,2.25-10.45,2.25Zm9.99-26.07c-.17-1.61-.53-3.12-1.08-4.54-.56-1.42-1.3-2.64-2.25-3.66-.94-1.03-2.07-1.85-3.37-2.46-1.3-.61-2.79-.92-4.46-.92-3.11,0-5.68,1.07-7.7,3.21-2.03,2.14-3.26,4.93-3.71,8.37h22.57Zm-109.27-18.91h10.08v6.66c.72-1,1.5-1.94,2.33-2.83.83-.89,1.79-1.69,2.87-2.41,1.08-.72,2.3-1.29,3.66-1.71,1.36-.42,2.87-.62,4.54-.62,3.16,0,5.84.71,8.04,2.12,2.19,1.42,3.87,3.29,5.04,5.62,1.78-2.33,3.87-4.21,6.29-5.62,2.42-1.42,5.29-2.12,8.62-2.12,4.83,0,8.61,1.46,11.33,4.37,2.72,2.91,4.08,7.06,4.08,12.45v28.07h-10.08v-24.98c0-3.5-.78-6.16-2.33-7.99-1.55-1.83-3.75-2.75-6.58-2.75s-5.04.93-6.79,2.79c-1.75,1.86-2.62,4.57-2.62,8.12v24.82h-10.08v-25.07c0-3.44-.78-6.08-2.33-7.91-1.55-1.83-3.75-2.75-6.58-2.75s-5.11.97-6.83,2.91c-1.72,1.94-2.58,4.64-2.58,8.08v24.73h-10.08v-43.97Zm-23.65-16.32h10.83v9.58h-10.83v-9.58Zm.42,16.32h10.08v43.97h-10.08v-43.97Zm-27.15,44.81c-3.16,0-6.37-.56-9.62-1.67-3.25-1.11-6.26-2.75-9.04-4.91l4.5-6.83c2.39,1.78,4.82,3.12,7.29,4.04,2.47.92,4.84,1.37,7.12,1.37s3.85-.43,5.04-1.29c1.19-.86,1.79-2.01,1.79-3.46v-.17c0-.83-.26-1.55-.79-2.17-.53-.61-1.25-1.14-2.17-1.58-.92-.44-1.97-.86-3.16-1.25-1.19-.39-2.43-.78-3.71-1.16-1.61-.44-3.23-.97-4.87-1.58-1.64-.61-3.11-1.4-4.41-2.37-1.3-.97-2.37-2.18-3.21-3.62-.83-1.44-1.25-3.22-1.25-5.33v-.17c0-2.05.4-3.91,1.21-5.58.81-1.67,1.92-3.08,3.33-4.25,1.42-1.17,3.08-2.05,5-2.67,1.92-.61,3.96-.92,6.12-.92,2.78,0,5.58.44,8.41,1.33,2.83.89,5.41,2.11,7.75,3.66l-4,7.16c-2.11-1.28-4.25-2.29-6.41-3.04-2.17-.75-4.16-1.12-6-1.12-1.94,0-3.46.42-4.54,1.25-1.08.83-1.62,1.89-1.62,3.16v.17c0,.78.28,1.46.83,2.04.56.58,1.29,1.11,2.21,1.58.92.47,1.97.92,3.16,1.33,1.19.42,2.43.82,3.71,1.21,1.61.5,3.22,1.08,4.83,1.75,1.61.67,3.07,1.49,4.37,2.46,1.3.97,2.37,2.15,3.21,3.54.83,1.39,1.25,3.08,1.25,5.08v.17c0,2.33-.42,4.36-1.25,6.08-.83,1.72-1.99,3.15-3.46,4.29-1.47,1.14-3.21,2-5.2,2.58-2,.58-4.14.87-6.41.87Zm-59.05-59.55h9.49l25.65,58.71h-10.83l-5.91-14.07h-27.57l-6,14.07h-10.49l25.65-58.71Zm14.66,35.56l-10.08-23.32-9.99,23.32h20.07Z"/>
          </svg>
          <div className="hidden sm:block w-px h-5 bg-white opacity-20" />
          <span className="hidden sm:block text-white opacity-60 text-sm font-light tracking-wide">
            PigVision™
          </span>
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
