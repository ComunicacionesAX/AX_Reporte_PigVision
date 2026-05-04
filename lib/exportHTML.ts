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

  // Global Y/X bounds for the comparison growth chart
  const allWeights  = lots.flatMap((l) => l.records.map((r) => r.pesoPromedio))
  const allPCs      = lots.flatMap((l) => l.records.filter((r) => r.pc !== undefined).map((r) => r.pc as number))
  const allAges     = lots.flatMap((l) => l.records.map((r) => r.edad))
  const gAllY       = [...allWeights, ...allPCs]
  const gRawMin     = gAllY.length > 0 ? Math.min(...gAllY) : 0
  const gRawMax     = gAllY.length > 0 ? Math.max(...gAllY) : 120
  const gPad        = (gRawMax - gRawMin) * 0.08
  const gYMin       = Math.max(0, Math.floor((gRawMin - gPad) / 5) * 5)
  const gYMax       = Math.ceil((gRawMax + gPad) / 5) * 5
  const gXMin       = allAges.length > 0 ? Math.max(0, Math.min(...allAges) - 2) : 0
  const gXMax       = allAges.length > 0 ? Math.max(...allAges) + 2 : 140
  const growthScaleGlobal = JSON.stringify({ yMin: gYMin, yMax: gYMax, xMin: gXMin, xMax: gXMax })

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
    const gdpMax      = gdpValues.length > 0 ? Math.max(...gdpValues) : 900
    const gdpYMax     = Math.ceil(Math.max(gdpMax * 1.18, 800) / 100) * 100
    const gdpDataJson = JSON.stringify({ labels: gdpLabels, values: gdpValues, colors: gdpColors, yMax: gdpYMax })

    const weights     = lot.records.map((r) => r.pesoPromedio)
    const pcs         = lot.records.filter((r) => r.pc !== undefined).map((r) => r.pc as number)
    const allY        = [...weights, ...pcs]
    const rawMin      = allY.length > 0 ? Math.min(...allY) : 0
    const rawMax      = allY.length > 0 ? Math.max(...allY) : 120
    const yPad        = (rawMax - rawMin) * 0.08
    const growthYMin  = Math.max(0, Math.floor((rawMin - yPad) / 5) * 5)
    const growthYMax  = Math.ceil((rawMax + yPad) / 5) * 5
    const xValues     = lot.records.map((r) => r.edad)
    const growthXMin  = xValues.length > 0 ? Math.max(0, Math.min(...xValues) - 2) : 0
    const growthXMax  = xValues.length > 0 ? Math.max(...xValues) + 2 : 140
    const growthScaleJson = JSON.stringify({ yMin: growthYMin, yMax: growthYMax, xMin: growthXMin, xMax: growthXMax })

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
        <div style="position:relative;height:260px">
          <canvas id="${gdpChartId}"></canvas>
        </div>
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
              datasets: [{ label: 'GDP (g/día)', data: d.values, backgroundColor: d.colors, borderRadius: 5, borderSkipped: false }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(c) { return c.parsed.y + ' g/día'; } } }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: d.yMax,
                  grid: { color: '#E8ECEE' },
                  ticks: { color: '#4A4A68', font: { size: 11 } },
                  title: { display: true, text: 'g/día', color: '#4A4A68', font: { size: 11 } }
                },
                x: {
                  grid: { display: false },
                  ticks: { color: '#4A4A68', font: { size: 11 } }
                }
              }
            },
            plugins: [{
              afterDraw: function(chart) {
                var c2 = chart.ctx, ys = chart.scales.y;
                if (ys.max < 700) return;
                var yp = ys.getPixelForValue(700);
                c2.save();
                c2.strokeStyle = '#4BA2FF'; c2.lineWidth = 1.5; c2.setLineDash([5,4]);
                c2.beginPath(); c2.moveTo(chart.chartArea.left, yp); c2.lineTo(chart.chartArea.right, yp); c2.stroke();
                c2.setLineDash([]);
                c2.fillStyle = '#4BA2FF'; c2.font = '600 11px Roboto, sans-serif';
                c2.fillText('Meta: 700 g/día', chart.chartArea.left + 6, yp - 5);
                c2.restore();
              }
            }]
          });
        })();
      <\/script>
    </div>`
  }).join('\n')

  const logoB64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NjQuNSAxNDkuMTciPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGxldHRlci1zcGFjaW5nOiAuMWVtOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIGxldHRlci1zcGFjaW5nOiAuMWVtOwogICAgICB9CgogICAgICAuY2xzLTMsIC5jbHMtNCwgLmNscy01IHsKICAgICAgICBmaWxsOiAjZmZmOwogICAgICB9CgogICAgICAuY2xzLTQgewogICAgICAgIGZvbnQtZmFtaWx5OiBTRlByb1RleHQtTGlnaHQsICdTRiBQcm8gVGV4dCc7CiAgICAgICAgZm9udC1zaXplOiAyMS4xNHB4OwogICAgICAgIGZvbnQtd2VpZ2h0OiAzMDA7CiAgICAgIH0KCiAgICAgIC5jbHMtNiB7CiAgICAgICAgbGV0dGVyLXNwYWNpbmc6IC4wMmVtOwogICAgICB9CgogICAgICAuY2xzLTcgewogICAgICAgIGxldHRlci1zcGFjaW5nOiAuMDdlbTsKICAgICAgfQoKICAgICAgLmNscy04IHsKICAgICAgICBsZXR0ZXItc3BhY2luZzogLjA3ZW07CiAgICAgIH0KCiAgICAgIC5jbHMtNSB7CiAgICAgICAgZmlsbC1ydWxlOiBldmVub2RkOwogICAgICB9CgogICAgICAuY2xzLTkgewogICAgICAgIGxldHRlci1zcGFjaW5nOiAuMDdlbTsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHBhdGggY2xhc3M9ImNscy0zIiBkPSJtNTI1LjE1LDY3LjIxbC0xNS41Ny0yMS42NWgxMC45OWwxMC4xNiwxNC40OSwxMC4xNi0xNC40OWgxMC43NGwtMTUuNTcsMjEuNCwxNi4yNCwyMi41N2gtMTAuOTlsLTEwLjgzLTE1LjQxLTEwLjc0LDE1LjQxaC0xMC43NGwxNi4xNi0yMi4zMlptLTM1Ljk4LTM3Ljk4aDEwLjgzdjkuNThoLTEwLjgzdi05LjU4Wm0uNDIsMTYuMzJoMTAuMDh2NDMuOTdoLTEwLjA4di00My45N1ptLTM0Ljk4LDBoMTAuMDh2OS45MWMxLjM5LTMuMzMsMy4zNi02LDUuOTEtOCwyLjU2LTIsNS43Ny0yLjkyLDkuNjYtMi43NXYxMC42NmgtLjU4Yy0yLjIyLDAtNC4yNS4zNi02LjA4LDEuMDgtMS44My43Mi0zLjQyLDEuOC00Ljc1LDMuMjUtMS4zMywxLjQ0LTIuMzYsMy4yNi0zLjA4LDUuNDUtLjcyLDIuMTktMS4wOCw0LjczLTEuMDgsNy42MnYxNi43NGgtMTAuMDh2LTQzLjk3Wm0tMTkuNCw0NC43MmMtMS44MywwLTMuNTItLjIyLTUuMDgtLjY3LTEuNTUtLjQ0LTIuOS0xLjE3LTQuMDQtMi4xNy0xLjE0LTEtMi4wMS0yLjMyLTIuNjItMy45Ni0uNjEtMS42NC0uOTItMy42OC0uOTItNi4xMnYtMjMuMTVoLTUuNTh2LTguNjZoNS41OHYtMTIuMDhoMTAuMDh2MTIuMDhoMTEuODN2OC42NmgtMTEuODN2MjEuNTdjMCwxLjk0LjQ3LDMuMzUsMS40Miw0LjIxLjk0Ljg2LDIuMjgsMS4yOSw0LDEuMjksMi4xNywwLDQuMjUtLjUsNi4yNS0xLjV2OC4yNWMtMS4yOC43Mi0yLjY0LDEuMjgtNC4wOCwxLjY3LTEuNDQuMzktMy4xMS41OC01LC41OFptLTQ0Ljg5LjI1Yy0zLjE2LDAtNi4xMi0uNTUtOC44Ny0xLjY3LTIuNzUtMS4xMS01LjE0LTIuNjYtNy4xNi00LjY2LTIuMDMtMi0zLjYyLTQuNC00Ljc5LTcuMi0xLjE3LTIuOC0xLjc1LTUuOS0xLjc1LTkuMjl2LS4xN2MwLTMuMTYuNTMtNi4xNCwxLjU4LTguOTEsMS4wNi0yLjc4LDIuNTQtNS4yMSw0LjQ2LTcuMjksMS45Mi0yLjA4LDQuMTgtMy43Miw2Ljc5LTQuOTEsMi42MS0xLjE5LDUuNS0xLjc5LDguNjYtMS43OSwzLjUsMCw2LjU3LjY0LDkuMiwxLjkyLDIuNjQsMS4yOCw0LjgzLDMsNi41OCw1LjE2LDEuNzUsMi4xNywzLjA3LDQuNjgsMy45Niw3LjU0Ljg5LDIuODYsMS4zMyw1Ljg3LDEuMzMsOS4wNCwwLC40NC0uMDEuOS0uMDQsMS4zNy0uMDMuNDctLjA3Ljk2LS4xMiwxLjQ2aC0zMi4zMWMuNTUsMy42MSwxLjk4LDYuMzcsNC4yOSw4LjI5LDIuMywxLjkxLDUuMDksMi44Nyw4LjM3LDIuODcsMi41LDAsNC42Ni0uNDQsNi41LTEuMzMsMS44My0uODksMy42NC0yLjE5LDUuNDEtMy45MWw1LjkxLDUuMjVjLTIuMTEsMi41LTQuNjIsNC41LTcuNTQsNi0yLjkyLDEuNS02LjQsMi4yNS0xMC40NSwyLjI1Wm05Ljk5LTI2LjA3Yy0uMTctMS42MS0uNTMtMy4xMi0xLjA4LTQuNTQtLjU2LTEuNDItMS4zLTIuNjQtMi4yNS0zLjY2LS45NC0xLjAzLTIuMDctMS44NS0zLjM3LTIuNDYtMS4zLS42MS0yLjc5LS45Mi00LjQ2LS45Mi0zLjExLDAtNS42OCwxLjA3LTcuNywzLjIxLTIuMDMsMi4xNC0zLjI2LDQuOTMtMy43MSw4LjM3aDIyLjU3Wm0tMTA5LjI3LTE4LjkxaDEwLjA4djYuNjZjLjcyLTEsMS41LTEuOTQsMi4zMy0yLjgzLjgzLS44OSwxLjc5LTEuNjksMi44Ny0yLjQxLDEuMDgtLjcyLDIuMy0xLjI5LDMuNjYtMS43MSwxLjM2LS40MiwyLjg3LS42Miw0LjU0LS42MiwzLjE2LDAsNS44NC43MSw4LjA0LDIuMTIsMi4xOSwxLjQyLDMuODcsMy4yOSw1LjA0LDUuNjIsMS43OC0yLjMzLDMuODctNC4yMSw2LjI5LTUuNjIsMi40Mi0xLjQyLDUuMjktMi4xMiw4LjYyLTIuMTIsNC44MywwLDguNjEsMS40NiwxMS4zMyw0LjM3LDIuNzIsMi45MSw0LjA4LDcuMDYsNC4wOCwxMi40NXYyOC4wN2gtMTAuMDh2LTI0Ljk4YzAtMy41LS43OC02LjE2LTIuMzMtNy45OS0xLjU1LTEuODMtMy43NS0yLjc1LTYuNTgtMi43NXMtNS4wNC45My02Ljc5LDIuNzljLTEuNzUsMS44Ni0yLjYyLDQuNTctMi42Miw4LjEydjI0LjgyaC0xMC4wOHYtMjUuMDdjMC0zLjQ0LS43OC02LjA4LTIuMzMtNy45MS0xLjU1LTEuODMtMy43NS0yLjc1LTYuNTgtMi43NXMtNS4xMS45Ny02LjgzLDIuOTFjLTEuNzIsMS45NC0yLjU4LDQuNjQtMi41OCw4LjA4djI0LjczaC0xMC4wOHYtNDMuOTdabS0yMy42NS0xNi4zMmgxMC44M3Y5LjU4aC0xMC44M3YtOS41OFptLjQyLDE2LjMyaDEwLjA4djQzLjk3aC0xMC4wOHYtNDMuOTdabS0yNy4xNSw0NC44MWMtMy4xNiwwLTYuMzctLjU2LTkuNjItMS42Ny0zLjI1LTEuMTEtNi4yNi0yLjc1LTkuMDQtNC45MWw0LjUtNi44M2MyLjM5LDEuNzgsNC44MiwzLjEyLDcuMjksNC4wNCwyLjQ3LjkyLDQuODQsMS4zNyw3LjEyLDEuMzdzMy44NS0uNDMsNS4wNC0xLjI5YzEuMTktLjg2LDEuNzktMi4wMSwxLjc5LTMuNDZ2LS4xN2MwLS44My0uMjYtMS41NS0uNzktMi4xNy0uNTMtLjYxLTEuMjUtMS4xNC0yLjE3LTEuNTgtLjkyLS40NC0xLjk3LS44Ni0zLjE2LTEuMjUtMS4xOS0uMzktMi40My0uNzgtMy43MS0xLjE2LTEuNjEtLjQ0LTMuMjMtLjk3LTQuODctMS41OC0xLjY0LS42MS0zLjExLTEuNC00LjQxLTIuMzctMS4zLS45Ny0yLjM3LTIuMTgtMy4yMS0zLjYyLS44My0xLjQ0LTEuMjUtMy4yMi0xLjI1LTUuMzN2LS4xN2MwLTIuMDUuNC0zLjkxLDEuMjEtNS41OC44MS0xLjY3LDEuOTItMy4wOCwzLjMzLTQuMjUsMS40Mi0xLjE3LDMuMDgtMi4wNSw1LTIuNjcsMS45Mi0uNjEsMy45Ni0uOTIsNi4xMi0uOTIsMi43OCwwLDUuNTguNDQsOC40MSwxLjMzLDIuODMuODksNS40MSwyLjExLDcuNzUsMy42NmwtNCw3LjE2Yy0yLjExLTEuMjgtNC4yNS0yLjI5LTYuNDEtMy4wNC0yLjE3LS43NS00LjE2LTEuMTItNi0xLjEyLTEuOTQsMC0zLjQ2LjQyLTQuNTQsMS4yNS0xLjA4LjgzLTEuNjIsMS44OS0xLjYyLDMuMTZ2LjE3YzAsLjc4LjI4LDEuNDYuODMsMi4wNC41Ni41OCwxLjI5LDEuMTEsMi4yMSwxLjU4LjkyLjQ3LDEuOTcuOTIsMy4xNiwxLjMzLDEuMTkuNDIsMi40My44MiwzLjcxLDEuMjEsMS42MS41LDMuMjIsMS4wOCw0LjgzLDEuNzUsMS42MS42NywzLjA3LDEuNDksNC4zNywyLjQ2LDEuMy45NywyLjM3LDIuMTUsMy4yMSwzLjU0LjgzLDEuMzksMS4yNSwzLjA4LDEuMjUsNS4wOHYuMTdjMCwyLjMzLS40Miw0LjM2LTEuMjUsNi4wOC0uODMsMS43Mi0xLjk5LDMuMTUtMy40Niw0LjI5LTEuNDcsMS4xNC0zLjIxLDItNS4yLDIuNTgtMiwuNTgtNC4xNC44Ny02LjQxLjg3Wm0tNTkuMDUtNTkuNTVoOS40OWwyNS42NSw1OC43MWgtMTAuODNsLTUuOTEtMTQuMDdoLTI3LjU3bC02LDE0LjA3aC0xMC40OWwyNS42NS01OC43MVptMTQuNjYsMzUuNTZsLTEwLjA4LTIzLjMyLTkuOTksMjMuMzJoMjAuMDdaIj48L3BhdGg+CiAgPHRleHQgY2xhc3M9ImNscy00IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNTUuOTYgMTE5Ljg1KSI+PHRzcGFuIGNsYXNzPSJjbHMtMiIgeD0iMCIgeT0iMCI+VU48L3RzcGFuPjx0c3BhbiBjbGFzcz0iY2xzLTkiIHg9IjM1LjA3IiB5PSIwIj5MPC90c3Bhbj48dHNwYW4gY2xhc3M9ImNscy0xIiB4PSI0OC4yMyIgeT0iMCI+T0NLSU5HIFRIRSBQPC90c3Bhbj48dHNwYW4gY2xhc3M9ImNscy04IiB4PSIyMTkuOTgiIHk9IjAiPk88L3RzcGFuPjx0c3BhbiBjbGFzcz0iY2xzLTIiIHg9IjIzNy41OSIgeT0iMCI+V0VSIE9GIDwvdHNwYW4+PHRzcGFuIGNsYXNzPSJjbHMtNyIgeD0iMzM3LjkyIiB5PSIwIj5EPC90c3Bhbj48dHNwYW4gY2xhc3M9ImNscy02IiB4PSIzNTQuNSIgeT0iMCI+QVQ8L3RzcGFuPjx0c3BhbiBjbGFzcz0iY2xzLTIiIHg9IjM4Mi41NyIgeT0iMCI+QTwvdHNwYW4+PC90ZXh0PgogIDxwYXRoIGNsYXNzPSJjbHMtNSIgZD0ibTk1LjQxLDU0LjU2YzMuNDksMCw2LjMyLDIuODMsNi4zMiw2LjMydi4xNHMwLC4wMSwwLC4wMWgwdi4wMmgwczAsLjE0LDAsLjE0aDB2LjAyaDBzMCwuMDIsMCwuMDJ2LjEzczAsMCwwLDBoMHYuMTRzLS4wMSwwLS4wMSwwaDBzMCwuMDIsMCwuMDJoMGMtLjMzLDMuMTktMy4wMiw1LjY3LTYuMjksNS42Ny0zLjQ5LDAtNi4zMi0yLjgzLTYuMzItNi4zMywwLTIuMDcuOTktMy45LDIuNTMtNS4wNmgwcy4wMS0uMDIuMDEtLjAyYy4wOC0uMDYuMTYtLjExLjIzLS4xN2gwczAsMCwwLDBsLjExLS4wN2guMDJzMC0uMDIsMC0uMDJsLjEyLS4wN2gwcy4wMiwwLC4wMiwwbC4wOS0uMDUuMDYtLjAzaC4wMnMuMDUtLjA0LjA1LS4wNGwuMDMtLjAyLjAzLS4wMi4wNi0uMDMuMDUtLjAzaDBzLjA2LS4wMy4wNi0uMDNsLjA2LS4wM2guMDFzLjA1LS4wMy4wNS0uMDNsLjA4LS4wNGguMDFzLjAzLS4wMi4wMy0uMDJsLjEyLS4wNWgwYy4wOC0uMDMuMTYtLjA2LjI0LS4wOWwuMDUtLjAyaC4wMnMuMTItLjA1LjEyLS4wNWgwcy4xNS0uMDUuMTUtLjA1aDBzLjE0LS4wNC4xNC0uMDRoLjAxcy4xMy0uMDQuMTMtLjA0aC4wMnMwLDAsMCwwbC4xMy0uMDNoLjA0cy4xMi0uMDMuMTItLjAzaC4wMXMwLDAsMCwwaDBjLjEtLjAyLjE5LS4wNC4yOS0uMDVoLjAzcy4xMy0uMDIuMTMtLjAyaC4wMWwuMTUtLjAyaDBzLjA0LDAsLjA0LDBoLjEzczAtLjAxLDAtLjAxaC4xNHMuMDIsMCwuMDIsMGguMDJzLjEzLDAsLjEzLDBoLjAxcy4wMywwLC4wMywwaC4xNFptMzYuNCwxOC41M2M0LjksMCw4Ljg4LDMuOTgsOC44OCw4Ljg4cy0zLjk3LDguODgtOC44OCw4Ljg4LTguODgtMy45Ny04Ljg4LTguODgsMy45OC04Ljg4LDguODgtOC44OG0tNDAuNDQsMTguNjZjMi40MiwwLDQuMzksMS45Nyw0LjM5LDQuMzlzLTEuOTcsNC4zOS00LjM5LDQuMzktNC4zOS0xLjk3LTQuMzktNC4zOSwxLjk2LTQuMzksNC4zOS00LjM5bS0xMS4wNiwzMy4yOGMyLjAyLDAsMy42NiwxLjY0LDMuNjYsMy42NnMtMS42NCwzLjY2LTMuNjYsMy42Ni0zLjY2LTEuNjQtMy42Ni0zLjY2LDEuNjQtMy42NiwzLjY2LTMuNjZtNDIuMTQtMTQuNTNjMS40MiwwLDIuNTgsMS4xNSwyLjU4LDIuNThzLTEuMTUsMi41OC0yLjU4LDIuNTgtMi41Ny0xLjE1LTIuNTctMi41OCwxLjE1LTIuNTgsMi41Ny0yLjU4bS03MS0xMi45NWM1LjUsMCw5Ljk2LDQuNDYsOS45Niw5Ljk2cy00LjQ2LDkuOTYtOS45Niw5Ljk2LTkuOTYtNC40Ni05Ljk2LTkuOTYsNC40Ni05Ljk2LDkuOTYtOS45Nm0tMTguNTMtMjYuNDVjMi4xLDAsMy44LDEuNywzLjgsMy43OXMtMS43LDMuOC0zLjgsMy44LTMuNzktMS43LTMuNzktMy44LDEuNy0zLjc5LDMuNzktMy43OW05OC4xMi0yMy4zNmMxLjQyLDAsMi41NywxLjE1LDIuNTcsMi41N3MtMS4xNSwyLjU4LTIuNTcsMi41OC0yLjU3LTEuMTUtMi41Ny0yLjU4LDEuMTUtMi41NywyLjU3LTIuNTdtLTE5LjA5LTE5LjM1YzEuMiwwLDIuMTguOTgsMi4xOCwyLjE4cy0uOTgsMi4xOC0yLjE4LDIuMTgtMi4xOC0uOTgtMi4xOC0yLjE4Ljk3LTIuMTgsMi4xOC0yLjE4bS0yNS43Ny03LjljMi40MywwLDQuMzksMS45Nyw0LjM5LDQuMzlzLTEuOTcsNC4zOS00LjM5LDQuMzktNC4zOS0xLjk3LTQuMzktNC4zOSwxLjk3LTQuMzksNC4zOS00LjM5bS0yOC4yLDI3Ljc2Yy0uNTYuNzktMS4yMywxLjQ5LTEuOTgsMi4xbDUuNDcsMTEuMzVjLjg2LS4yLDEuNzYtLjMxLDIuNjgtLjMxLDQuMDUsMCw3LjYyLDIuMDYsOS43Miw1LjE4bDEwLjM1LTQuMDRjLS4wOC0uNTQtLjEyLTEuMDktLjEyLTEuNjYsMC0uNjMuMDUtMS4yNC4xNS0xLjg1bC0xMS4zOS00LjY3LTE0Ljg5LTYuMTFabS04Ljg4LTEyLjMxYzMuMjcsMCw1LjkzLDIuNjYsNS45Myw1Ljkzcy0yLjY1LDUuOTMtNS45Myw1LjkzLTUuOTMtMi42Ni01LjkzLTUuOTMsMi42Ni01LjkzLDUuOTMtNS45M202OS42NCw0MS4zN2wtMTUuMDItOC43MmMtMS44LDEuOTMtNC4yNywzLjI0LTcuMDMsMy41NGwtMS43NiwxNS4zYzEuNzIuNywzLjE4LDEuOSw0LjIyLDMuNDFsMTguOTYtNi43M2MtLjExLS43LS4xNy0xLjQyLS4xNy0yLjE1LDAtMS42NC4yOC0zLjIuOC00LjY2bS00NC4yMywxLjIzbDExLjYxLDkuODNjMS4xMS0uNzUsMi40LTEuMjgsMy43OC0xLjVsMS43NS0xNS4zYy0yLjMtLjgxLTQuMjctMi4zNS01LjYxLTQuMzRsLTEwLjMyLDQuMDVjLjA5LjU5LjE0LDEuMi4xNCwxLjgyLDAsMS45Ny0uNDksMy44Mi0xLjM0LDUuNDVtLTkuNTYsMjIuNDlsMTcuMDQtNWMuMDItMS4zNS4zMi0yLjY0Ljg1LTMuOGwtMTEuNi05LjgzYy0xLjk3LDEuNDktNC40MiwyLjM4LTcuMDgsMi4zOC0uNTMsMC0xLjA2LS4wNC0xLjU4LS4xMWwtMy42NCw5Ljg3YzIuNiwxLjUsNC43LDMuNzYsNi4wMSw2LjQ4bTE4LjM1LS4xMWwtMTYuOTcsNC45NWMuMDYuNTQuMDksMS4wOS4wOSwxLjY0LDAsOC4yNi02LjcsMTQuOTYtMTQuOTYsMTQuOTZzLTE0Ljk2LTYuNy0xNC45Ni0xNC45Niw2LjctMTQuOTYsMTQuOTYtMTQuOTZjLjkzLDAsMS44NS4wOSwyLjczLjI1bDMuNjQtOS44N2MtMi4zNi0xLjUzLTQuMTUtMy44OC00LjkzLTYuNjVsLTExLjQxLjY2Yy0uOTIsMy44Ny00LjQsNi43Ni04LjU2LDYuNzYtNC44NiwwLTguOC0zLjk0LTguOC04LjhzMy45NC04LjgsOC44LTguOGMzLjgsMCw3LjA0LDIuNDEsOC4yNyw1Ljc5bDExLjQxLS42NmMuNDctMi45NSwyLjA2LTUuNTQsNC4zLTcuMzJsLTUuNDctMTEuMzVjLS43NS4xNy0xLjU0LjI1LTIuMzQuMjUtNi4wNCwwLTEwLjk0LTQuOS0xMC45NC0xMC45M3M0LjktMTAuOTMsMTAuOTQtMTAuOTMsMTAuOTMsNC45LDEwLjkzLDEwLjkzYzAsLjU4LS4wNSwxLjE0LS4xMywxLjdsMTUuMDUsNi4xNywxMS4xNyw0LjY4YzEuMDUtMS41MSwyLjQ2LTIuNzUsNC4xLTMuNmwtNC4yNS0xNi41NGMtNS4wOS0uMTEtOS4xOS00LjI3LTkuMTktOS4zOXM0LjIxLTkuMzksOS4zOS05LjM5LDkuMzksNC4yLDkuMzksOS4zOWMwLDMuNDctMS44OCw2LjUtNC42OSw4LjEzbDQuMjUsMTYuNTRjLjEsMCwuMTksMCwuMjksMCwxLjA2LDAsMi4wOS4xNSwzLjA2LjQybDguMDItMTQuNzFjLTEuMDktMS4yNi0xLjc0LTIuOS0xLjc0LTQuNjksMC0zLjk2LDMuMjItNy4xOCw3LjE4LTcuMThzNy4xOCwzLjIyLDcuMTgsNy4xOC0zLjIyLDcuMTgtNy4xOCw3LjE4Yy0uMzQsMC0uNjctLjAyLS45OS0uMDdsLTguMDIsMTQuNzJjLjk0LjgzLDEuNzMsMS44MSwyLjM1LDIuOTFsMTguMTgtNS40Yy4yLTQsMy41Mi03LjE4LDcuNTctNy4xOHM3LjU4LDMuMzksNy41OCw3LjU4LTMuMzksNy41OC03LjU4LDcuNThjLTIuNTIsMC00Ljc1LTEuMjMtNi4xMi0zLjEybC0xOC4xOCw1LjRjLjAxLjI0LjAyLjQ3LjAyLjcxLDAsMS4xNi0uMTcsMi4yOC0uNSwzLjMzbDE1LjAzLDguNzJjMi41NS0yLjk2LDYuMzItNC44NCwxMC41My00Ljg0LDcuNjcsMCwxMy44OCw2LjIyLDEzLjg4LDEzLjg5cy02LjIyLDEzLjg4LTEzLjg4LDEzLjg4Yy01LjE1LDAtOS42NS0yLjgxLTEyLjA1LTYuOThsLTE5LjAyLDYuNjdjLjAxLjIuMDIuNC4wMi42LDAsLjcyLS4wOCwxLjQzLS4yNCwyLjFsMTYuODYsOS4xOWMxLjM0LTEuMiwzLjExLTEuOTMsNS4wNi0xLjkzLDQuMTgsMCw3LjU4LDMuMzksNy41OCw3LjU4cy0zLjM5LDcuNTgtNy41OCw3LjU4LTcuNTgtMy4zOS03LjU4LTcuNThjMC0uNC4wMy0uOC4wOS0xLjE5bC0xNi44Ni05LjE5Yy0xLjcxLDEuNzUtNC4wOSwyLjg0LTYuNzMsMi44NC0uMTcsMC0uMzQsMC0uNTEtLjAybC01LjQ5LDE2LjE0YzIuMTgsMS41NywzLjYsNC4xMywzLjYsNy4wMywwLDQuNzgtMy44OCw4LjY2LTguNjYsOC42NnMtOC42Ni0zLjg4LTguNjYtOC42NiwzLjg4LTguNjYsOC42Ni04LjY2Yy4wOSwwLC4xOCwwLC4yNywwbDUuNDktMTYuMTRjLTEuMTMtLjc3LTIuMDgtMS43OS0yLjc4LTIuOTdtLTE5LjE0LTM0LjUzYzMuNywwLDYuNjksMyw2LjY5LDYuN3MtMyw2LjctNi42OSw2LjctNi43LTMtNi43LTYuNywzLTYuNyw2LjctNi43Ij48L3BhdGg+Cjwvc3ZnPg=='

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
    .page-header .brand-logo img { height: 34px; width: auto; }
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
        <img src="data:image/svg+xml;base64,${logoB64}" alt="Asimetrix" style="height:34px;width:auto">
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
      <div style="position:relative;height:340px">
        <canvas id="growthChart"></canvas>
      </div>
    </div>

    ${lotSections}

    <div class="footer">Reporte PV · PigVision™ · Asimetrix · ${generatedAt}</div>
  </div>

  <script>
    (function() {
      var ds = ${JSON.stringify(growthDatasets)};
      var sc = ${growthScaleGlobal};
      var ctx = document.getElementById('growthChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: { datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          parsing: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
            tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + c.parsed.y.toFixed(1) + ' kg'; } } }
          },
          scales: {
            x: {
              type: 'linear',
              min: sc.xMin, max: sc.xMax,
              grid: { color: '#E8ECEE' },
              ticks: { color: '#4A4A68', font: { size: 11 } },
              title: { display: true, text: 'Edad (días)', color: '#4A4A68', font: { size: 11 } }
            },
            y: {
              min: sc.yMin, max: sc.yMax,
              grid: { color: '#E8ECEE' },
              ticks: { color: '#4A4A68', font: { size: 11 } },
              title: { display: true, text: 'Peso (kg)', color: '#4A4A68', font: { size: 11 } }
            }
          }
        }
      });
    })();
  <\/script>
</body>
</html>`
}
