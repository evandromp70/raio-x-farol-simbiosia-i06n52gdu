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
  y = 36
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(16, 69, 79)
  doc.text('Raio-X FAROL', margin, y)
  y += 9
  addText('L — Liberação de Valor · Processo e valor com IA', 10, [80, 98, 102], 9)
  addText(`Nome: ${report.nome}`, 10, [16, 69, 79], 3)
  if (report.empresa) addText(`Empresa: ${report.empresa}`, 10, [16, 69, 79], 3)
  addText(
    `Contexto: ${report.tipo === 'executivo' ? 'Meu processo profissional' : 'Minha empresa'}`,
    10,
    [80, 98, 102],
    3,
  )

  y += 4
  const stageBlockHeight = (stage: Report['stages'][number]) =>
    5 + estimateTextHeight(stage.reading, 9, 0) + 4
  const stagesHeight =
    15 * 0.45 + 8 + report.stages.reduce((total, stage) => total + stageBlockHeight(stage), 0)
  ensureSpace(stagesHeight)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(16, 69, 79)
  doc.text('Seu FAROL', margin, y)
  y += 8
  report.stages.forEach((stage) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(16, 69, 79)
    doc.text(`${stage.key} — ${stage.title}`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${stage.score}/100 · ${stage.state}`, margin + 32, y)
    y += 2.5
    doc.setFillColor(129, 130, 116)
    doc.roundedRect(margin, y, width, 3.5, 1.75, 1.75, 'F')
    doc.setFillColor(16, 69, 79)
    doc.roundedRect(margin, y, Math.max(5, (width * stage.score) / 100), 3.5, 1.75, 1.75, 'F')
    y += 5.5
    addText(stage.reading, 9, [80, 98, 102], 4)
  })
  doc.addPage()
  y = 20
  const recommendationHeight =
    15 * 0.45 + 8 + 12 + estimateTextHeight(report.routingExplanation, 10, 6) + 10
  ensureSpace(recommendationHeight)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(16, 69, 79)
  doc.text('Próximo passo recomendado', margin, y)
  y += 6
  doc.setFillColor(189, 224, 56)
  doc.roundedRect(margin, y - 1, width, 11, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(16, 69, 79)
  doc.text(report.nextProduct, margin + 4, y + 6.5)
  y += 15
  addText(report.routingExplanation, 10, [80, 98, 102], 6)

  const gatesHeight =
    15 * 0.45 +
    8 +
    8 +
    report.pilotConditions.reduce(
      (total, item) => total + estimateTextHeight(`• ${item}`, 9, 3),
      0,
    ) +
    (report.safetyAlerts.length > 0
      ? 13 * 0.45 +
        7 +
        report.safetyAlerts.reduce(
          (total, item) => total + estimateTextHeight(`• ${item}`, 9, 3),
          0,
        ) +
        2
      : 0)
  ensureSpace(gatesHeight)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(16, 69, 79)
  doc.text('Condições antes de qualquer piloto', margin, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const statusWidth = doc.getTextWidth(report.pilotStatus) + 6
  doc.setFillColor(16, 69, 79)
  doc.roundedRect(margin, y - 4, statusWidth, 6, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(report.pilotStatus, margin + 3, y)
  y += 8
  report.pilotConditions.forEach((item) => addText(`• ${item}`, 9, [16, 69, 79], 3))
  if (report.safetyAlerts.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(16, 69, 79)
    doc.text('Segurança e revisão', margin, y)
    y += 7
    report.safetyAlerts.forEach((item) => addText(`• ${item}`, 9, [16, 69, 79], 3))
    y += 2
  }
  doc.addPage()
  y = 20
  const liberationItems: Array<[string, number, [number, number, number], number]> = [
    [`Primeira ação: ${report.firstValue}`, 10, [16, 69, 79], 5],
  ]
  if (report.tipo === 'empresa' && report.context.processo)
    liberationItems.push([`Processo escolhido: ${report.context.processo}`, 9, [80, 98, 102], 5])
  if (report.tipo === 'executivo' && report.context.mudancaDesejada)
    liberationItems.push([
      `O que você gostaria de mudar: ${report.context.mudancaDesejada}`,
      10,
      [16, 69, 79],
      5,
    ])
  if (report.tipo === 'empresa' && report.context.porQueAgora)
    liberationItems.push([`Por que agora: ${report.context.porQueAgora}`, 10, [16, 69, 79], 5])
  if (report.tipo === 'empresa' && report.context.fluxoAtual)
    liberationItems.push([`Fluxo descrito: ${report.context.fluxoAtual}`, 9, [80, 98, 102], 5])
  if (report.tipo === 'empresa' && report.context.criterioSucesso)
    liberationItems.push([
      `Critério de sucesso informado: ${report.context.criterioSucesso}`,
      9,
      [80, 98, 102],
      5,
    ])
  liberationItems.push(
    [`Primeira aplicação: ${report.primeiraAplicacao}.`, 10, [16, 69, 79], 5],
    [`Resultado a acompanhar: ${report.measurement}.`, 10, [16, 69, 79], 7],
  )
  const liberationHeight =
    15 * 0.45 +
    8 +
    liberationItems.reduce(
      (total, [text, size, _color, gap]) => total + estimateTextHeight(text, size, gap),
      0,
    )
  ensureSpace(liberationHeight)
  addSectionHeading('L — Liberação de Valor')
  liberationItems.forEach(([text, size, color, gap]) => addText(text, size, color, gap))
  addSectionHeading('Próximas ações')
  report.sevenDayPlan.forEach((item, index) =>
    addText(`${index + 1}. ${item}`, 10, [23, 59, 66], 3),
  )
  addSectionHeading('Cuidados para esta etapa')
  report.avoid.forEach((item) => addText(`• ${item}`, 10, [23, 59, 66], 3))

  addText(report.limitations, 9, [80, 98, 102], 4)
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
          <div className="report-kicker">L — LIBERAÇÃO DE VALOR</div>
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
      const pdfBase64 = createRaioxPdf(prepared.report)
      const sent = await submitRaiox({ mode: 'send', ...basePayload, pdfBase64 })
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
