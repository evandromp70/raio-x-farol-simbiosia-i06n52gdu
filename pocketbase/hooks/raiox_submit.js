routerAdd('POST', '/backend/v1/raiox-submit', (e) => {
  const body = e.requestInfo().body || {}
  const mode = body.mode === 'send' ? 'send' : 'prepare'
  const tipo = body.tipo === 'empresa' ? 'empresa' : body.tipo === 'executivo' ? 'executivo' : ''
  const respostas = body.respostas && typeof body.respostas === 'object' ? body.respostas : {}
  const nome = String(body.nome || '').trim()
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const empresa = String(body.empresa || '').trim()

  if (!tipo) return e.badRequestError('Informe o tipo de avaliação.')
  if (!nome || nome.length < 2) return e.badRequestError('Informe seu nome.')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return e.badRequestError('Informe um e-mail válido.')
  }
  if (body.website) return e.badRequestError('Não foi possível processar a solicitação.')
  if (mode === 'send' && (!body.pdfBase64 || typeof body.pdfBase64 !== 'string')) {
    return e.badRequestError('O relatório PDF não foi recebido.')
  }

  const get = (id) => respostas[id]
  const arr = (id) => (Array.isArray(get(id)) ? get(id) : get(id) ? [get(id)] : [])
  const has = (id, value) => arr(id).indexOf(value) >= 0
  const filled = (id, min) => String(get(id) || '').trim().length >= (min || 3)
  const scoreMap = (value, map) => map[value] || 0
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)))
  const stageState = (score) =>
    score >= 75 ? 'Pronto para avançar' : score >= 50 ? 'Em preparação' : 'Ainda precisa de base'
  const stageReading = (key, score) => {
    if (key === 'F')
      return score >= 75
        ? 'A dor, a rotina e o resultado desejado estão suficientemente claros para escolher uma primeira aplicação.'
        : score >= 50
          ? 'Existe uma direção, mas ainda é preciso estreitar o problema e definir melhor o resultado.'
          : 'O interesse em IA ainda está mais amplo que uma oportunidade concreta. Comece por uma rotina ou processo específico.'
    if (key === 'A')
      return score >= 75
        ? 'Há contexto, fontes e materiais suficientes para iniciar um teste com cuidado.'
        : score >= 50
          ? 'Parte do contexto existe, mas informações espalhadas ou regras pouco claras aumentam o esforço e o risco.'
          : 'Antes de aplicar IA, será necessário organizar fontes, documentos, dados ou permissões.'
    if (key === 'R')
      return score >= 75
        ? 'A rotina é recorrente e suficientemente visível para ser melhorada e medida.'
        : score >= 50
          ? 'O fluxo é reconhecível, mas há etapas, responsáveis ou indicadores que ainda precisam ser explicitados.'
          : 'Ainda não há uma visão clara do trabalho real. Automatizar agora pode apenas acelerar a desorganização.'
    return score >= 75
      ? 'Existem condições para testar uma aplicação pequena com responsável, tempo e revisão.'
      : score >= 50
        ? 'Há potencial de aplicação, mas é preciso garantir apoio, tempo, acesso ou revisão humana.'
        : 'A próxima decisão deve ser preparar condições de uso antes de implantar uma solução.'
  }
  const pretty = (value) => {
    const labels = {
      liberar_tempo: 'liberar tempo para atividades de maior valor',
      decidir_melhor: 'tomar decisões com mais rapidez ou qualidade',
      reduzir_retrabalho: 'reduzir retrabalho',
      melhorar_vendas: 'melhorar propostas, vendas ou negociações',
      melhorar_reunioes: 'melhorar reuniões e acompanhamento',
      organizar_info: 'organizar informações e documentos',
      apoiar_equipe: 'apoiar melhor uma equipe',
      responder_rapido: 'responder com mais agilidade',
      reunioes: 'reuniões e preparação de reuniões',
      mensagens: 'e-mails e mensagens',
      propostas: 'propostas, relatórios ou apresentações',
      analise: 'análise de dados e informações',
      clientes: 'acompanhamento de clientes ou oportunidades',
      planejamento: 'planejamento e priorização',
      pessoas: 'atendimento ou coordenação de pessoas',
      registro: 'registro e organização do trabalho',
      empresa_atendimento: 'atendimento interno ao colaborador',
      empresa_integracao: 'integração de novos colaboradores',
      empresa_desenvolvimento: 'desenvolvimento e feedback',
      empresa_demanda: 'geração e qualificação de demanda',
      empresa_funil: 'leads e oportunidades no funil',
      empresa_propostas: 'propostas e follow-ups',
      empresa_fechamento: 'fechamento e previsibilidade de caixa',
      empresa_recebiveis: 'recebíveis e cobrança',
      empresa_aprovacoes: 'contas a pagar e aprovações',
      pessoas_rh: 'Pessoas e RH',
      comercial: 'Comercial',
      financeiro: 'Financeiro',
      marketing: 'Marketing',
      operacoes: 'Operações',
      atendimento: 'Atendimento ao cliente',
      administrativo: 'Administração',
      rotina_comercial: 'uma rotina comercial',
      rotina_financeira: 'uma rotina financeira',
      rotina_pessoas: 'uma rotina de pessoas',
    }
    return labels[value] || String(value || '').replace(/_/g, ' ')
  }

  let F = 0
  let A = 0
  let R = 0
  let O = 0
  let foco = ''
  let primeiraAplicacao = ''
  let indicador = ''
  let apoio = ''

  if (tipo === 'executivo') {
    F += get('E-F1') ? 20 : 0
    F += get('E-F2') ? 20 : 0
    F += scoreMap(get('E-F3'), {
      varias_vezes_dia: 20,
      diariamente: 18,
      algumas_semana: 15,
      semanalmente: 11,
      mensalmente: 7,
      sem_frequencia: 3,
    })
    F += arr('E-F4').length > 0 && !has('E-F4', 'nao_sei') ? 20 : 5
    F += arr('E-F5').length > 0 && !has('E-F5', 'nao_sei') ? 15 : 3
    F += filled('E-F6', 20) ? 5 : 0

    A += arr('E-A1').length > 0 ? 20 : 0
    A += arr('E-A2').length > 0 ? 20 : 0
    A += scoreMap(get('E-A3'), {
      facil_rapido: 20,
      geralmente_facil: 16,
      depende_pessoa: 10,
      demorado: 5,
      frequentemente_nao: 2,
      nao_se_aplica: 8,
    })
    A += scoreMap(get('E-A4'), {
      bem_definidos: 15,
      pouco_usados: 10,
      cada_um: 5,
      nao_existem: 2,
      nao_sei: 3,
    })
    A += arr('E-A5').length > 0 ? 10 : 0
    A += scoreMap(get('E-A6'), {
      regras_claras: 15,
      nocao_sem_regra: 9,
      nao_certeza: 4,
      nao_sei: 3,
    })

    R += scoreMap(get('E-R1'), {
      uma_duas: 8,
      tres_cinco: 13,
      seis_dez: 17,
      mais_dez: 20,
      nao_sei: 5,
    })
    R += scoreMap(get('E-R2'), {
      ate_15: 8,
      dezesseis_30: 12,
      trinta_60: 16,
      uma_duas_horas: 19,
      mais_duas: 20,
      nao_sei: 5,
    })
    R += arr('E-R3').length > 0 ? Math.min(20, arr('E-R3').length * 4) : 0
    R += scoreMap(get('E-R4'), {
      antes: 6,
      busca: 12,
      execucao: 9,
      revisao: 10,
      aprovacao: 8,
      acompanhamento: 14,
      nao_sei: 4,
    })
    R += scoreMap(get('E-R5'), {
      modelo_claro: 15,
      varia: 10,
      cada_jeito: 5,
      sem_padrao: 2,
      nao_sei: 3,
    })
    R += scoreMap(get('E-R6'), {
      regularmente: 10,
      estimativa: 7,
      ocasionalmente: 4,
      nao_mede: 1,
      nao_sei: 2,
    })
    R = Math.min(100, R)

    O += scoreMap(get('E-O1'), {
      nao_uso: 4,
      ocasional: 8,
      semanal: 11,
      quase_todos: 14,
      estruturado: 15,
      nao_sei_permitido: 2,
    })
    O += scoreMap(get('E-O2'), {
      aprovadas: 15,
      nao_sei_aprovadas: 9,
      gratuitas_pessoais: 6,
      pedir_autorizacao: 5,
      nao_sei: 3,
    })
    O += scoreMap(get('E-O3'), {
      sempre: 20,
      maioria: 15,
      dificuldade: 7,
      depende_assunto: 11,
      nao_sei: 4,
    })
    O += scoreMap(get('E-O4'), {
      nenhum: 2,
      ate_30: 7,
      trinta_uma: 11,
      uma_duas: 14,
      mais_duas: 15,
      nao_sei: 4,
    })
    O += scoreMap(get('E-O5'), {
      sim: 15,
      provavelmente: 11,
      autorizacao: 7,
      outra_pessoa: 6,
      nao_momento: 2,
    })
    O += scoreMap(get('E-O6'), {
      diretamente: 8,
      indiretamente: 13,
      pouco: 17,
      nao: 20,
      nao_sei: 5,
    })
    O += arr('E-O7').length > 0 ? 12 : 0

    foco = pretty(get('E-F2'))
    primeiraAplicacao = foco
    indicador =
      arr('E-F5')
        .map((item) => pretty(item))
        .join(', ') || 'tempo, volume ou qualidade da rotina'
    apoio = pretty(get('E-O7'))
  } else {
    F += get('C-F1') ? 15 : 0
    F += get('C-F2') ? 20 : 0
    F += filled('C-F3', 15) ? 15 : 2
    F += arr('C-F4').length > 0 ? 15 : 0
    F += arr('C-F5').length > 0 ? 20 : 0
    F += filled('C-F6', 20) ? 15 : 2

    A += arr('C-A1').length > 0 ? 20 : 0
    A += arr('C-A2').length > 0 ? 15 : 0
    A += scoreMap(get('C-A3'), {
      claramente_definida: 20,
      nem_todos: 13,
      varias_versoes: 7,
      nao_existe: 2,
      nao_sei: 3,
    })
    A += scoreMap(get('C-A4'), {
      completa: 15,
      adequada: 12,
      desigual: 7,
      desatualizada: 3,
      nao_sei: 4,
    })
    A += arr('C-A5').length > 0 ? 10 : 0
    A += scoreMap(get('C-A6'), {
      regras_claras: 20,
      pouco_aplicadas: 13,
      depende_area: 8,
      sem_regras: 3,
      nao_sei: 4,
    })
    A += scoreMap(get('C-A7'), { sim: 0, aprovacao: 0, parcialmente: 0, nao: 0, nao_sei: 0 })

    R += scoreMap(get('C-R1'), {
      varias_dia: 15,
      diariamente: 14,
      algumas_semana: 11,
      semanalmente: 8,
      mensalmente: 5,
      eventualmente: 3,
    })
    R += scoreMap(get('C-R2'), {
      documentado_seguido: 20,
      documentado_pouco: 15,
      informal: 10,
      cada_jeito: 5,
      nao_sabemos: 2,
    })
    R += scoreMap(get('C-R3'), {
      uma_pessoa: 6,
      uma_area: 10,
      duas_areas: 13,
      tres_mais: 15,
      nao_sei: 5,
    })
    R += arr('C-R4').length > 0 ? Math.min(20, arr('C-R4').length * 4) : 0
    R +=
      arr('C-R5').length > 0 && !has('C-R5', 'nao_sei') ? Math.min(15, arr('C-R5').length * 5) : 2
    R +=
      arr('C-R6').length > 0 && !has('C-R6', 'nao_mede') ? Math.min(15, arr('C-R6').length * 4) : 2
    R += filled('C-R7', 20) ? 0 : 0
    R = Math.min(100, R)

    O += scoreMap(get('C-O1'), {
      identificado: 20,
      provavelmente: 13,
      ainda_nao: 6,
      nao: 2,
      nao_sei: 4,
    })
    O += scoreMap(get('C-O2'), { sim: 15, mais_de_uma: 9, nao: 3, nao_sei: 4 })
    O += scoreMap(get('C-O3'), {
      sim: 15,
      parcialmente: 10,
      aprovacao: 7,
      nao_momento: 2,
      nao_sei: 4,
    })
    O += scoreMap(get('C-O4'), { sim: 15, provavelmente: 11, dificil: 6, nao: 2, nao_sei: 4 })
    O += scoreMap(get('C-O5'), {
      nao_usa: 4,
      individual: 7,
      equipes: 9,
      producao: 10,
      implantando: 9,
      nao_sei: 4,
    })
    O += scoreMap(get('C-O6'), {
      responsavel: 15,
      area: 11,
      tecnologia: 10,
      juridico: 9,
      nao_definido: 3,
      nao_sei: 4,
    })
    O += arr('C-O7').length > 0 ? 8 : 0

    foco = pretty(get('C-F2'))
    primeiraAplicacao = foco
    indicador =
      arr('C-F5')
        .map((item) => pretty(item))
        .join(', ') || 'tempo, volume, qualidade ou resultado financeiro'
    apoio = 'uma equipe responsável e um patrocinador do piloto'
  }

  F = clamp(F)
  A = clamp(A)
  R = clamp(R)
  O = clamp(O)
  const stageScores = { F, A, R, O }
  const stageNames = { F: 'Foco', A: 'Arquitetura', R: 'Rotina', O: 'Operação' }
  let bottleneck = 'F'
  ;['A', 'R', 'O'].forEach((key) => {
    if (stageScores[key] < stageScores[bottleneck]) bottleneck = key
  })
  const overall = Math.round((F + A + R + O) / 4)
  const minScore = Math.min(F, A, R, O)
  const band =
    minScore >= 75
      ? 'Pronto para um primeiro teste'
      : overall >= 50
        ? 'Em preparação'
        : 'Ainda no início'
  let nextProduct = 'FAROL Essencial'
  if (tipo === 'executivo') {
    if (F >= 55 && A >= 55 && R >= 55 && O >= 55) nextProduct = 'FAROL Executivo'
    else if (F >= 45) nextProduct = 'FAROL Mapa IA'
  } else {
    if (F >= 65 && A >= 65 && R >= 60 && O >= 65) nextProduct = 'FAROL Empresa'
    else if (F >= 45) nextProduct = 'FAROL Mapa IA'
  }

  const bottleneckText = {
    F: 'transformar o interesse em uma dor, rotina e resultado claramente definidos',
    A: 'organizar as informações, fontes e regras necessárias para trabalhar com segurança',
    R: 'tornar o processo visível, repetível e mensurável antes de automatizar',
    O: 'garantir responsável, tempo, acesso, apoio e revisão humana para testar uma mudança',
  }
  const firstValue =
    bottleneck === 'F'
      ? 'Escolha uma única rotina ou processo e descreva, em uma frase, o problema e o resultado que precisa melhorar.'
      : bottleneck === 'A'
        ? 'Reúna as três fontes mais usadas nessa rotina, identifique a fonte oficial e registre quem pode acessá-las.'
        : bottleneck === 'R'
          ? 'Observe uma semana do processo, registre suas etapas e meça tempo, volume ou retrabalho em pelo menos uma ocorrência.'
          : 'Defina um responsável, reserve um pequeno bloco de tempo e escolha um teste reversível com revisão humana.'
  const sevenDayPlan =
    tipo === 'executivo'
      ? [
          'Escolha uma ocorrência real da rotina indicada e registre entrada, etapas e saída.',
          'Separe os documentos ou informações usados nessa ocorrência e marque o que é sensível.',
          'Meça o tempo gasto e o ponto de maior retrabalho.',
          'Teste uma aplicação simples de IA apenas com informação autorizada.',
          'Revise o resultado, registre o que funcionou e decida se vale repetir.',
        ]
      : [
          'Confirme o processo prioritário, o patrocinador e o responsável operacional.',
          'Desenhe o fluxo atual em poucas etapas e marque esperas, retrabalho e passagens de mão.',
          'Liste as fontes oficiais e os dados que podem ser usados no teste.',
          'Escolha um indicador de linha de base e faça uma primeira medição.',
          'Defina um piloto pequeno, reversível e com revisão humana.',
        ]
  const avoid =
    tipo === 'executivo'
      ? [
          'Comprar novas ferramentas antes de definir a rotina.',
          'Enviar dados confidenciais sem verificar regras de uso.',
          'Tratar uma resposta da IA como decisão sem revisão.',
        ]
      : [
          'Automatizar o processo inteiro de uma vez.',
          'Usar dados sensíveis sem regra de acesso e revisão.',
          'Iniciar um projeto sem patrocinador, responsável e indicador.',
        ]

  const stages = ['F', 'A', 'R', 'O'].map((key) => ({
    key,
    title: stageNames[key],
    score: stageScores[key],
    state: stageState(stageScores[key]),
    reading: stageReading(key, stageScores[key]),
  }))
  const report = {
    version: 'MVP-1',
    tipo,
    nome,
    empresa,
    generatedAt: new Date().toISOString(),
    overall,
    band,
    foco,
    primeiraAplicacao,
    apoio,
    stages,
    bottleneck: {
      key: bottleneck,
      title: stageNames[bottleneck],
      description: bottleneckText[bottleneck],
    },
    scenario:
      'A avaliação indica ' +
      band.toLowerCase() +
      '. O próximo passo deve respeitar o ponto mais frágil do percurso, em vez de começar pela ferramenta mais sofisticada.',
    firstValue,
    sevenDayPlan,
    measurement: indicador,
    avoid,
    nextProduct,
    limitations:
      tipo === 'empresa'
        ? 'Este resultado representa a percepção do respondente sobre um processo escolhido. Não substitui entrevistas, análise de documentos ou diagnóstico profundo.'
        : 'Este resultado representa a percepção do respondente sobre uma rotina profissional escolhida. Não é avaliação de desempenho nem diagnóstico profundo.',
  }

  const esc = (value) =>
    String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  const stageHtml = stages
    .map(
      (item) =>
        '<tr><td style="padding:8px 10px;border-bottom:1px solid #e6eeee;"><strong>' +
        esc(item.key + ' — ' + item.title) +
        '</strong></td><td style="padding:8px 10px;border-bottom:1px solid #e6eeee;">' +
        esc(item.score + '/100 · ' + item.state) +
        '</td></tr>',
    )
    .join('')
  const stepsHtml = sevenDayPlan
    .map((item, index) => '<li style="margin-bottom:6px;">' + esc(item) + '</li>')
    .join('')
  const avoidHtml = avoid
    .map((item) => '<li style="margin-bottom:6px;">' + esc(item) + '</li>')
    .join('')
  const subject = 'Seu Raio-X FAROL — Liberação de Valor'
  const html =
    '<div style="font-family:Arial,sans-serif;color:#173b42;max-width:640px;margin:0 auto;line-height:1.55;">' +
    '<div style="background:#10454f;padding:28px 30px;color:#ffffff;"><div style="font-size:13px;letter-spacing:3px;font-weight:bold;color:#bde038;">SIMBIOSIA</div><h1 style="margin:10px 0 0;font-size:28px;">Raio-X FAROL</h1><p style="margin:8px 0 0;color:#e4f2f0;">Prontidão para liberar valor com IA</p></div>' +
    '<div style="padding:26px 30px;background:#ffffff;"><p>Olá, ' +
    esc(nome) +
    '.</p><p>Este é o seu relatório de <strong>Liberação de Valor</strong>, o L do Método FAROL. Ele mostra onde você ou sua empresa pode começar e qual deve ser o próximo passo.</p>' +
    '<div style="background:#f3f8f7;padding:18px;border-left:4px solid #bde038;margin:20px 0;"><div style="font-size:12px;letter-spacing:1px;color:#506266;text-transform:uppercase;">Cenário atual</div><div style="font-size:22px;font-weight:bold;margin-top:5px;color:#10454f;">' +
    esc(band) +
    '</div><p style="margin:8px 0 0;">' +
    esc(report.scenario) +
    '</p></div>' +
    '<h2 style="font-size:18px;color:#10454f;">Seu FAROL</h2><table style="border-collapse:collapse;width:100%;font-size:14px;">' +
    stageHtml +
    '</table>' +
    '<h2 style="font-size:18px;color:#10454f;margin-top:24px;">L — Liberação de Valor</h2><p><strong>Principal trava:</strong> ' +
    esc(bottleneckText[bottleneck]) +
    '.</p><p><strong>Primeira aplicação:</strong> ' +
    esc(primeiraAplicacao) +
    '.</p><p><strong>O valor que já pode ser liberado:</strong> ' +
    esc(firstValue) +
    '</p><p><strong>Medição inicial:</strong> ' +
    esc(indicador) +
    '.</p>' +
    '<h3 style="font-size:16px;color:#10454f;">Próximos sete dias</h3><ol>' +
    stepsHtml +
    '</ol>' +
    '<h3 style="font-size:16px;color:#10454f;">Ainda não faça</h3><ul>' +
    avoidHtml +
    '</ul>' +
    '<div style="background:#10454f;color:#ffffff;padding:18px;margin-top:24px;"><strong>Próximo produto recomendado</strong><div style="font-size:20px;color:#bde038;margin-top:5px;">' +
    esc(nextProduct) +
    '</div></div>' +
    '<p style="font-size:12px;color:#506266;margin-top:24px;">' +
    esc(report.limitations) +
    '</p><p style="font-size:12px;color:#506266;">Relatório automático · versão ' +
    esc(report.version) +
    '</p></div></div>'

  if (mode === 'prepare') {
    return e.json(200, { ok: true, emailStatus: 'not_sent', report })
  }

  let emailStatus = 'sent'
  try {
    const settings = $app.settings()
    const pdfRaw = String(body.pdfBase64 || '').replace(/^data:application\/pdf[^,]*base64,/, '')
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    const bytes = []
    let buffer = 0
    let bits = 0
    for (let i = 0; i < pdfRaw.length; i += 1) {
      const code = alphabet.indexOf(pdfRaw.charAt(i))
      if (code < 0 || code === 64) continue
      buffer = (buffer << 6) | code
      bits += 6
      if (bits >= 8) {
        bits -= 8
        bytes.push((buffer >> bits) & 255)
      }
    }
    if (!bytes.length || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) {
      return e.badRequestError('O arquivo recebido não é um PDF válido.')
    }
    const attachment = $filesystem.fileFromBytes(bytes, 'raio-x-farol.pdf')
    const message = new MailerMessage({
      from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
      to: [{ address: email }],
      subject,
      html:
        '<p>Olá, ' +
        esc(nome) +
        '.</p><p>Seu Raio-X FAROL está anexado a este e-mail.</p><p>O relatório é uma autoavaliação orientada e não substitui um diagnóstico profundo.</p><p>— Simbiosia</p>',
      attachments: { 'raio-x-farol.pdf': attachment.reader.open() },
    })
    $app.newMailClient().send(message)
  } catch (error) {
    emailStatus = 'failed'
    $app
      .logger()
      .error('raiox email failed', 'error', error && error.message ? error.message : String(error))
  }

  return e.json(emailStatus === 'sent' ? 200 : 202, { ok: true, emailStatus, report })
})
