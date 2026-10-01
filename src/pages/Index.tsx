import { FormEvent, useMemo, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import jsPDF from 'jspdf'
import {
  SIMBIOSIA_PDF_LOGO_HEIGHT,
  SIMBIOSIA_PDF_LOGO_PNG,
  SIMBIOSIA_PDF_LOGO_WIDTH,
} from '@/services/simbiosiaLogo'
import { submitRaiox, RaioxTipo } from '@/services/raiox'
import { createRaioxPdfModern } from '@/services/raioxPdf'

type Answer = string | string[]
type Question = {
  id: string
  label: string
  help?: string
  type: 'single' | 'multi' | 'text' | 'email'
  options?: Array<{ value: string; label: string }>
  required?: boolean
  maxSelections?: number
}

type Report = Awaited<ReturnType<typeof submitRaiox>>['report']

function createRaioxPdf(report: Report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const width = 210 - margin * 2
  let y = 20
  const ensureSpace = (height: number) => {
    if (y + height > 282) {
      doc.addPage()
      y = 20
    }
  }
  // Helpers visuais do PDF. Não alteram dados nem scoring.
  const colors = {
    teal: [16, 69, 79] as [number, number, number],
    slate: [80, 98, 102] as [number, number, number],
    olive: [129, 130, 116] as [number, number, number],
    sage: [163, 171, 120] as [number, number, number],
    lime: [189, 224, 56] as [number, number, number],
    ink: [35, 59, 66] as [number, number, number],
    paper: [247, 249, 248] as [number, number, number],
    track: [234, 239, 237] as [number, number, number],
    line: [222, 229, 227] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  }
  const axisColors = [colors.teal, colors.slate, colors.olive, colors.sage]
  const textHeight = (text: string, size: number, maxWidth: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    return (
      (doc.splitTextToSize(String(text == null ? '' : text), maxWidth) as string[]).length *
      size *
      0.46
    )
  }
  const drawText = (
    text: string,
    x: number,
    baseline: number,
    maxWidth: number,
    size: number,
    color: [number, number, number],
    bold = false,
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text == null ? '' : text), maxWidth) as string[]
    if (lines.length) doc.text(lines, x, baseline)
    return lines.length * size * 0.46
  }
  const drawCard = (
    x: number,
    top: number,
    cardWidth: number,
    cardHeight: number,
    fill: [number, number, number],
    stroke: [number, number, number] = colors.line,
  ) => {
    doc.setFillColor(...fill)
    doc.setDrawColor(...stroke)
    doc.setLineWidth(0.25)
    doc.roundedRect(x, top, cardWidth, cardHeight, 2.2, 2.2, 'FD')
  }
  const estimateTextHeight = (text: string, size: number, gap: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(String(text), width)
    return lines.length * (size * 0.45) + gap
  }
  const addSectionHeading = (text: string, size = 15, gap = 8) => {
    ensureSpace(size * 0.45 + gap + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(16, 69, 79)
    doc.text(text, margin, y)
    y += gap
  }
  const drawTopRule = () => {
    doc.setFillColor(...colors.teal)
    doc.rect(0, 0, 210, 3, 'F')
    doc.setFillColor(...colors.lime)
    doc.rect(0, 0, 33, 3, 'F')
  }
  const startContinuationPage = (section: string) => {
    doc.addPage()
    drawTopRule()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...colors.olive)
    doc.text('RAIO-X FAROL · CONTINUAÇÃO', margin, 18)
    doc.setFontSize(14)
    doc.setTextColor(...colors.teal)
    doc.text(section, margin, 28)
    y = 36
    return y
  }
  const drawSection = (text: string, top: number) => {
    let sectionTop = top
    if (sectionTop + 10 > 276) sectionTop = startContinuationPage(text)
    doc.setFillColor(...colors.lime)
    doc.roundedRect(margin, sectionTop + 0.3, 1.8, 5.5, 0.8, 0.8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.3)
    doc.setTextColor(...colors.teal)
    doc.text(text.toUpperCase(), margin + 5, sectionTop + 4.6)
    return sectionTop + 9
  }
  const drawListItem = (
    text: string,
    top: number,
    fill: [number, number, number] = colors.white,
    marker: [number, number, number] = colors.sage,
    fontSize = 8.2,
    section = 'Continuação',
  ) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    let lines = doc.splitTextToSize(String(text == null ? '' : text), width - 16) as string[]
    if (!lines.length) lines = ['']
    const lineHeight = fontSize * 0.46
    let cursor = 0
    let itemTop = top
    while (cursor < lines.length) {
      const availableLines = Math.floor((276 - itemTop - 6) / lineHeight)
      if (availableLines < 1) {
        itemTop = startContinuationPage(section)
        continue
      }
      const chunk = lines.slice(cursor, cursor + availableLines)
      const height = Math.max(10, chunk.length * lineHeight + 5.5)
      drawCard(margin, itemTop, width, height, fill)
      doc.setFillColor(...marker)
      doc.circle(margin + 5.5, itemTop + height / 2, 1.2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      doc.setTextColor(...colors.ink)
      doc.text(chunk, margin + 10, itemTop + 5)
      itemTop += height + 2.2
      cursor += chunk.length
      if (cursor < lines.length) itemTop = startContinuationPage(`${section} · continuação`)
    }
    return itemTop
  }
  const addText = (
    text: string,
    size = 10,
    color: [number, number, number] = [23, 59, 66],
    gap = 5,
  ) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text), width)
    ensureSpace(lines.length * (size * 0.45) + gap)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.45) + gap
  }
  const logoWidth = 62
  const logoHeight = (logoWidth * SIMBIOSIA_PDF_LOGO_HEIGHT) / SIMBIOSIA_PDF_LOGO_WIDTH
  const logoBase64 = SIMBIOSIA_PDF_LOGO_PNG.replace(/^data:image\/png;base64,/, '')
  const logoBytes = Uint8Array.from(atob(logoBase64), (char) => char.charCodeAt(0))
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (pngSignature.some((byte, index) => logoBytes[index] !== byte)) {
    throw new Error(
      `Logomarca inválida antes de gerar o PDF (assinatura PNG incorreta; ${logoBase64.length} caracteres base64).`,
    )
  }
  drawTopRule()
  doc.addImage(
    SIMBIOSIA_PDF_LOGO_PNG,
    'PNG',
    margin,
    10,
    logoWidth,
    logoHeight,
    'simbiosia-official',
    'FAST',
  )
  y = 38
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.setTextColor(...colors.teal)
  doc.text('Raio-X FAROL', margin, y)
  drawText('L — Legado', margin, y + 6.5, width, 8.5, colors.slate)
  const identityTop = 52
  drawCard(margin, identityTop, width, 23, colors.paper)
  const columns = [
    { x: margin + 6, w: 58, label: 'RELATÓRIO PARA', value: report.nome },
    {
      x: margin + 68,
      w: 48,
      label: 'PERCURSO',
      value: report.tipo === 'executivo' ? 'Meu processo profissional' : 'Minha empresa',
    },
    { x: margin + 119, w: 46, label: 'EMPRESA', value: report.empresa || '—' },
  ]
  columns.forEach((column) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.4)
    doc.setTextColor(...colors.olive)
    doc.text(column.label, column.x, identityTop + 7)
    drawText(column.value, column.x, identityTop + 14, column.w, 8.2, colors.ink, true)
  })

  const heroTop = 82
  drawCard(margin, heroTop, width, 39, colors.teal, colors.teal)
  doc.setFillColor(...colors.lime)
  doc.roundedRect(margin, heroTop + 6, 2, 27, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...colors.lime)
  doc.text('PRÓXIMO PASSO RECOMENDADO', margin + 7, heroTop + 9)
  doc.setFontSize(13)
  doc.setTextColor(...colors.white)
  doc.text(report.nextProduct, margin + 7, heroTop + 18)
  drawText(report.routingExplanation, margin + 7, heroTop + 24, 125, 7.6, colors.white)
  const overallCx = 210 - margin - 18
  const overallCy = heroTop + 19.5
  doc.setFillColor(...colors.lime)
  doc.circle(overallCx, overallCy, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...colors.teal)
  doc.text(String(report.overall), overallCx, overallCy + 1, { align: 'center' })
  doc.setFontSize(6.4)
  doc.text('/100', overallCx, overallCy + 5.6, { align: 'center' })

  /*
  y = 133
=======
  y = 133
=======

  */
  y = 133
  y = drawSection('Seu FAROL', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(...colors.slate)
  doc.text('Pontuação por eixo · escala de 0 a 100', 210 - margin, y - 5, { align: 'right' })
  const barTop = y + 1
  const barStep = 25
  report.stages.forEach((stage, index) => {
    const top = barTop + index * barStep
    const accent = axisColors[index % axisColors.length]
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.1)
    doc.setTextColor(...colors.ink)
    doc.text(`${stage.key} — ${stage.title}`, margin, top + 4)
    doc.setFontSize(8.8)
    doc.setTextColor(...colors.teal)
    doc.text(`${stage.score}/100`, 210 - margin, top + 4, { align: 'right' })
    doc.setFillColor(...colors.track)
    doc.roundedRect(margin, top + 7, width, 4, 1.8, 1.8, 'F')
    const fillWidth = Math.max(0, Math.min(width, (width * stage.score) / 100))
    if (fillWidth > 0.2) {
      doc.setFillColor(...accent)
      doc.roundedRect(margin, top + 7, fillWidth, 4, 1.8, 1.8, 'F')
    }
    doc.setDrawColor(...colors.white)
    doc.setLineWidth(0.4)
    doc.line(margin + width / 2, top + 6.7, margin + width / 2, top + 11.3)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...colors.slate)
    doc.text(stage.state, margin, top + 17)
  })
  const scaleY = barTop + barStep * report.stages.length - 1
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...colors.slate)
  doc.text('0', margin, scaleY)
  doc.text('50', margin + width / 2, scaleY, { align: 'center' })
  doc.text('100', 210 - margin, scaleY, { align: 'right' })
  doc.addPage()
  drawTopRule()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.3)
  doc.setTextColor(...colors.olive)
  doc.text('SEU FAROL', margin, 18)
  doc.setFontSize(16.5)
  doc.setTextColor(...colors.teal)
  doc.text('Leitura por etapa', margin, 27)
  drawText(
    'A pontuação organiza a conversa; cada eixo mostra um aspecto do cenário.',
    margin,
    34,
    width,
    8.2,
    colors.slate,
  )
  const readingGap = 6
  const readingWidth = (width - readingGap) / 2
  const readingTop = 44
  const readingHeight = 47
  report.stages.forEach((stage, index) => {
    const x = margin + (index % 2) * (readingWidth + readingGap)
    const top = readingTop + Math.floor(index / 2) * 54
    const accent = axisColors[index % axisColors.length]
    drawCard(x, top, readingWidth, readingHeight, colors.white)
    doc.setFillColor(...accent)
    doc.roundedRect(x, top, 2, readingHeight, 0.9, 0.9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...colors.teal)
    doc.text(`${stage.key} — ${stage.title}`, x + 6, top + 9)
    doc.setFontSize(7.8)
    doc.setTextColor(...colors.ink)
    doc.text(`${stage.score}/100`, x + readingWidth - 5, top + 9, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.9)
    doc.setTextColor(...colors.olive)
    doc.text(stage.state, x + 6, top + 15)
    drawText(stage.reading, x + 6, top + 23, readingWidth - 12, 7.4, colors.slate)
  })

  y = 158
  y = drawSection('Ponto de atenção principal', y)
  const insightTop = y
  const insightHeight = 41
  drawCard(margin, insightTop, width, insightHeight, colors.paper)
  doc.setFillColor(...colors.lime)
  doc.roundedRect(margin, insightTop, 2, insightHeight, 0.9, 0.9, 'F')
  const splitX = margin + 84
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...colors.olive)
  doc.text(`GARGALO · ${report.bottleneck.key}`, margin + 7, insightTop + 8)
  doc.setFontSize(10)
  doc.setTextColor(...colors.teal)
  doc.text(report.bottleneck.title, margin + 7, insightTop + 15)
  drawText(report.bottleneck.description, margin + 7, insightTop + 21, 70, 7.8, colors.slate)
  doc.setDrawColor(...colors.line)
  doc.line(splitX, insightTop + 6, splitX, insightTop + insightHeight - 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...colors.olive)
  doc.text('PRIMEIRA AÇÃO', splitX + 6, insightTop + 8)
  drawText(report.firstValue, splitX + 6, insightTop + 15, width - 98, 7.8, colors.ink)

  doc.addPage()
  drawTopRule()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.3)
  doc.setTextColor(...colors.olive)
  doc.text('LEGADO', margin, 18)
  doc.setFontSize(16.5)
  doc.setTextColor(...colors.teal)
  doc.text('Da leitura à ação', margin, 27)
  drawText(
    'Condições para avançar e próximos passos para transformar a leitura em ação.',
    margin,
    34,
    width,
    8.2,
    colors.slate,
  )
  y = 43
  y = drawSection('Condições antes de qualquer piloto', y)
  const statusHeight = Math.max(17, textHeight(report.pilotStatus, 8.2, width - 18, true) + 9)
  drawCard(margin, y, width, statusHeight, colors.paper)
  doc.setFillColor(...colors.teal)
  doc.roundedRect(margin, y, 2, statusHeight, 0.9, 0.9, 'F')
  drawText(report.pilotStatus, margin + 8, y + 6, width - 16, 8.2, colors.ink, true)
  y += statusHeight + 3
  y = drawSection('Pontos a confirmar', y)
  report.pilotConditions.forEach((item) => {
    y = drawListItem(item, y, colors.white, colors.sage, 7.8)
  })
  if (report.safetyAlerts.length > 0) {
    y += 1
    y = drawSection('Segurança e revisão', y)
    report.safetyAlerts.forEach((item) => {
      y = drawListItem(item, y, colors.paper, colors.olive, 7.8)
    })
  }
  doc.addPage()
  drawTopRule()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.3)
  doc.setTextColor(...colors.olive)
  doc.text('LEGADO', margin, 18)
  doc.setFontSize(16.5)
  doc.setTextColor(...colors.teal)
  doc.text('Da leitura à ação', margin, 27)
  drawText(
    'Condições para avançar e próximos passos para transformar a leitura em ação.',
    margin,
    34,
    width,
    8.2,
    colors.slate,
  )
  y = 43
  if (report.tipo === 'empresa' && report.context.processo) {
    y = drawSection('Processo escolhido', y + 1)
    y = drawListItem(
      report.context.processo,
      y,
      colors.paper,
      colors.teal,
      8.1,
      'Processo escolhido',
    )
  }
  if (report.tipo === 'executivo' && report.context.mudancaDesejada) {
    y = drawSection('O que você gostaria de mudar', y + 1)
    y = drawListItem(
      report.context.mudancaDesejada,
      y,
      colors.paper,
      colors.sage,
      8.1,
      'O que você gostaria de mudar',
    )
  }
  if (report.tipo === 'empresa' && report.context.porQueAgora) {
    y = drawSection('Por que agora', y + 1)
    y = drawListItem(report.context.porQueAgora, y, colors.paper, colors.sage, 8.1, 'Por que agora')
  }
  if (report.tipo === 'empresa' && report.context.fluxoAtual) {
    y = drawSection('Fluxo descrito', y + 1)
    y = drawListItem(
      report.context.fluxoAtual,
      y,
      colors.paper,
      colors.slate,
      8.1,
      'Fluxo descrito',
    )
  }
  if (report.tipo === 'empresa' && report.context.criterioSucesso) {
    y = drawSection('Critério de sucesso informado', y + 1)
    y = drawListItem(
      report.context.criterioSucesso,
      y,
      colors.paper,
      colors.olive,
      8.1,
      'Critério de sucesso',
    )
  }
  y += 2
  y = drawSection('L — Legado', y)
  const metricGap = 6
  const metricWidth = (width - metricGap) / 2
  const metricFont = 8
  const metricHeight = Math.max(
    29,
    Math.max(
      textHeight(report.primeiraAplicacao, metricFont, metricWidth - 12),
      textHeight(report.measurement, metricFont, metricWidth - 12),
    ) + 16,
  )
  drawCard(margin, y, metricWidth, metricHeight, colors.paper)
  drawCard(margin + metricWidth + metricGap, y, metricWidth, metricHeight, colors.paper)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...colors.olive)
  doc.text('PRIMEIRA APLICAÇÃO', margin + 6, y + 7)
  doc.text('RESULTADO A ACOMPANHAR', margin + metricWidth + metricGap + 6, y + 7)
  drawText(report.primeiraAplicacao, margin + 6, y + 14, metricWidth - 12, metricFont, colors.ink)
  drawText(
    report.measurement,
    margin + metricWidth + metricGap + 6,
    y + 14,
    metricWidth - 12,
    metricFont,
    colors.ink,
  )
  y += metricHeight + 4
  y += 2
  y = drawSection('Próximas ações', y)
  report.sevenDayPlan.forEach((item, index) => {
    const height = Math.max(12, textHeight(item, 7.9, width - 23) + 6)
    if (y + height > 276) y = startContinuationPage('Próximas ações')
    drawCard(margin + 9, y, width - 9, height, colors.white)
    doc.setFillColor(...colors.teal)
    doc.circle(margin + 4.5, y + height / 2, 3.3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...colors.white)
    doc.text(String(index + 1), margin + 4.5, y + height / 2 + 1, { align: 'center' })
    drawText(item, margin + 14, y + 5, width - 18, 7.9, colors.ink)
    y += height + 2
  })
  y += 1
  y = drawSection('Cuidados para esta etapa', y)
  report.avoid.forEach((item) => {
    y = drawListItem(item, y, colors.paper, colors.olive, 7.8)
  })
  y += 1
  const limitationHeight = Math.max(22, textHeight(report.limitations, 7.5, width - 16) + 13)
  if (y + limitationHeight > 276) y = startContinuationPage('Importante')
  drawCard(margin, y, width, limitationHeight, colors.paper)
  doc.setFillColor(...colors.slate)
  doc.roundedRect(margin, y, 2, limitationHeight, 0.9, 0.9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...colors.olive)
  doc.text('IMPORTANTE', margin + 7, y + 6)
  drawText(report.limitations, margin + 7, y + 12, width - 15, 7.5, colors.ink)

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...colors.line)
    doc.setLineWidth(0.25)
    doc.line(margin, 284, 210 - margin, 284)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...colors.slate)
    doc.text('SIMBIOSIA · RAIO-X FAROL', margin, 289)
    doc.text(
      `${String(page).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`,
      210 - margin,
      289,
      {
        align: 'right',
      },
    )
  }
  return doc.output('datauristring')
}

