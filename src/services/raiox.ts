import pb from '@/lib/pocketbase/client'

export type RaioxTipo = 'executivo' | 'empresa'

export type RaioxResponse = {
  ok: boolean
  emailStatus: 'sent' | 'failed'
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
    scenario: string
    firstValue: string
    sevenDayPlan: string[]
    measurement: string
    avoid: string[]
    nextProduct: string
    limitations: string
  }
}

export async function submitRaiox(payload: {
  tipo: RaioxTipo
  nome: string
  email: string
  empresa?: string
  respostas: Record<string, string | string[]>
  website?: string
}) {
  return pb.send<RaioxResponse>('/backend/v1/raiox-submit', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
