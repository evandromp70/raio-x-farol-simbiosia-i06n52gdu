import pb from '@/lib/pocketbase/client'

export type RaioxTipo = 'executivo' | 'empresa'
export type RaioxMode = 'prepare' | 'send'

export type RaioxResponse = {
  ok: boolean
  emailStatus: 'sent' | 'failed' | 'pending' | 'not_sent'
  report: {
    tipo: RaioxTipo
    nome: string
    empresa?: string
    overall: number
    band: string
    foco: string
    primeiraAplicacao: string
    stages: Array<{ key: string; title: string; score: number; state: string; reading: string }>
    bottleneck: { key: string; title: string; description: string }

    firstValue: string
    sevenDayPlan: string[]
    measurement: string
    context: {
      rotina: string
      mudancaDesejada: string
      processo: string
      fluxoAtual: string
      porQueAgora: string
      criterioSucesso: string
    }
    avoid: string[]
    nextProduct: string
    routingExplanation: string
    pilotStatus: string
    pilotConditions: string[]
    safetyAlerts: string[]

    limitations: string
    version: string
  }
}

export async function submitRaiox(payload: {
  mode: RaioxMode
  tipo: RaioxTipo
  nome: string
  email: string
  empresa?: string
  respostas: Record<string, string | string[]>
  pdfBase64?: string
  website?: string
}) {
  return pb.send<RaioxResponse>('/backend/v1/raiox-submit', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
