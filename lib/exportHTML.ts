import type { LotData } from './types'

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const COLORS = ['#0E567B', '#4BA2FF', '#00E3FF', '#7EC6DE', '#050B49', '#90C0E7']

export function generateExportHTML(lots: LotData[]): string {
  const generatedAt = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })

  // Growth chart datasets (all lots + PC reference)
  const growthDatasets = lots.map((lot, i) => ({
    label: `${lot.lote} (${lot.granja})`,
    data: lot.records.map((r) => ({ x: r.edad, y: r.pesoPromedio })),
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length] + '20',
    borderWidth: 2.5,
    pointRadius: 4,
    tension: 0.4,
    fill: false,
  }))

  const firstLotWithPC = lots.find((l) => l.records.some((r) => r.pc !== undefined))
  if (firstLotWithPC) {
    const pcData = firstLotWithPC.records.filter((r) => r.pc !== undefined).map((r) => ({ x: r.edad, y: r.pc }))
    if (pcData.length > 0) {
      growthDatasets.push({
        label: 'Curva PC Referencia',
        data: pcData,
        borderColor: '#9ca3af',
        backgroundColor: '#9ca3af20',
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.4,
        fill: false,
        // @ts-ignore
        borderDash: [6, 4],
      } as typeof growthDatasets[0])
    }
  }

  // Per-lot sections
  const lotSections = lots.map((lot, lotIndex) => {
    const firstRecord = lot.records[0]
    const lastRecord  = lot.records[lot.records.length - 1]

    const gdpRecords = lot.records.filter((r) => r.gdp > 0)
    const avgGDP = gdpRecords.length > 0
      ? gdpRecords.reduce((s, r) => s + r.gdp, 0) / gdpRecords.length
      : 0
    const duracion = lastRecord && firstRecord ? lastRecord.edad - firstRecord.edad : 0

    const gdpChartId  = `gdpChart_${lotIndex}`
    const gdpLabels   = lot.records.filter((r) => r.gdp > 0).map((r) => `Sem ${r.semana}`)
    const gdpValues   = lot.records.filter((r) => r.gdp > 0).map((r) => r.gdp)
    const gdpColors   = gdpValues.map((v) => v > 700 ? '#0E567B' : v >= 400 ? '#D97706' : '#C0062B')
    const gdpDataJson = JSON.stringify({ labels: gdpLabels, values: gdpValues, colors: gdpColors })

    const tableRows = lot.records.map((r, i) => {
      const isFirst = i === 0
      const gdpCell = isFirst
        ? `<td style="color:#9ca3af;font-style:italic;text-align:right">—</td>`
        : (() => {
            const bg  = r.gdp > 700 ? 'rgba(14,86,123,0.12)' : r.gdp >= 400 ? '#FEF3C7' : 'rgba(192,6,43,0.1)'
            const fg  = r.gdp > 700 ? '#0E567B' : r.gdp >= 400 ? '#92400E' : '#C0062B'
            return `<td style="text-align:right"><span style="background:${bg};color:${fg};font-weight:700;padding:2px 8px;border-radius:4px;font-size:12px">${r.gdp}</span></td>`
          })()

      const deltaPc = r.pc !== undefined ? Math.round((r.pesoPromedio - r.pc) * 10) / 10 : null
      const deltaCell = deltaPc !== null
        ? `<td style="text-align:right;color:${deltaPc >= 0 ? '#0E567B' : '#C0062B'};font-weight:600">${deltaPc >= 0 ? '+' : ''}${deltaPc.toFixed(1)}</td>`
        : `<td style="text-align:right;color:#9ca3af">—</td>`

      return `<tr>
        <td style="font-weight:600">${r.semana}</td>
        <td style="color:#4A4A68;white-space:nowrap">${r.fecha ? formatDate(r.fecha) : '—'}</td>
        <td style="text-align:right">${r.edad}</td>
        <td style="text-align:right;font-weight:600">${r.pesoPromedio.toFixed(1)}</td>
        ${gdpCell}
        <td style="text-align:right">${r.cabezas.toLocaleString('es-MX')}</td>
        <td style="text-align:right;color:#4A4A68">${r.pc !== undefined ? r.pc.toFixed(1) : '—'}</td>
        ${deltaCell}
      </tr>`
    }).join('')

    return `
    <div class="lot-section" id="lot-${lotIndex}">
      <div class="lot-header">
        <h2>${escapeHtml(lot.lote)}</h2>
        <div class="lot-meta">
          <span>${escapeHtml(lot.compania)}</span>
          <span>${escapeHtml(lot.granja)}</span>
          ${firstRecord ? `<span>Período: ${formatDate(firstRecord.fecha)} — ${formatDate(lastRecord?.fecha ?? '')}</span>` : ''}
        </div>
      </div>

      <div class="summary-cards">
        <div class="card" style="border-left:4px solid #0E567B;background:#EBF5FF">
          <div class="card-label">Peso Final</div>
          <div class="card-value">${lastRecord ? lastRecord.pesoPromedio.toFixed(1) + ' kg' : '—'}</div>
        </div>
        <div class="card" style="border-left:4px solid #4BA2FF;background:#EFF6FF">
          <div class="card-label">GDP Promedio</div>
          <div class="card-value">${avgGDP.toFixed(0)} g/día</div>
        </div>
        <div class="card" style="border-left:4px solid #7EC6DE;background:#F0F7FB">
          <div class="card-label">Cabezas Actuales</div>
          <div class="card-value">${lastRecord ? lastRecord.cabezas.toLocaleString('es-MX') : '—'}</div>
        </div>
        <div class="card" style="border-left:4px solid #7C3AED;background:#F5F3FF">
          <div class="card-label">Duración</div>
          <div class="card-value">${duracion} días</div>
        </div>
      </div>

      <div class="chart-box" style="margin-bottom:1.5rem">
        <h3>GDP Semanal (g/día)</h3>
        <canvas id="${gdpChartId}" height="220"></canvas>
      </div>

      <h3 style="margin:0 0 0.75rem;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#4A4A68">
        Tabla de Cierres Semanales
      </h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Fecha de cierre</th>
              <th style="text-align:right">Edad (días)</th>
              <th style="text-align:right">Peso Prom. (kg)</th>
              <th style="text-align:right">GDP (g/día)</th>
              <th style="text-align:right">Cabezas</th>
              <th style="text-align:right">PC Ref. (kg)</th>
              <th style="text-align:right">Δ vs PC (kg)</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>

      <script>
        (function() {
          var d = ${gdpDataJson};
          var ctx = document.getElementById('${gdpChartId}').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: d.labels,
              datasets: [{ label: 'GDP (g/día)', data: d.values, backgroundColor: d.colors, borderRadius: 4 }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(c) { return c.parsed.y + ' g/día'; } } }
              },
              scales: {
                y: { beginAtZero: true, grid: { color: '#D3DCDF' }, title: { display: true, text: 'g/día', color: '#4A4A68' } },
                x: { grid: { display: false } }
              }
            },
            plugins: [{
              afterDraw: function(chart) {
                var c2 = chart.ctx, ys = chart.scales.y;
                var yp = ys.getPixelForValue(700);
                c2.save();
                c2.strokeStyle = '#4BA2FF'; c2.lineWidth = 1.5; c2.setLineDash([5,4]);
                c2.beginPath(); c2.moveTo(chart.chartArea.left, yp); c2.lineTo(chart.chartArea.right, yp); c2.stroke();
                c2.fillStyle = '#4BA2FF'; c2.font = '11px Roboto, sans-serif';
                c2.fillText('Meta: 700 g/día', chart.chartArea.left + 4, yp - 4);
                c2.restore();
              }
            }]
          });
        })();
      <\/script>
    </div>`
  }).join('\n')

  const logoB64 = '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'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte PV — ${escapeHtml(lots[0]?.compania || 'Reporte')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --header: #040939; --primary: #0E567B; --accent: #4BA2FF;
      --text: #181934; --text-light: #4A4A68; --border: #D3DCDF;
      --bg: #fff; --bg-alt: #F8F9FA;
    }
    body { font-family: 'Roboto', Helvetica, sans-serif; font-size: 14px; background: var(--bg-alt); color: var(--text); letter-spacing: -0.2px; }
    .page-header { background: var(--header); color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid rgba(75,162,255,0.25); }
    .page-header .brand { display: flex; align-items: center; gap: 1rem; }
    .page-header .brand-logo { display: flex; align-items: center; gap: 0.625rem; }
    .page-header .brand-logo img { height: 36px; width: auto; filter: brightness(0) invert(1); }
    .page-header .brand-logo-name { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; color: white; text-transform: uppercase; }
    .page-header .brand-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.15); margin: 0 0.25rem; }
    .page-header .brand-title { display: flex; flex-direction: column; gap: 1px; }
    .page-header h1 { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; margin: 0; color: white; }
    .page-header .sub { font-size: 12px; color: rgba(75,162,255,0.85); margin-top: 1px; font-weight: 400; }
    .page-header .date { font-size: 12px; opacity: 0.55; text-align: right; line-height: 1.5; }
    .container { max-width: 1100px; margin: 0 auto; padding: 1.5rem 2rem; }
    .growth-section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .growth-section h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-light); margin-bottom: 1rem; }
    .lot-section { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--accent); }
    .lot-header h2 { font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
    .lot-meta { display: flex; gap: 1.5rem; font-size: 13px; color: var(--text-light); margin-bottom: 1.25rem; flex-wrap: wrap; }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
    .card { border-radius: 8px; padding: 12px 14px; }
    .card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-light); margin-bottom: 4px; }
    .card-value { font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -0.45px; }
    .chart-box { border: 1px solid var(--border); border-radius: 8px; padding: 1rem; }
    .chart-box h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-light); margin-bottom: 0.75rem; }
    .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); margin-top: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: var(--bg-alt); }
    th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-light); border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--text); }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: var(--bg-alt); }
    .footer { text-align: center; padding: 1.5rem; color: var(--text-light); font-size: 12px; border-top: 1px solid var(--border); margin-top: 0.5rem; }
    @media print { body { background: white; } .lot-section { break-inside: avoid; } }
  </style>
