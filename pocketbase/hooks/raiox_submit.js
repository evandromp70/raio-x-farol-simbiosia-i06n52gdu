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
  const normalize = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ç/g, 'c')
  const lexicalCount = (value, terms) => {
    const normalized = normalize(value)
    return terms.filter((term) => normalized.indexOf(normalize(term)) >= 0).length
  }
  const lexicalScore = (value, terms, high, medium) => {
    const normalized = normalize(value)
    const unknown = [
      'nao sei',
      'sem clareza',
      'nao tenho dados',
      'nao tenho informacao',
      'nao conhecemos',
      'sem processo',
      'sem rotina',
    ]
    if (!normalized || unknown.some((term) => normalized.indexOf(term) >= 0)) return 0
    const count = lexicalCount(value, terms)
    return count >= 2 ? high : count === 1 ? medium : 0
  }
  const multiAverage = (id, map) => {
    const values = arr(id)
    if (!values.length) return 0
    return Math.round(values.reduce((sum, value) => sum + scoreMap(value, map), 0) / values.length)
  }
  const classificationScore = (id, unknownCode, noneCode) => {
    const values = arr(id)
    if (!values.length) return 0
    const known = values.filter(
      (value) => value !== unknownCode && (!noneCode || value !== noneCode),
    )
    const hasNone = noneCode && values.indexOf(noneCode) >= 0
    if (!known.length && !hasNone) return 0
    return values.indexOf(unknownCode) >= 0 ? 5 : 10
  }
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
  let executiveSafety = null
  let companyAvailability = ''
  let companyRestrictions = []
  let companySafety = null
  let companyProcessScore = 0

  if (tipo === 'executivo') {
    F += get('E-F1') && get('E-F1') !== 'outro' ? 20 : 0
    F += get('E-F2') && get('E-F2') !== 'outra' ? 20 : 0
    F += scoreMap(get('E-F3'), {
      varias_vezes_dia: 20,
      diariamente: 18,
      algumas_semana: 15,
      semanalmente: 11,
      mensalmente: 7,
      sem_frequencia: 3,
    })
    F += arr('E-F4').length > 0 && !has('E-F4', 'nao_sei') ? 20 : 0
    F += Math.min(
      15,
      arr('E-F5').reduce((sum, value) => sum + (value === 'outro' ? 2 : 5), 0),
    )
    F += lexicalScore(
      get('E-F6'),
      [
        'proposta',
        'cliente',
        'venda',
        'reuniao',
        'email',
        'mensagem',
        'relatorio',
        'analise',
        'atendimento',
        'pedido',
        'dado',
        'documento',
        'prazo',
        'retrabalho',
        'decisao',
        'acompanh',
        'processo',
        'planilha',
        'aprovacao',
        'cobranca',
        'tempo',
        'qualidade',
      ],
      10,
      5,
    )

    A += arr('E-A1').length > 0 ? 20 : 0
    A += multiAverage('E-A2', {
      sistema: 20,
      integrados: 20,
      sem_integracao: 12,
      pastas: 15,
      email: 10,
      mensagens: 8,
      pessoais: 5,
      pessoas: 4,
      nao_sei: 0,
    })
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
    A += classificationScore('E-A5', 'nao_sei', '')
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
    R += scoreMap(get('E-R7'), { sim: 10, parte: 5, nao: 0, nunca: 0 })
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
    executiveSafety = {
      impact: get('E-O6') || '',
      review: get('E-O3') || '',
      toolAccess: get('E-O2') || '',
      time: get('E-O4') || '',
      support: get('E-O7') || '',
      sensitive: arr('E-A5').some(
        (value) =>
          [
            'clientes',
            'colaboradores',
            'financeiras',
            'estrategicas',
            'contratuais',
            'sensíveis',
          ].indexOf(value) >= 0,
      ),
      classificationUnknown: has('E-A5', 'nao_sei'),
    }
    O = Math.round((O * 100) / 80)

    foco = pretty(get('E-F2'))
    primeiraAplicacao = foco
    indicador =
      arr('E-F5')
        .map((item) => pretty(item))
        .join(', ') || 'tempo, volume ou qualidade da rotina'
    apoio = pretty(get('E-O7'))
  } else {
    F += get('C-F1') && get('C-F1') !== 'outra' ? 15 : 0
    F += get('C-F2') && get('C-F2') !== 'outra' ? 20 : 0
    companyProcessScore = lexicalScore(
      get('C-F3'),
      [
        'processo',
        'proposta',
        'cliente',
        'venda',
        'lead',
        'funil',
        'cobranca',
        'recebimento',
        'aprovacao',
        'colaborador',
        'atendimento',
        'pedido',
        'planilha',
        'crm',
        'documento',
        'relatorio',
        'entrega',
        'revisao',
        'reuniao',
        'dado',
        'solicitacao',
        'fechamento',
        'oportunidade',
        'marketing',
        'financeiro',
        'rh',
      ],
      15,
      8,
    )
    F += companyProcessScore
    F += Math.min(15, arr('C-F4').filter((value) => value !== 'outra').length * 5)
    F += Math.min(
      15,
      arr('C-F5').reduce((sum, value) => sum + (value === 'outro' ? 2 : 5), 0),
    )
    F += lexicalScore(
      get('C-F6'),
      [
        'atras',
        'perd',
        'risco',
        'prazo',
        'cliente',
        'receita',
        'custo',
        'meta',
        'caixa',
        'reclam',
        'retrabalho',
        'contrato',
        'oportunidade',
        'multa',
        'urgenc',
        'pressao',
        'impact',
      ],
      15,
      8,
    )

    A += arr('C-A1').length > 0 ? 20 : 0
    A += multiAverage('C-A2', {
      sistema: 20,
      integrados: 20,
      sem_integracao: 12,
      pastas: 15,
      emails: 10,
      mensagens: 8,
      planilhas: 7,
      pessoas: 4,
      nao_sei: 0,
    })
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
    A += classificationScore('C-A5', 'nao_sei', 'nenhum')
    A += scoreMap(get('C-A6'), {
      regras_claras: 20,
      pouco_aplicadas: 13,
      depende_area: 8,
      sem_regras: 3,
      nao_sei: 4,
    })
    companyAvailability = get('C-A7') || ''
    companyRestrictions = arr('C-O7')
    companySafety = {
      dataClassificationUnknown: has('C-A5', 'nao_sei'),
      sensitiveData: arr('C-A5').some(
        (value) =>
          [
            'colaboradores',
            'clientes',
            'financeiros',
            'bancarios',
            'estrategicas',
            'contratuais',
            'saude',
            'segredos',
          ].indexOf(value) >= 0,
      ),
      availability: companyAvailability,
      restrictions: companyRestrictions,
    }

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
    O = Math.round((O * 100) / 90)

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
  let routingExplanation =
    'O FAROL Essencial é o próximo passo para delimitar melhor uma primeira aplicação.'
  let isCrossFunctional = false
  if (tipo === 'executivo') {
    const executiveSpecific = F >= 90 && get('E-F1') !== 'outro' && get('E-F2') !== 'outra'
    if (executiveSpecific && A >= 75 && R >= 75 && O >= 75) {
      nextProduct = 'FAROL Executivo'
      routingExplanation =
        'Foco profissional específico e eixos de prontidão suficientes para considerar o percurso executivo. Confirme condições de uso antes de testar.'
    }
  } else {
    const businessSpecific =
      get('C-F1') !== 'outra' && get('C-F2') !== 'outra' && companyProcessScore >= 8
    const crossTerms = [
      'marketing',
      'vendas',
      'comercial',
      'atendimento',
      'financeiro',
      'rh',
      'pessoas',
      'operacoes',
    ]
    isCrossFunctional =
      businessSpecific &&
      F >= 90 &&
      get('C-R3') === 'tres_mais' &&
      arr('C-F4').filter((value) => value !== 'outra').length >= 3 &&
      lexicalCount(get('C-F3'), crossTerms) >= 3
    if (isCrossFunctional) {
      nextProduct = 'FAROL Mapa IA'
      routingExplanation =
        'O processo definido atravessa várias áreas e públicos; o FAROL Mapa IA ajuda a delimitar a intervenção transversal.'
    } else if (businessSpecific) {
      nextProduct = 'FAROL Empresa'
      routingExplanation =
        'Há uma área, uma dor e um processo empresarial específicos para uma conversa. A prontidão para piloto e suas autorizações são tratadas separadamente.'
    }
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
  const pilotConditions = []
  const safetyAlerts = []
  const addPilotCondition = (message) => {
    if (message && pilotConditions.indexOf(message) < 0) pilotConditions.push(message)
  }
  const addSafetyAlert = (message) => {
    if (message && safetyAlerts.indexOf(message) < 0) safetyAlerts.push(message)
  }
  if (tipo === 'executivo') {
    if (executiveSafety.toolAccess !== 'aprovadas')
      addPilotCondition(
        'Confirmar ferramenta aprovada e regra de uso antes de compartilhar informações.',
      )
    if (executiveSafety.time === 'nenhum')
      addPilotCondition('Reservar tempo e definir responsável antes de iniciar um teste.')
    if (executiveSafety.review === 'dificuldade' || executiveSafety.review === 'nao_sei')
      addSafetyAlert('Definir revisão humana adequada antes de usar resultados da IA.')
    if (get('E-A6') && get('E-A6') !== 'regras_claras')
      addSafetyAlert('Definir regras de uso de IA para informações da empresa antes do teste.')
    if (executiveSafety.impact === 'diretamente' || executiveSafety.impact === 'indiretamente')
      addSafetyAlert(
        'O erro pode afetar pessoas, clientes, dinheiro ou decisões; usar revisão humana e teste reversível.',
      )
    if (executiveSafety.sensitive)
      addSafetyAlert(
        'Foram assinalados dados de clientes, colaboradores, financeiros, estratégicos, contratuais ou sensíveis; validar autorização e regras de tratamento.',
      )
    if (executiveSafety.classificationUnknown)
      addSafetyAlert(
        'A classificação das informações não está clara; mapear o que pode ser usado antes de qualquer teste.',
      )
  } else {
    if (companyAvailability === 'aprovacao')
      addPilotCondition('Aguardar aprovação para disponibilizar dados ao piloto.')
    else if (companyAvailability === 'parcialmente')
      addPilotCondition('Limitar o escopo aos dados que tenham autorização confirmada.')
    else if (companyAvailability === 'nao')
      addPilotCondition('Piloto bloqueado até haver dados/documentos disponíveis com autorização.')
    else if (companyAvailability === 'nao_sei')
      addPilotCondition(
        'Mapear disponibilidade, permissões e responsável pelos dados antes do piloto.',
      )
    const restrictionLabels = {
      seguranca: 'Definir controles de segurança para o piloto.',
      lgpd: 'Validar privacidade e tratamento de dados.',
      politica: 'Confirmar a política interna aplicável.',
      integracao: 'Delimitar a integração necessária.',
      dados:
        'Dados insuficientes: aguardar acesso ou recortar um caso que tenha dados disponíveis.',
      equipe: 'Confirmar disponibilidade de equipe para participar.',
      orcamento: 'Validar orçamento antes de dimensionar o piloto.',
      lideranca: 'Obter aprovação da liderança antes de iniciar.',
      nao_sei: 'Mapear as restrições antes de propor o piloto.',
    }
    companyRestrictions.forEach((value) => {
      if (value !== 'nenhuma')
        addPilotCondition(
          restrictionLabels[value] || 'Investigar restrição indicada antes de iniciar.',
        )
    })
    if (get('C-O1') !== 'identificado')
      addPilotCondition('Confirmar patrocinador com autoridade para apoiar o piloto.')
    if (get('C-O2') !== 'sim')
      addPilotCondition('Definir uma pessoa responsável pelo processo no dia a dia.')
    if (get('C-O3') !== 'sim')
      addPilotCondition('Confirmar disponibilidade de equipe nos próximos 30 dias.')
    if (get('C-O4') === 'nao' || get('C-O4') === 'dificil')
      addPilotCondition('Definir um recorte pequeno e reversível para testar.')
    if (companySafety.sensitiveData)
      addSafetyAlert(
        'Foram assinalados dados restritos/sensíveis; validar autorização, controles de acesso e revisão humana antes de testar.',
      )
    if (companySafety.dataClassificationUnknown)
      addSafetyAlert(
        'O respondente não sabe classificar os dados; fazer essa checagem antes de qualquer uso de IA.',
      )
  }
  if (!pilotConditions.length)
    pilotConditions.push(
      'Nenhum impedimento específico informado; confirmar dados, permissões, responsável e revisão humana antes de começar.',
    )
  if (!safetyAlerts.length && tipo === 'empresa')
    safetyAlerts.push(
      arr('C-O7').indexOf('nenhuma') >= 0
        ? 'Nenhum bloqueio declarado; validar dados e controles na primeira conversa.'
        : 'Ainda é necessário validar a qualidade dos dados e os controles aplicáveis ao processo.',
    )
  const pilotBlocked =
    (tipo === 'empresa' &&
      (companyAvailability === 'aprovacao' ||
        companyAvailability === 'nao' ||
        companyAvailability === 'nao_sei' ||
        ['dados', 'equipe', 'orcamento', 'lideranca', 'nao_sei'].some(
          (code) => companyRestrictions.indexOf(code) >= 0,
        ))) ||
    (tipo === 'executivo' &&
      (executiveSafety.toolAccess !== 'aprovadas' || executiveSafety.time === 'nenhum'))
  const pilotScopeLimited =
    companyAvailability === 'parcialmente' ||
    companyRestrictions.some(
      (code) => ['seguranca', 'lgpd', 'politica', 'integracao'].indexOf(code) >= 0,
    ) ||
    (tipo === 'executivo' &&
      (executiveSafety.review === 'dificuldade' ||
        executiveSafety.impact === 'diretamente' ||
        executiveSafety.impact === 'indiretamente' ||
        executiveSafety.sensitive))
  const pilotStatus = pilotBlocked
    ? 'Piloto bloqueado ou aguardando condição prévia'
    : pilotScopeLimited
      ? 'Piloto apenas com escopo limitado ou controles adicionais'
      : 'Condições de piloto a confirmar'

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
      'A avaliação indica: ' +
      band.toLowerCase() +
      '. O próximo passo deve respeitar o ponto mais frágil do percurso, em vez de começar pela ferramenta mais sofisticada.',
    firstValue,
    sevenDayPlan,
    measurement: indicador,
    context: {
      rotina: tipo === 'executivo' ? pretty(get('E-F2')) : '',
      mudancaDesejada: tipo === 'executivo' ? String(get('E-F6') || '').trim() : '',
      processo: tipo === 'empresa' ? String(get('C-F3') || '').trim() : '',
      fluxoAtual: tipo === 'empresa' ? String(get('C-R7') || '').trim() : '',
      porQueAgora: tipo === 'empresa' ? String(get('C-F6') || '').trim() : '',
      criterioSucesso: tipo === 'empresa' ? String(get('C-O8') || '').trim() : '',
    },
    avoid,
    nextProduct,
    routingExplanation,
    pilotStatus,
    pilotConditions,
    safetyAlerts,
    textHeuristic:
      tipo === 'empresa'
        ? 'A leitura de C-F3/C-F6 usa sinais lexicais simples; não entende o significado do texto. Use-o como pista e valide na conversa.'
        : 'A leitura de E-F6 usa sinais lexicais simples; não entende o significado do texto. Use-o como pista e valide na conversa.',
    limitations:
      tipo === 'empresa'
        ? 'Este resultado representa a percepção do respondente sobre um processo escolhido. FAROL Empresa pode ser recomendado mesmo quando o piloto ainda depende de dados, patrocínio ou aprovações. Não substitui entrevistas, análise de documentos ou diagnóstico profundo.'
        : 'Este resultado representa a percepção do respondente sobre uma rotina profissional escolhida. A recomendação não autoriza uso de ferramentas ou dados sem aprovação. Não é avaliação de desempenho nem diagnóstico profundo.',
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
    '</div><p style="margin:8px 0 0;color:#ffffff;">' +
    esc(routingExplanation) +
    '</p></div>' +
    '<h3 style="font-size:16px;color:#10454f;">Condições antes de qualquer piloto</h3><p><strong>' +
    esc(pilotStatus) +
    '</strong></p><ul>' +
    pilotConditions.map((item) => '<li>' + esc(item) + '</li>').join('') +
    '</ul>' +
    '<h3 style="font-size:16px;color:#10454f;">Segurança e revisão</h3><ul>' +
    safetyAlerts.map((item) => '<li>' + esc(item) + '</li>').join('') +
    '</ul>' +
    '<p style="font-size:12px;color:#506266;">' +
    esc(report.textHeuristic) +
    '</p>' +
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
