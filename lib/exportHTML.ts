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
    .page-header { background: var(--header); color: white; padding: 1.25rem 2rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .page-header .brand { display: flex; align-items: center; gap: 0.875rem; }
    .page-header .brand img { height: 32px; width: auto; }
    .page-header .brand-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.2); }
    .page-header h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .page-header .sub { font-size: 12px; opacity: 0.6; margin-top: 2px; }
    .page-header .date { font-size: 12px; opacity: 0.6; text-align: right; }
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
      <img src="data:image/png;base64,${logoB64}" alt="Asimetrix" style="height:32px;width:auto">
      <div class="brand-divider"></div>
      <div>
        <h1>Reporte de Peso Vivo</h1>
        <p class="sub">${escapeHtml(lots[0]?.compania || '')} — ${escapeHtml(lots[0]?.granja || '')}</p>
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