</head>
<body>
  <header class="page-header">
    <div class="brand">
      <div class="brand-logo">
        <img src="data:image/png;base64,${logoB64}" alt="Asimetrix">
        <span class="brand-logo-name">Asimetrix</span>
      </div>
      <div class="brand-divider"></div>
      <div class="brand-title">
        <h1>Reporte de Peso Vivo</h1>
        <p class="sub">PigVision™ · ${escapeHtml(lots[0]?.compania || '')} · ${escapeHtml(lots[0]?.granja || '')}</p>
      </div>
    </div>
    <div class="date">Generado el<br><strong>${generatedAt}</strong></div>
  </header>

  <div class="container">
    <div class="growth-section">
      <h2>Curva de Crecimiento — Comparativa de Lotes</h2>
      <canvas id="growthChart" height="280"></canvas>
    </div>

    ${lotSections}

    <div class="footer">Reporte PV · PigVision™ · Asimetrix · ${generatedAt}</div>
  </div>

  <script>
    (function() {
      var ds = ${JSON.stringify(growthDatasets)};
      var ctx = document.getElementById('growthChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: { datasets: ds },
        options: {
          responsive: true,
          parsing: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { size: 12 } } },
            tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + c.parsed.y.toFixed(1) + ' kg'; } } }
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Edad (días)', color: '#4A4A68' }, grid: { color: '#D3DCDF' } },
            y: { title: { display: true, text: 'Peso (kg)', color: '#4A4A68' }, grid: { color: '#D3DCDF' } }
          }
        }
      });
    })();
  <\/script>
</body>
</html>`
}