const executiveSections: Array<{
  key: string
  letter: string
  title: string
  intro: string
  questions: Question[]
}> = [
  {
    key: 'F',
    letter: 'F',
    title: 'Foco',
    intro: 'Qual processo da sua atuação profissional você gostaria de melhorar?',
    questions: [
      { id: 'E-CAD3', label: 'Cargo ou função principal', type: 'text', required: true },
      { id: 'E-CAD4', label: 'Empresa em que trabalha', type: 'text', required: true },
      {
        id: 'E-CAD5',
        label: 'Área de atuação',
        type: 'single',
        required: true,
        options: [
          ['pessoas_rh', 'Pessoas/RH'],
          ['comercial', 'Comercial'],
          ['financeiro', 'Financeiro'],
          ['operacoes', 'Operações'],
          ['marketing', 'Marketing'],
          ['tecnologia', 'Tecnologia'],
          ['administrativo', 'Administração'],
          ['diretoria', 'Diretoria'],
          ['outra', 'Outra'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-CAD6',
        label: 'Qual é sua relação com a decisão sobre IA?',
        type: 'single',
        required: true,
        options: [
          ['decido', 'Decido'],
          ['influencio', 'Recomendo ou influencio'],
          ['executo', 'Executo e uso'],
          ['explorando', 'Estou apenas explorando'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F2',
        label: 'Qual processo você gostaria de melhorar?',
        type: 'single',
        required: true,
        options: [
          ['reunioes', 'Reuniões e preparação de reuniões'],
          ['mensagens', 'E-mails e mensagens'],
          ['propostas', 'Propostas, relatórios ou apresentações'],
          ['analise', 'Análise de dados e informações'],
          ['clientes', 'Acompanhamento de clientes ou oportunidades'],
          ['planejamento', 'Planejamento e priorização'],
          ['pessoas', 'Atendimento ou coordenação de pessoas'],
          ['registro', 'Registro e organização do trabalho'],
          ['outra', 'Outra'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-CAD7',
        label: 'Como você conhece esse processo?',
        type: 'single',
        required: true,
        options: [
          ['executo', 'Executo diretamente'],
          ['coordeno', 'Coordeno quem executa'],
          ['acompanho', 'Acompanho os resultados'],
          ['parcial', 'Conheço apenas parcialmente'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F1',
        label: 'Qual resultado profissional você gostaria de melhorar primeiro?',
        type: 'single',
        required: true,
        options: [
          ['liberar_tempo', 'Liberar tempo para atividades de maior valor'],
          ['decidir_melhor', 'Tomar decisões com mais rapidez ou qualidade'],
          ['reduzir_retrabalho', 'Reduzir retrabalho'],
          ['melhorar_vendas', 'Melhorar propostas, vendas ou negociações'],
          ['melhorar_reunioes', 'Melhorar reuniões e acompanhamento'],
          ['organizar_info', 'Organizar informações e documentos'],
          ['apoiar_equipe', 'Apoiar melhor uma equipe'],
          ['responder_rapido', 'Responder clientes, parceiros ou colaboradores com mais agilidade'],
          ['outro', 'Outro'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F3',
        label: 'Com que frequência esse processo acontece?',
        type: 'single',
        required: true,
        options: [
          ['varias_vezes_dia', 'Várias vezes ao dia'],
          ['diariamente', 'Diariamente'],
          ['algumas_semana', 'Algumas vezes por semana'],
          ['semanalmente', 'Semanalmente'],
          ['mensalmente', 'Mensalmente'],
          ['sem_frequencia', 'Sem frequência definida'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F4',
        label: 'O que acontece quando esse processo não funciona bem?',
        type: 'multi',
        required: true,
        maxSelections: 3,
        options: [
          ['perda_tempo', 'Perda de tempo'],
          ['atraso', 'Atraso para outra pessoa ou área'],
          ['retrabalho', 'Retrabalho'],
          ['erros', 'Erros ou queda de qualidade'],
          ['oportunidades', 'Oportunidades perdidas'],
          ['decisao_lenta', 'Decisão mais lenta'],
          ['sobrecarga', 'Sobrecarga pessoal'],
          ['insatisfacao', 'Insatisfação de cliente, equipe ou liderança'],
          ['nao_sei', 'Não consigo perceber um impacto claro'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F5',
        label: 'Como você saberia que houve melhora?',
        type: 'multi',
        required: true,
        maxSelections: 3,
        options: [
          ['horas', 'Menos horas gastas'],
          ['resposta', 'Menor tempo de resposta'],
          ['erros', 'Menos erros'],
          ['tarefas', 'Mais tarefas concluídas'],
          ['oportunidades', 'Mais oportunidades acompanhadas'],
          ['decisoes', 'Decisões mais rápidas'],
          ['qualidade', 'Melhor qualidade do resultado'],
          ['experiencia', 'Melhor experiência de cliente ou equipe'],
          ['outro', 'Outro indicador'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-F6',
        label: 'O que você gostaria que fosse diferente nesse processo?',
        type: 'text',
        help: 'Descreva em poucas linhas.',
        required: true,
      },
    ],
  },
  {
    key: 'A',
    letter: 'A',
    title: 'Arquitetura',
    intro: 'Quais informações, documentos e fontes sustentam esse processo?',
    questions: [
      {
        id: 'E-A1',
        label: 'Que materiais ou informações fazem parte desse processo?',
        type: 'multi',
        required: true,
        options: [
          ['emails', 'E-mails e mensagens'],
          ['documentos', 'Documentos e contratos'],
          ['planilhas', 'Planilhas'],
          ['relatorios', 'Relatórios'],
          ['crm', 'Dados de CRM ou ERP'],
          ['reunioes', 'Registros de reuniões'],
          ['apresentacoes', 'Apresentações'],
          ['politicas', 'Políticas, manuais ou procedimentos'],
          ['memoria', 'Informações armazenadas apenas na memória de pessoas'],
          ['outros', 'Outros'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-A2',
        label: 'Onde essas informações estão hoje?',
        type: 'multi',
        required: true,
        options: [
          ['sistema', 'Um sistema principal'],
          ['integrados', 'Vários sistemas integrados'],
          ['sem_integracao', 'Vários sistemas sem integração'],
          ['pastas', 'Pastas compartilhadas'],
          ['email', 'E-mail'],
          ['mensagens', 'Aplicativos de mensagens'],
          ['pessoais', 'Arquivos pessoais'],
          ['pessoas', 'Com pessoas específicas'],
          ['nao_sei', 'Não sei dizer'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-A3',
        label: 'Quando você precisa encontrar uma informação, quão fácil é localizá-la?',
        type: 'single',
        required: true,
        options: [
          ['facil_rapido', 'Fácil e rápido'],
          ['geralmente_facil', 'Geralmente fácil'],
          ['depende_pessoa', 'Depende de quem possui a informação'],
          ['demorado', 'Demorado'],
          ['frequentemente_nao', 'Frequentemente não encontro'],
          ['nao_se_aplica', 'Não se aplica'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-A4',
        label: 'Existem modelos ou padrões reutilizáveis nesse processo?',
        type: 'single',
        required: true,
        options: [
          ['bem_definidos', 'Sim, bem definidos'],
          ['pouco_usados', 'Existem, mas são pouco usados'],
          ['cada_um', 'Cada pessoa faz de um jeito'],
          ['nao_existem', 'Não existem'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-A5',
        label: 'Que tipos de informação aparecem nesse processo?',
        type: 'multi',
        required: true,
        options: [
          ['publicas', 'Informações públicas'],
          ['internas', 'Informações internas'],
          ['clientes', 'Dados de clientes'],
          ['colaboradores', 'Dados de colaboradores'],
          ['financeiras', 'Dados financeiros'],
          ['estrategicas', 'Informações estratégicas'],
          ['contratuais', 'Dados contratuais ou jurídicos'],
          ['sensíveis', 'Dados sensíveis'],
          ['nao_sei', 'Não sei classificar'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-A6',
        label: 'Você sabe o que pode ou não compartilhar com ferramentas de IA?',
        type: 'single',
        required: true,
        options: [
          ['regras_claras', 'Sim, temos regras claras'],
          ['nocao_sem_regra', 'Tenho uma noção, mas não há regras claras'],
          ['nao_certeza', 'Não tenho certeza'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
    ],
  },
  {
    key: 'R',
    letter: 'R',
    title: 'Rotina',
    intro: 'Como o trabalho acontece hoje, onde se repete e onde trava?',
    questions: [
      {
        id: 'E-R1',
        label: 'Quantas vezes esse processo acontece em uma semana típica?',
        type: 'single',
        required: true,
        options: [
          ['uma_duas', '1 ou 2 vezes'],
          ['tres_cinco', '3 a 5 vezes'],
          ['seis_dez', '6 a 10 vezes'],
          ['mais_dez', 'Mais de 10 vezes'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R2',
        label: 'Quanto tempo uma ocorrência costuma consumir?',
        type: 'single',
        required: true,
        options: [
          ['ate_15', 'Até 15 minutos'],
          ['dezesseis_30', 'De 16 a 30 minutos'],
          ['trinta_60', 'De 31 a 60 minutos'],
          ['uma_duas_horas', 'De 1 a 2 horas'],
          ['mais_duas', 'Mais de 2 horas'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R3',
        label: 'Quais tarefas manuais se repetem nesse processo?',
        type: 'multi',
        required: true,
        options: [
          ['procurar', 'Procurar informações'],
          ['copiar', 'Copiar e colar dados'],
          ['resumir', 'Resumir textos ou reuniões'],
          ['comparar', 'Comparar documentos ou versões'],
          ['classificar', 'Classificar solicitações'],
          ['redigir', 'Redigir mensagens'],
          ['relatorios', 'Preparar relatórios ou apresentações'],
          ['atualizar', 'Atualizar sistemas'],
          ['cobrar', 'Fazer cobranças ou acompanhamentos'],
          ['conferir', 'Conferir informações'],
          ['outra', 'Outra'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R4',
        label: 'Onde normalmente ocorre o atraso ou retrabalho?',
        type: 'single',
        required: true,
        options: [
          ['antes', 'Antes de começar'],
          ['busca', 'Na busca por informações'],
          ['execucao', 'Durante a execução'],
          ['revisao', 'Na revisão'],
          ['aprovacao', 'Na aprovação'],
          ['acompanhamento', 'No acompanhamento posterior'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R5',
        label: 'O resultado final desse processo tem um padrão claro?',
        type: 'single',
        required: true,
        options: [
          ['modelo_claro', 'Sim, existe um modelo claro'],
          ['varia', 'Existe um padrão, mas ele varia'],
          ['cada_jeito', 'Cada situação é tratada de um jeito'],
          ['sem_padrao', 'Não há padrão'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R6',
        label: 'Como você mede hoje o tempo, volume ou qualidade desse processo?',
        type: 'single',
        required: true,
        options: [
          ['regularmente', 'Medimos regularmente'],
          ['estimativa', 'Temos uma estimativa'],
          ['ocasionalmente', 'Medimos apenas ocasionalmente'],
          ['nao_mede', 'Não medimos'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-R7',
        label:
          'Se você tivesse de explicar esse processo para outra pessoa, conseguiria descrever todas as etapas?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['parte', 'Em parte'],
          ['nao', 'Não'],
          ['nunca', 'Nunca pensei nisso'],
        ].map(([value, label]) => ({ value, label })),
      },
    ],
  },
  {
    key: 'O',
    letter: 'O',
    title: 'Operação',
    intro: 'Você tem condições de testar uma mudança com responsabilidade?',
    questions: [
      {
        id: 'E-O1',
        label: 'Como você usa IA hoje no trabalho?',
        type: 'single',
        required: true,
        options: [
          ['nao_uso', 'Não uso'],
          ['ocasional', 'Uso ocasionalmente'],
          ['semanal', 'Uso semanalmente'],
          ['quase_todos', 'Uso quase todos os dias'],
          ['estruturado', 'Uso em um processo estruturado'],
          ['nao_sei_permitido', 'Não sei se o uso é permitido'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O2',
        label: 'Você possui acesso às ferramentas necessárias para testar uma aplicação?',
        type: 'single',
        required: true,
        options: [
          ['aprovadas', 'Sim, com ferramentas aprovadas'],
          ['nao_sei_aprovadas', 'Tenho acesso, mas não sei quais são aprovadas'],
          ['gratuitas_pessoais', 'Só tenho ferramentas gratuitas ou pessoais'],
          ['pedir_autorizacao', 'Preciso pedir autorização'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O3',
        label: 'Com que segurança você consegue revisar o resultado produzido por uma IA?',
        type: 'single',
        required: true,
        options: [
          ['sempre', 'Consigo revisar sempre'],
          ['maioria', 'Consigo revisar na maioria das situações'],
          ['dificuldade', 'Tenho dificuldade em identificar erros'],
          ['depende_assunto', 'Depende do assunto'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O4',
        label:
          'Quanto tempo você conseguiria reservar por semana para testar e ajustar um novo processo?',
        type: 'single',
        required: true,
        options: [
          ['nenhum', 'Nenhum tempo'],
          ['ate_30', 'Até 30 minutos'],
          ['trinta_uma', 'De 30 minutos a 1 hora'],
          ['uma_duas', 'De 1 a 2 horas'],
          ['mais_duas', 'Mais de 2 horas'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O5',
        label:
          'Se uma aplicação simples funcionasse, você conseguiria incorporá-la ao seu processo nos próximos 30 dias?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['provavelmente', 'Provavelmente'],
          ['autorizacao', 'Dependeria de autorização'],
          ['outra_pessoa', 'Dependeria de outra pessoa ou área'],
          ['nao_momento', 'Não neste momento'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O6',
        label:
          'Um erro nesse processo poderia afetar clientes, colaboradores, dinheiro, contratos ou decisões importantes?',
        type: 'single',
        required: true,
        options: [
          ['diretamente', 'Sim, diretamente'],
          ['indiretamente', 'Sim, indiretamente'],
          ['pouco', 'Pouco'],
          ['nao', 'Não'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'E-O7',
        label: 'Que tipo de apoio seria mais útil agora?',
        type: 'single',
        required: true,
        options: [
          ['conteudo', 'Conteúdo e exemplos'],
          ['modelos', 'Modelos e checklists'],
          ['plano', 'Um plano personalizado'],
          ['acompanhamento', 'Acompanhamento individual'],
          ['construcao', 'Construção assistida'],
          ['nao_sei', 'Ainda não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
    ],
  },
]

const companySections: Array<{
  key: string
  letter: string
  title: string
  intro: string
  questions: Question[]
}> = [
  {
    key: 'F',
    letter: 'F',
    title: 'Foco',
    intro: 'Qual processo merece atenção e qual resultado a empresa quer liberar?',
    questions: [
      { id: 'C-CAD3', label: 'Empresa', type: 'text', required: true },
      { id: 'C-CAD4', label: 'Cargo ou função do respondente', type: 'text', required: true },
      {
        id: 'C-CAD5',
        label: 'Setor principal da empresa',
        type: 'single',
        required: true,
        options: [
          ['industria', 'Indústria'],
          ['servicos_b2b', 'Serviços B2B'],
          ['comercio', 'Comércio'],
          ['saude', 'Saúde'],
          ['escritorio', 'Escritório ou serviço profissional'],
          ['tecnologia', 'Tecnologia'],
          ['educacao', 'Educação'],
          ['financeiro', 'Financeiro'],
          ['outro', 'Outro'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-CAD6',
        label: 'Faixa aproximada de colaboradores',
        type: 'single',
        required: true,
        options: [
          ['ate_49', 'Até 49'],
          ['50_249', 'De 50 a 249'],
          ['250_999', 'De 250 a 999'],
          ['1000_mais', '1.000 ou mais'],
          ['prefiro_nao', 'Prefiro não informar'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-CAD7',
        label: 'Como o respondente conhece o processo avaliado?',
        type: 'single',
        required: true,
        options: [
          ['executa', 'Executo diretamente'],
          ['coordena', 'Coordeno a equipe'],
          ['responsavel', 'Sou responsável pela área'],
          ['decide', 'Decido ou patrocino'],
          ['parcial', 'Conheço parcialmente'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-F1',
        label: 'Qual área concentra a oportunidade?',
        type: 'single',
        required: true,
        options: [
          ['pessoas_rh', 'Pessoas e RH'],
          ['marketing', 'Marketing e geração de demanda'],
          ['comercial', 'Vendas e relacionamento comercial'],
          ['financeiro', 'Financeiro e controladoria'],
          ['operacoes', 'Operações'],
          ['atendimento', 'Atendimento ao cliente'],
          ['administrativo', 'Administração'],
          ['outra', 'Outra'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-F2',
        label: 'Qual dor melhor descreve o problema atual?',
        type: 'single',
        required: true,
        options: [
          ['empresa_atendimento', 'Atendimento interno ao colaborador repetitivo ou lento'],
          ['empresa_integracao', 'Integração de novos colaboradores inconsistente'],
          ['empresa_desenvolvimento', 'Desenvolvimento e feedback sem acompanhamento'],
          ['empresa_demanda', 'Marketing gera atividade, mas pouca demanda qualificada'],
          ['empresa_funil', 'Leads e oportunidades se perdem no funil'],
          ['empresa_propostas', 'Propostas e follow-ups demoram ou não têm padrão'],
          ['empresa_fechamento', 'Fechamento e informações de caixa pouco previsíveis'],
          ['empresa_recebiveis', 'Recebíveis e cobranças sem processo consistente'],
          ['empresa_aprovacoes', 'Contas a pagar e aprovações com retrabalho ou risco'],
          ['outra', 'Outra dor'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-F3',
        label: 'Qual processo específico você gostaria de analisar primeiro?',
        type: 'text',
        help: 'Descreva um processo ou fluxo concreto. Ex.: registrar um pedido, aprovar uma despesa ou acompanhar uma proposta. Evite responder apenas “melhorar vendas”, “comunicação” ou “usar IA”.',
        required: true,
      },
      {
        id: 'C-F4',
        label: 'Quais grupos são mais afetados pelo problema?',
        help: 'Selecione grupos de pessoas, não áreas funcionais; isso ajuda a separar o alcance do problema da transversalidade entre áreas.',
        type: 'multi',
        required: true,
        maxSelections: 3,
        options: [
          ['colaboradores', 'Colaboradores'],
          ['gestores', 'Gestores'],
          ['clientes', 'Clientes'],
          ['comercial', 'Equipe comercial'],
          ['rh', 'Equipe de RH'],
          ['financeiro', 'Equipe financeira'],
          ['diretoria', 'Diretoria'],
          ['fornecedores', 'Fornecedores ou parceiros'],
          ['outra', 'Outra parte interessada'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-F5',
        label: 'Que resultado seria mais importante nos próximos 90 dias?',
        type: 'multi',
        required: true,
        maxSelections: 3,
        options: [
          ['horas', 'Reduzir horas de trabalho manual'],
          ['resposta', 'Reduzir tempo de resposta'],
          ['retrabalho', 'Reduzir retrabalho ou erros'],
          ['conversao', 'Aumentar conversão ou velocidade comercial'],
          ['atendimento', 'Melhorar o atendimento ao colaborador'],
          ['caixa', 'Aumentar previsibilidade de caixa'],
          ['atrasos', 'Reduzir atrasos ou perdas financeiras'],
          ['decisao', 'Melhorar qualidade da decisão'],
          ['outro', 'Outro resultado'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-F6',
        label: 'Por que essa dor precisa ser tratada agora?',
        help: 'Se ainda não houver urgência ou impacto validado, diga isso. Essa resposta informa a conversa, mas não bloqueia uma recomendação FAROL Empresa quando área, dor e processo estão claros.',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    key: 'A',
    letter: 'A',
    title: 'Arquitetura',
    intro: 'As informações, fontes e regras necessárias estão disponíveis?',
    questions: [
      {
        id: 'C-A1',
        label: 'Que informações, documentos ou dados são necessários?',
        type: 'multi',
        required: true,
        options: [
          ['documentos', 'Documentos e políticas'],
          ['colaboradores', 'Dados de colaboradores'],
          ['clientes', 'Dados de clientes ou leads'],
          ['crm', 'CRM'],
          ['erp', 'ERP ou sistema financeiro'],
          ['planilhas', 'Planilhas'],
          ['emails', 'E-mails e mensagens'],
          ['contratos', 'Contratos e pedidos'],
          ['relatorios', 'Relatórios gerenciais'],
          ['atendimento', 'Registros de atendimento ou reuniões'],
          ['outra', 'Outra fonte'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A2',
        label: 'Onde essas informações estão hoje?',
        type: 'multi',
        required: true,
        options: [
          ['sistema', 'Um sistema principal'],
          ['integrados', 'Vários sistemas integrados'],
          ['sem_integracao', 'Vários sistemas sem integração'],
          ['pastas', 'Pastas compartilhadas'],
          ['emails', 'E-mails'],
          ['mensagens', 'Aplicativos de mensagens'],
          ['planilhas', 'Planilhas individuais'],
          ['pessoas', 'Com pessoas específicas'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A3',
        label: 'Existe uma fonte oficial para as informações usadas no processo?',
        type: 'single',
        required: true,
        options: [
          ['claramente_definida', 'Sim, claramente definida'],
          ['nem_todos', 'Existe, mas nem todos usam'],
          ['varias_versoes', 'Há várias versões'],
          ['nao_existe', 'Não existe'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A4',
        label: 'Como você avalia a qualidade e atualização dessas informações?',
        type: 'single',
        required: true,
        options: [
          ['completa', 'Completa e atualizada'],
          ['adequada', 'Adequada, com algumas lacunas'],
          ['desigual', 'Muito desigual'],
          ['desatualizada', 'Desatualizada'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A5',
        label: 'Que tipos de dados sensíveis ou restritos aparecem?',
        type: 'multi',
        required: true,
        options: [
          ['colaboradores', 'Dados pessoais de colaboradores'],
          ['clientes', 'Dados de clientes'],
          ['financeiros', 'Dados financeiros'],
          ['bancarios', 'Dados bancários'],
          ['estrategicas', 'Informações estratégicas'],
          ['contratuais', 'Dados contratuais ou jurídicos'],
          ['saude', 'Dados de saúde'],
          ['segredos', 'Segredos comerciais'],
          ['nenhum', 'Nenhum dado sensível'],
          ['nao_sei', 'Não sei classificar'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A6',
        label: 'A empresa sabe quem pode acessar e usar essas informações?',
        type: 'single',
        required: true,
        options: [
          ['regras_claras', 'Sim, existem regras claras'],
          ['pouco_aplicadas', 'Existem regras, mas são pouco aplicadas'],
          ['depende_area', 'Depende da área ou da pessoa'],
          ['sem_regras', 'Não existem regras claras'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-A7',
        label:
          'Os dados e documentos poderiam ser disponibilizados para um piloto com autorização?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['aprovacao', 'Sim, depois de uma aprovação'],
          ['parcialmente', 'Parcialmente'],
          ['nao', 'Não'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
    ],
  },
  {
    key: 'R',
    letter: 'R',
    title: 'Rotina',
    intro: 'Como o processo acontece hoje e onde há espera, retrabalho ou dependência?',
    questions: [
      {
        id: 'C-R1',
        label: 'Com que frequência o processo acontece?',
        type: 'single',
        required: true,
        options: [
          ['varias_dia', 'Várias vezes ao dia'],
          ['diariamente', 'Diariamente'],
          ['algumas_semana', 'Algumas vezes por semana'],
          ['semanalmente', 'Semanalmente'],
          ['mensalmente', 'Mensalmente'],
          ['eventualmente', 'Eventualmente'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R2',
        label: 'O processo está documentado ou é conhecido por quem executa?',
        type: 'single',
        required: true,
        options: [
          ['documentado_seguido', 'Documentado e seguido'],
          ['documentado_pouco', 'Documentado, mas pouco seguido'],
          ['informal', 'Conhecido informalmente'],
          ['cada_jeito', 'Cada pessoa executa de um jeito'],
          ['nao_sabemos', 'Não sabemos descrever o processo'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R3',
        label: 'Quantas áreas funcionais distintas participam do processo?',
        type: 'single',
        required: true,
        options: [
          ['uma_pessoa', 'Uma pessoa'],
          ['uma_area', 'Uma área'],
          ['duas_areas', 'Duas áreas'],
          ['tres_mais', 'Três ou mais áreas'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R4',
        label: 'Quais tarefas repetitivas aparecem?',
        type: 'multi',
        required: true,
        options: [
          ['buscar', 'Buscar informações'],
          ['copiar', 'Copiar e transferir dados'],
          ['responder', 'Responder perguntas recorrentes'],
          ['classificar', 'Classificar solicitações ou documentos'],
          ['conferir', 'Conferir dados'],
          ['comparar', 'Comparar versões'],
          ['redigir', 'Redigir mensagens ou propostas'],
          ['relatorios', 'Preparar relatórios'],
          ['cobrar', 'Fazer cobranças ou acompanhamentos'],
          ['atualizar', 'Atualizar sistemas'],
          ['aprovar', 'Aprovar ou encaminhar solicitações'],
          ['outra', 'Outra'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R5',
        label: 'Onde estão as maiores esperas, passagens de mão ou retrabalhos?',
        type: 'multi',
        required: true,
        maxSelections: 3,
        options: [
          ['entrada', 'Entrada da solicitação'],
          ['busca', 'Busca de informação'],
          ['classificacao', 'Classificação'],
          ['aprovacao', 'Aprovação'],
          ['execucao', 'Execução'],
          ['revisao', 'Revisão'],
          ['comunicacao', 'Comunicação com outra área'],
          ['registro', 'Registro no sistema'],
          ['acompanhamento', 'Acompanhamento posterior'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R6',
        label: 'Como a empresa mede hoje o desempenho desse processo?',
        type: 'multi',
        required: true,
        options: [
          ['tempo', 'Tempo'],
          ['volume', 'Volume'],
          ['custo', 'Custo'],
          ['qualidade', 'Qualidade'],
          ['satisfacao', 'Satisfação'],
          ['receita', 'Receita ou conversão'],
          ['caixa', 'Caixa ou perdas financeiras'],
          ['nao_mede', 'Não medimos'],
          ['informal', 'Medimos apenas informalmente'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-R7',
        label: 'Descreva resumidamente o fluxo atual, do início ao fim.',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    key: 'O',
    letter: 'O',
    title: 'Operação',
    intro: 'Existem condições para testar uma mudança com equipe, apoio e revisão?',
    questions: [
      {
        id: 'C-O1',
        label: 'Existe um patrocinador com autoridade para apoiar um piloto?',
        type: 'single',
        required: true,
        options: [
          ['identificado', 'Sim, identificado'],
          ['provavelmente', 'Provavelmente'],
          ['ainda_nao', 'Ainda não'],
          ['nao', 'Não'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O2',
        label: 'Existe uma pessoa responsável pelo processo no dia a dia?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['mais_de_uma', 'Existe mais de uma pessoa, sem definição clara'],
          ['nao', 'Não'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O3',
        label: 'A equipe teria disponibilidade para participar de um piloto nos próximos 30 dias?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['parcialmente', 'Parcialmente'],
          ['aprovacao', 'Dependeria de aprovação'],
          ['nao_momento', 'Não neste momento'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O4',
        label:
          'Seria possível testar em uma área, equipe, unidade ou tipo de caso antes de ampliar?',
        type: 'single',
        required: true,
        options: [
          ['sim', 'Sim'],
          ['provavelmente', 'Provavelmente'],
          ['dificil', 'Seria difícil'],
          ['nao', 'Não'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O5',
        label: 'Como a empresa usa IA hoje?',
        type: 'single',
        required: true,
        options: [
          ['nao_usa', 'Não usa'],
          ['individual', 'Algumas pessoas usam individualmente'],
          ['equipes', 'Algumas equipes usam'],
          ['producao', 'Existem soluções em produção'],
          ['implantando', 'Estamos implantando uma solução'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O6',
        label: 'Quem revisaria e aprovaria os resultados produzidos por uma IA?',
        type: 'single',
        required: true,
        options: [
          ['responsavel', 'Responsável já definido'],
          ['area', 'A área usuária'],
          ['tecnologia', 'Tecnologia ou Segurança'],
          ['juridico', 'Jurídico ou Compliance'],
          ['nao_definido', 'Não definido'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O7',
        label: 'Existem restrições que poderiam impedir o piloto?',
        type: 'multi',
        required: true,
        options: [
          ['seguranca', 'Segurança da informação'],
          ['lgpd', 'LGPD ou privacidade'],
          ['politica', 'Política interna'],
          ['integracao', 'Integração com sistemas'],
          ['dados', 'Falta de dados'],
          ['equipe', 'Falta de equipe'],
          ['orcamento', 'Falta de orçamento'],
          ['lideranca', 'Aprovação da liderança'],
          ['nenhuma', 'Nenhuma restrição conhecida'],
          ['nao_sei', 'Não sei'],
        ].map(([value, label]) => ({ value, label })),
      },
      {
        id: 'C-O8',
        label: 'O que precisaria acontecer para a empresa considerar o piloto bem-sucedido?',
        type: 'text',
        required: true,
      },
    ],
  },
]

function allQuestions(tipo: RaioxTipo) {
  return (tipo === 'executivo' ? executiveSections : companySections).flatMap(
    (section) => section.questions,
  )
}

function optionLabel(question: Question, value: string) {
  return question.options?.find((option) => option.value === value)?.label || value
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
    </div>
  )
}

function ConfirmationView({
  email,
  onRestart,
  success,
}: {
  email: string
  onRestart: () => void
  success: boolean
}) {
  return (
    <main className="report-page">
      <div className="report-shell">
        <header className="brand-line">
          <img src="/simbiosia-logo.svg" alt="Simbiosia" className="brand-logo" />
          <span className="brand-caption">MÉTODO FAROL</span>
        </header>
        <div className="confirmation-card">
          <div className="confirmation-icon">
            <Mail size={30} />
          </div>
          <div className="report-kicker">L — LEGADO</div>
          <h1>{success ? 'Seu relatório foi enviado.' : 'Não conseguimos enviar o relatório.'}</h1>
          <p>
            {success ? (
              <>
                O Raio-X FAROL foi enviado para <strong>{email}</strong>. Verifique também a pasta
                de spam ou promoções.
              </>
            ) : (
              'O relatório não foi enviado. Tente novamente para receber o PDF.'
            )}
          </p>
          <div className="confirmation-note">
            <ShieldCheck size={18} />
            <span>O relatório é uma autoavaliação orientada. Não é um diagnóstico profundo.</span>
          </div>
          <button className="secondary-button" onClick={onRestart}>
            {success ? 'Refazer o Raio-X' : 'Tentar novamente'}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function Index() {
  const [tipo, setTipo] = useState<RaioxTipo | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [confirmation, setConfirmation] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sections = useMemo(
    () => (tipo ? (tipo === 'executivo' ? executiveSections : companySections) : []),
    [tipo],
  )
  const questions = useMemo(() => (tipo ? allQuestions(tipo) : []), [tipo])
  const currentSection = sections[step]
  const sectionIndex = step

  const updateAnswer = (id: string, value: Answer) =>
    setAnswers((current) => ({ ...current, [id]: value }))
  const isAnswered = (question: Question) => {
    const value = answers[question.id]
    return question.type === 'multi'
      ? Array.isArray(value) && value.length > 0
      : String(value || '').trim().length > 0
  }
  const validateSection = () => {
    const missing = currentSection.questions.find(
      (question) => question.required && !isAnswered(question),
    )
    if (missing) {
      setError(`Responda: ${missing.label}`)
      return false
    }
    const invalid = currentSection.questions.find(
      (question) =>
        question.type === 'multi' &&
        question.maxSelections &&
        Array.isArray(answers[question.id]) &&
        (answers[question.id] as string[]).length > question.maxSelections,
    )
    if (invalid) {
      setError(`Escolha no máximo ${invalid.maxSelections} opções em “${invalid.label}”.`)
      return false
    }
    setError('')
    return true
  }
  const next = () => {
    if (validateSection()) {
      setStep((value) => value + 1)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }
  const previous = () => {
    setError('')
    setStep((value) => Math.max(0, value - 1))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const start = (value: RaioxTipo) => {
    setTipo(value)
    setStep(0)
    setAnswers({})
    setNome('')
    setEmail('')
    setReport(null)
    setConfirmation(false)
    setError('')
  }
  const restart = () => {
    setTipo(null)
    setStep(0)
    setAnswers({})
    setNome('')
    setEmail('')
    setReport(null)
    setConfirmation(false)
    setEmailSent(false)
    setError('')
  }
  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!validateSection()) return
    if (!nome.trim() || !email.trim()) {
      setError('Informe nome e e-mail para receber o relatório.')
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Informe um e-mail válido.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const basePayload = {
        tipo: tipo!,
        nome: nome.trim(),
        email: email.trim(),
        empresa:
          typeof answers['E-CAD4'] === 'string'
            ? answers['E-CAD4']
            : typeof answers['C-CAD3'] === 'string'
              ? answers['C-CAD3']
              : '',
        respostas: answers,
      }
      const prepared = await submitRaiox({ mode: 'prepare', ...basePayload })
      const pdfBase64 = createRaioxPdfModern(prepared.report)
      const sent = await submitRaiox({
        mode: 'send',
        ...basePayload,
        pdfBase64,
      })
      if (!sent.ok) throw new Error('O relatório não foi processado.')
      setReport(prepared.report)
      setEmailSent(sent.emailStatus === 'sent')
      setConfirmation(true)
    } catch (err: any) {
      setError(
        err?.response?.message ||
          err?.message ||
          'Não foi possível gerar ou enviar o relatório. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (confirmation)
    return <ConfirmationView email={email} onRestart={restart} success={emailSent} />
  if (!tipo)
    return (
      <main className="landing">
        <div className="landing-orb orb-one" />
        <div className="landing-orb orb-two" />
        <div className="landing-shell">
          <header className="brand-line">
            <img src="/simbiosia-logo.svg" alt="Simbiosia" className="brand-logo" />
            <span className="brand-caption">MÉTODO FAROL</span>
          </header>
          <section className="landing-hero">
            <div className="report-kicker">RAIO-X FAROL</div>
            <h1>Qual legado você quer construir com IA?</h1>
            <p>
              Descubra onde você ou sua empresa pode começar a usar IA com segurança, foco e
              resultado. Leva em torno de 7 minutos.
            </p>
            <div className="promise">
              <Sparkles size={18} />
              <span>
                Ao final, você recebe um relatório com seu cenário atual, a principal trava e os
                próximos passos.
              </span>
            </div>
          </section>
          <section className="choice-grid">
            <button className="choice-card" onClick={() => start('executivo')}>
              <span className="choice-letter">P</span>
              <span>
                <strong>Meu processo profissional</strong>
                <small>
                  Para donos, sócios, executivos e profissionais que querem começar por um processo
                  da própria atuação.
                </small>
              </span>
              <ChevronRight />
            </button>
            <button className="choice-card" onClick={() => start('empresa')}>
              <span className="choice-letter">E</span>
              <span>
                <strong>Minha empresa</strong>
                <small>
                  Para quem quer avaliar um processo ou área da organização e identificar onde a IA
                  pode gerar valor.
                </small>
              </span>
              <ChevronRight />
            </button>
          </section>
          <footer className="landing-footer">
            <ShieldCheck size={16} /> Autoavaliação orientada. Não é diagnóstico profundo nem
            avaliação de desempenho.
          </footer>
        </div>
      </main>
    )

  return (
    <main className="questionnaire">
      <div className="question-shell">
        <header className="brand-line">
          <img src="/simbiosia-logo.svg" alt="Simbiosia" className="brand-logo" />
          <span className="brand-caption">
            RAIO-X FAROL · {tipo === 'executivo' ? 'EXECUTIVO' : 'EMPRESA'}
          </span>
        </header>
        <Progress step={sectionIndex} total={sections.length} />
        <div className="step-meta">
          <span>
            Etapa {sectionIndex + 1} de {sections.length}
          </span>
          <span>
            {currentSection.letter} — {currentSection.title}
          </span>
        </div>
        <div className="section-heading">
          <div className="large-letter">{currentSection.letter}</div>
          <div>
            <div className="report-kicker">MÉTODO FAROL</div>
            <h1>{currentSection.title}</h1>
            <p>{currentSection.intro}</p>
          </div>
        </div>
        <form
          onSubmit={
            step < sections.length - 1
              ? (event) => {
                  event.preventDefault()
                  next()
                }
              : send
          }
          className="question-form"
        >
          {currentSection.questions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={updateAnswer}
            />
          ))}
          {step === 0 && (
            <div className="contact-block">
              <div className="report-kicker">Relatório e privacidade</div>
              <h3>Onde envio seu relatório?</h3>
              <div className="field-grid">
                <label>
                  <span>Seu nome</span>
                  <input
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label>
                  <span>Seu e-mail corporativo</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com.br"
                  />
                </label>
              </div>
              <p>
                Usamos seu nome e e-mail para enviar o relatório. Suas respostas são processadas
                apenas para gerar o diagnóstico e não ficam armazenadas. Poderemos, futuramente,
                enviar conteúdos, eventos e informações sobre a Simbiosia para o seu e-mail e você
                poderá optar por parar de receber esses conteúdos a qualquer momento.
              </p>
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            {step > 0 ? (
              <button type="button" className="secondary-button" onClick={previous}>
                <ChevronLeft size={18} /> Voltar
              </button>
            ) : (
              <button type="button" className="secondary-button" onClick={restart}>
                Sair
              </button>
            )}
            {step < sections.length - 1 ? (
              <button type="submit" className="primary-button">
                Continuar <ChevronRight size={18} />
              </button>
            ) : (
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="spin" size={18} /> Gerando seu L...
                  </>
                ) : (
                  <>
                    <Mail size={18} /> Gerar e enviar meu relatório
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: Answer | undefined
  onChange: (id: string, value: Answer) => void
}) {
  if (question.type === 'text' || question.type === 'email')
    return (
      <label className="question-field">
        <span>
          {question.label}
          {question.required && <em>*</em>}
        </span>
        {question.help && <small>{question.help}</small>}
        <textarea
          rows={
            question.type === 'text' && question.label.toLowerCase().includes('descreva') ? 4 : 2
          }
          value={String(value || '')}
          onChange={(event) => onChange(question.id, event.target.value)}
          placeholder="Escreva sua resposta"
        />
      </label>
    )
  const selected =
    question.type === 'multi' ? (Array.isArray(value) ? value : []) : String(value || '')
  return (
    <fieldset className="question-field">
      <legend>
        {question.label}
        {question.required && <em>*</em>}
      </legend>
      {question.help && <small>{question.help}</small>}
      {question.type === 'multi' && (
        <small className="selection-help">
          Selecione uma ou mais opções
          {question.maxSelections ? ` (até ${question.maxSelections})` : ''}.
          {selected.length > 0
            ? ` ${selected.length} selecionada${selected.length === 1 ? '' : 's'}.`
            : ''}
        </small>
      )}
      <div className="option-grid">
        {question.options?.map((option) => {
          const active =
            question.type === 'multi'
              ? (selected as string[]).includes(option.value)
              : selected === option.value
          return (
            <button
              type="button"
              key={option.value}
              className={`option-button ${active ? 'selected' : ''}`}
              onClick={() => {
                if (question.type === 'multi') {
                  const values = selected as string[]
                  const exclusive = question.id === 'E-F4' ? 'nao_sei' : ''
                  let next = values.includes(option.value)
                    ? values.filter((item) => item !== option.value)
                    : [...values, option.value]
                  if (exclusive && option.value === exclusive) {
                    next = next.indexOf(exclusive) >= 0 ? [exclusive] : []
                  } else if (exclusive) {
                    next = next.filter((item) => item !== exclusive)
                  }
                  onChange(question.id, next)
                } else onChange(question.id, option.value)
              }}
            >
              {active && <Check size={16} />}
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
