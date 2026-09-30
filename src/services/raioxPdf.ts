import jsPDF from 'jspdf'
import type { RaioxResponse } from './raiox'
import {
  SIMBIOSIA_PDF_LOGO_HEIGHT,
  SIMBIOSIA_PDF_LOGO_PNG,
  SIMBIOSIA_PDF_LOGO_WIDTH,
} from './simbiosiaLogo'

type Report = RaioxResponse['report']
type Color = [number, number, number]

const C = {
  teal: [16, 69, 79] as Color,
  slate: [80, 98, 102] as Color,
  olive: [129, 130, 116] as Color,
  sage: [163, 171, 120] as Color,
  lime: [189, 224, 56] as Color,
  ink: [35, 59, 66] as Color,
  paper: [247, 249, 248] as Color,
  track: [234, 239, 237] as Color,
  line: [222, 229, 227] as Color,
  white: [255, 255, 255] as Color,
}
const AXIS = [C.teal, C.slate, C.olive, C.sage]

/** PDF presentation only; it consumes the existing report without recalculating scores or routing. */
export function createRaioxPdfModern(report: Report): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 18
  const width = pageW - margin * 2
  const footerLine = 282
  const footerText = 288
  const safeBottom = 274
  let y = 20

  const linesFor = (value: string, size: number, maxW: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return doc.splitTextToSize(String(value == null ? '' : value), maxW) as string[]
  }
  const textH = (value: string, size: number, maxW: number, bold = false) =>
    linesFor(value, size, maxW, bold).length * size * 0.46
  const drawText = (
    value: string,
    x: number,
    baseline: number,
    maxW: number,
    size: number,
    color: Color,
    bold = false,
  ) => {
    const lines = linesFor(value, size, maxW, bold)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    if (lines.length) doc.text(lines, x, baseline)
    return lines.length * size * 0.46
  }
  const card = (
    x: number,
    top: number,
    w: number,
    h: number,
    fill: Color = C.white,
    stroke: Color = C.line,
  ) => {
    doc.setFillColor(...fill)
    doc.setDrawColor(...stroke)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, top, w, h, 1.8, 1.8, 'FD')
  }
  const topRule = () => {
    doc.setFillColor(...C.teal)
    doc.rect(0, 0, pageW, 3, 'F')
    doc.setFillColor(...C.lime)
    doc.rect(0, 0, 34, 3, 'F')
  }
  const section = (label: string, top: number) => {
    doc.setFillColor(...C.lime)
    doc.roundedRect(margin, top + 0.3, 1.7, 5, 0.7, 0.7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.teal)
    doc.text(label.toUpperCase(), margin + 4.5, top + 4.2)
    return top + 7.4
  }
  const continuation = (label: string) => {
    doc.addPage()
    topRule()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(...C.olive)
    doc.text('RAIO-X FAROL · CONTINUAÇÃO', margin, 16)
    doc.setFontSize(12.5)
    doc.setTextColor(...C.teal)
    doc.text(label, margin, 25)
    y = 31
  }

  const compactItem = (
    value: string,
    x: number,
    top: number,
    w: number,
    marker: Color,
    font = 6.2,
  ) => {
    const lines = linesFor(value, font, w - 7)
    const h = Math.max(7.2, lines.length * font * 0.46 + 3)
    card(x, top, w, h, C.white)
    doc.setFillColor(...marker)
    doc.circle(x + 2.4, top + h / 2, 0.65, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(font)
    doc.setTextColor(...C.ink)
    doc.text(lines, x + 4.5, top + 1.9)
    return top + h + 1
  }

  // Official logo source, width and placement remain unchanged.
  const logoWidth = 62
  const logoHeight = (logoWidth * SIMBIOSIA_PDF_LOGO_HEIGHT) / SIMBIOSIA_PDF_LOGO_WIDTH
  const logoBase64 = SIMBIOSIA_PDF_LOGO_PNG.replace(/^data:image\/png;base64,/, '')
  const logoBytes = Uint8Array.from(atob(logoBase64), (char) => char.charCodeAt(0))
  const logoDataUri = `data:image/png;base64,${logoBase64}`
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (pngSignature.some((byte, index) => logoBytes[index] !== byte)) {
    throw new Error(
      `Logomarca oficial inválida antes de gerar o PDF (${logoBase64.length} caracteres base64).`,
    )
  }
  topRule()
  doc.addImage(logoDataUri, 'PNG', margin, 10, logoWidth, logoHeight, 'simbiosia-official', 'FAST')

  // Página 1 — resumo, recomendação e gráfico horizontal dos quatro eixos.
  y = 38
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18.5)
  doc.setTextColor(...C.teal)
  doc.text('Raio-X FAROL', margin, y)
  drawText('L — Liberação de Valor · Processo e valor com IA', margin, y + 6.2, width, 8, C.slate)
  const identityY = 51
  card(margin, identityY, width, 21, C.paper)
  const identity = [
    { x: margin + 5, w: 52, label: 'RELATÓRIO PARA', value: report.nome },
    {
      x: margin + 61,
      w: 47,
      label: 'PERCURSO',
      value: report.tipo === 'executivo' ? 'Meu processo profissional' : 'Minha empresa',
    },
    { x: margin + 112, w: 55, label: 'EMPRESA', value: report.empresa || '—' },
  ]
  identity.forEach((item) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.7)
    doc.setTextColor(...C.olive)
    doc.text(item.label, item.x, identityY + 6.2)
    drawText(item.value, item.x, identityY + 12.8, item.w, 7.1, C.ink, true)
  })

  y = section('Seu FAROL', 84)
  const chartY = 102
  const rowStep = 29
  report.stages.forEach((stage, index) => {
    const top = chartY + index * rowStep
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(...C.ink)
    doc.text(`${stage.key} — ${stage.title}`, margin, top + 3.5)
    doc.setFontSize(8)
    doc.setTextColor(...C.teal)
    doc.text(`${stage.score}/100`, pageW - margin, top + 3.5, { align: 'right' })
    doc.setFillColor(...C.track)
    doc.roundedRect(margin, top + 5.8, width, 3.6, 1.5, 1.5, 'F')
    const barW = Math.max(0, Math.min(width, (width * stage.score) / 100))
    if (barW > 0.1) {
      doc.setFillColor(...AXIS[index % AXIS.length])
      doc.roundedRect(margin, top + 5.8, barW, 3.6, 1.5, 1.5, 'F')
    }
    doc.setDrawColor(...C.white)
    doc.setLineWidth(0.3)
    doc.line(margin + width / 2, top + 5.6, margin + width / 2, top + 9.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.2)
    doc.setTextColor(...C.slate)
    doc.text(stage.state, margin, top + 14.2)
  })

  // Página 2 — leituras, gargalo, status, condições e alertas.
  doc.addPage()
  topRule()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.olive)
  doc.text('SEU FAROL', margin, 16)
  doc.setFontSize(14)
  doc.setTextColor(...C.teal)
  doc.text('Leitura por etapa', margin, 25)
  let readY = 31
  const readGap = 4
  const readW = (width - readGap) / 2
  for (let r = 0; r < 2; r += 1) {
    const pair = report.stages.slice(r * 2, r * 2 + 2)
    const readH = Math.max(31, ...pair.map((stage) => 15 + textH(stage.reading, 6.3, readW - 10)))
    pair.forEach((stage, j) => {
      const x = margin + j * (readW + readGap)
      const idx = r * 2 + j
      card(x, readY, readW, readH, C.white)
      doc.setFillColor(...AXIS[idx % AXIS.length])
      doc.roundedRect(x, readY, 1.5, readH, 0.7, 0.7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(...C.teal)
      doc.text(`${stage.key} — ${stage.title}`, x + 4.5, readY + 5.2)
      doc.setFontSize(5.9)
      doc.setTextColor(...C.olive)
      doc.text(stage.state, x + 4.5, readY + 9.5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...C.ink)
      doc.text(`${stage.score}/100`, x + readW - 3.5, readY + 5.2, { align: 'right' })
      drawText(stage.reading, x + 4.5, readY + 13.8, readW - 8, 6.3, C.slate)
    })
    readY += readH + 2
  }
  let p2 = section('Ponto de atenção principal', readY)
  const bottleneckH = Math.max(
    23,
    Math.max(
      textH(report.bottleneck.description, 6.2, 65),
      textH(report.firstValue, 6.2, width - 92),
    ) + 11,
  )
  card(margin, p2, width, bottleneckH, C.paper)
  doc.setFillColor(...C.lime)
  doc.roundedRect(margin, p2, 1.6, bottleneckH, 0.7, 0.7, 'F')
  const split = margin + 78
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.olive)
  doc.text(`GARGALO · ${report.bottleneck.key}`, margin + 5, p2 + 5)
  doc.setFontSize(7.6)
  doc.setTextColor(...C.teal)
  doc.text(report.bottleneck.title, margin + 5, p2 + 10)
  drawText(report.bottleneck.description, margin + 5, p2 + 14.2, 67, 6.2, C.slate)
  doc.setDrawColor(...C.line)
  doc.line(split, p2 + 3.5, split, p2 + bottleneckH - 3.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.olive)
  doc.text('PRIMEIRA AÇÃO', split + 5, p2 + 5)
  drawText(report.firstValue, split + 5, p2 + 10, width - 92, 6.2, C.ink)
  p2 += bottleneckH + 2
  const statusH = Math.max(10, textH(report.pilotStatus, 6.2, width - 12, true) + 4)
  card(margin, p2, width, statusH, C.paper)
  doc.setFillColor(...C.teal)
  doc.roundedRect(margin, p2, 1.5, statusH, 0.7, 0.7, 'F')
  drawText(report.pilotStatus, margin + 5, p2 + 4, width - 10, 6.2, C.ink, true)
  p2 += statusH + 2.2

  const gateGap = 4
  const gates = report.pilotConditions || []
  const alerts = report.safetyAlerts || []
  const hasAlerts = alerts.length > 0
  const gateW = hasAlerts ? (width - gateGap) / 2 : width
  const gateHdrY = p2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.7)
  doc.setTextColor(...C.olive)
  doc.text('PONTOS A CONFIRMAR', margin, gateHdrY + 3.5)
  if (hasAlerts) {
    doc.text('SEGURANÇA E REVISÃO', margin + gateW + gateGap, gateHdrY + 3.5)
  }
  const drawGate = (value: string, x: number, top: number, w: number, accent: Color) => {
    const font = 5.6
    const lines = linesFor(value, font, w - 7)
    const h = Math.max(6.8, lines.length * font * 0.46 + 2.3)
    card(x, top, w, h, C.white)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(font)
    doc.setTextColor(...C.ink)
    doc.text(lines, x + 4, top + 1.6)
    return top + h + 0.7
  }
  let gyL = gateHdrY + 5.5
  let gyR = gateHdrY + 5.5
  const overflow: Array<[string, Color]> = []
  gates.forEach((value) => {
    if (gyL + textH(value, 5.6, gateW - 7) + 3 < safeBottom)
      gyL = drawGate(value, margin, gyL, gateW, C.sage)
    else overflow.push([value, C.sage])
  })
  alerts.forEach((value) => {
    if (gyR + textH(value, 5.6, gateW - 7) + 3 < safeBottom)
      gyR = drawGate(value, margin + gateW + gateGap, gyR, gateW, C.olive)
    else overflow.push([value, C.olive])
  })
  if (overflow.length) {
    continuation('Condições adicionais')
    let extraY = section('Condições adicionais', y)
    overflow.forEach(([value, accent]) => {
      const nextH = textH(value, 6.2, width - 7) + 3
      if (extraY + nextH > safeBottom) {
        continuation('Condições adicionais')
        extraY = section('Condições adicionais · continuação', y)
      }
      extraY = compactItem(value, margin, extraY, width, accent, 6.2)
    })
  }

  // Página 3 — contexto, métricas, ações e cuidados em composição compacta.
  doc.addPage()
  topRule()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.olive)
  doc.text('LIBERAÇÃO DE VALOR', margin, 16)
  doc.setFontSize(14)
  doc.setTextColor(...C.teal)
  doc.text('Da leitura à ação', margin, 25)
  y = 30

  const contextItems: Array<[string, string, Color]> =
    report.tipo === 'empresa'
      ? ([
          ['Processo escolhido', report.context.processo, C.teal],
          ['Por que agora', report.context.porQueAgora, C.sage],
          ['Fluxo descrito', report.context.fluxoAtual, C.slate],
          ['Critério de sucesso', report.context.criterioSucesso, C.olive],
        ].filter(([, value]) => !!value) as Array<[string, string, Color]>)
      : report.context.mudancaDesejada
        ? [['Mudança desejada', report.context.mudancaDesejada, C.sage]]
        : []
  if (contextItems.length) {
    y = section(
      report.tipo === 'empresa' ? 'Contexto do processo' : 'O que você gostaria de mudar',
      y,
    )
    const gap = 3.5
    const colW = (width - gap) / 2
    for (let i = 0; i < contextItems.length; i += 2) {
      const pair = contextItems.slice(i, i + 2)
      const heights = pair.map(([label, value]) => Math.max(18, 9 + textH(value, 5.9, colW - 9)))
      const rowH = Math.max(...heights)
      if (y + rowH > 270) {
        continuation('Contexto do processo')
        y = section('Contexto do processo · continuação', y)
      }
      pair.forEach(([label, value, accent], j) => {
        const x = margin + j * (colW + gap)
        card(x, y, colW, rowH, C.paper)
        doc.setFillColor(...accent)
        doc.roundedRect(x, y, 1.4, rowH, 0.6, 0.6, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(5.1)
        doc.setTextColor(...C.olive)
        doc.text(label.toUpperCase(), x + 4.5, y + 4.5)
        drawText(value, x + 4.5, y + 8.7, colW - 9, 5.9, C.ink)
      })
      y += rowH + 1.5
    }
  }

  y = section('L — Liberação de Valor', y + 0.5)
  const metricGap = 4
  const metricW = (width - metricGap) / 2
  const metricFont = 6.5
  const metricH = Math.max(
    18,
    Math.max(
      textH(report.primeiraAplicacao, metricFont, metricW - 8),
      textH(report.measurement, metricFont, metricW - 8),
    ) + 9,
  )
  if (y + metricH > 272) {
    continuation('Liberação de Valor')
    y = section('L — Liberação de Valor · continuação', y)
  }
  card(margin, y, metricW, metricH, C.paper)
  card(margin + metricW + metricGap, y, metricW, metricH, C.paper)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.3)
  doc.setTextColor(...C.olive)
  doc.text('PRIMEIRA APLICAÇÃO', margin + 4, y + 5)
  doc.text('RESULTADO A ACOMPANHAR', margin + metricW + metricGap + 4, y + 5)
  drawText(report.primeiraAplicacao, margin + 4, y + 9, metricW - 8, metricFont, C.ink)
  drawText(
    report.measurement,
    margin + metricW + metricGap + 4,
    y + 9,
    metricW - 8,
    metricFont,
    C.ink,
  )
  y += metricH + 2

  y = section('Próximas ações', y)
  const steps = report.sevenDayPlan || []
  const stepGap = 2.5
  const stepW = (width - stepGap) / 2
  for (let i = 0; i < steps.length; i += 2) {
    const pair = steps.slice(i, i + 2)
    const heights = pair.map((value) => Math.max(9, textH(value, 5.9, stepW - 9) + 4))
    const rowH = Math.max(...heights)
    if (y + rowH > 270) {
      continuation('Próximas ações')
      y = section('Próximas ações · continuação', y)
    }
    pair.forEach((value, j) => {
      const x = margin + j * (stepW + stepGap)
      card(x, y, stepW, rowH, C.white)
      drawText(value, x + 4, y + 3.2, stepW - 8, 5.9, C.ink)
    })
    y += rowH + 1
  }

  const avoid = report.avoid || []
  if (avoid.length) {
    y = section('Cuidados para esta etapa', y + 0.3)
    for (let i = 0; i < avoid.length; i += 2) {
      const pair = avoid.slice(i, i + 2)
      const heights = pair.map((value) => Math.max(7, textH(value, 5.7, stepW - 7) + 3))
      const rowH = Math.max(...heights)
      if (y + rowH > 270) {
        continuation('Cuidados para esta etapa')
        y = section('Cuidados para esta etapa · continuação', y)
      }
      pair.forEach((value, j) => {
        const x = margin + j * (stepW + stepGap)
        card(x, y, stepW, rowH, C.paper)
        drawText(value, x + 4, y + 3, stepW - 8, 5.7, C.ink)
      })
      y += rowH + 1
    }
  }

  const recommendationHeight = 35
  const limitH = Math.max(14, textH(report.limitations, 5.5, width - 9) + 6)
  const reservedHeight = recommendationHeight + 2 + 7.4 + limitH + 2
  if (y + reservedHeight > safeBottom) continuation('Próximo passo recomendado')

  const heroY = y + 0.3
  card(margin, heroY, width, recommendationHeight, C.teal, C.teal)
  doc.setFillColor(...C.lime)
  doc.roundedRect(margin, heroY + 5, 1.7, 25, 0.7, 0.7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.3)
  doc.setTextColor(...C.lime)
  doc.text('PRÓXIMO PASSO RECOMENDADO', margin + 6, heroY + 7.8)
  doc.setFontSize(11.6)
  doc.setTextColor(...C.white)
  doc.text(report.nextProduct, margin + 6, heroY + 16)
  drawText(report.routingExplanation, margin + 6, heroY + 21.2, 122, 6.8, C.white)
  const scoreX = pageW - margin - 16.5
  const scoreY = heroY + 17.4
  doc.setFillColor(...C.lime)
  doc.circle(scoreX, scoreY, 8.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...C.teal)
  doc.text(String(report.overall), scoreX, scoreY + 0.5, { align: 'center' })
  doc.setFontSize(5.6)
  doc.text('/100', scoreX, scoreY + 4.4, { align: 'center' })
  y = heroY + recommendationHeight + 2

  y = section('Importante', y)
  if (y + limitH > 274) {
    continuation('Importante')
    y = section('Importante · continuação', y)
  }
  card(margin, y, width, limitH, C.paper)
  doc.setFillColor(...C.slate)
  doc.roundedRect(margin, y, 1.4, limitH, 0.6, 0.6, 'F')
  drawText(report.limitations, margin + 4.5, y + 4.5, width - 9, 5.5, C.ink)

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p)
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.25)
    doc.line(margin, footerLine, pageW - margin, footerLine)
    const footerLogoWidth = 42
    const footerLogoHeight =
      (footerLogoWidth * SIMBIOSIA_PDF_LOGO_HEIGHT) / SIMBIOSIA_PDF_LOGO_WIDTH
    doc.addImage(
      logoDataUri,
      'PNG',
      margin,
      footerLine + 0.9,
      footerLogoWidth,
      footerLogoHeight,
      'simbiosia-official',
      'FAST',
    )
    doc.text(
      `${String(p).padStart(2, '0')} / ${String(pages).padStart(2, '0')}`,
      pageW - margin,
      footerText,
      { align: 'right' },
    )
  }
  return doc.output('datauristring')
}
