import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'

const TEAM_EMAIL = 'jose@simbiosia.com.br'

export function normalizeTeamEmail(email: string) {
  return email.trim().toLowerCase()
}
export function isTeamEmail(email: string) {
  return normalizeTeamEmail(email) === TEAM_EMAIL
}

export async function signInTeamUser(email: string, password: string) {
  const normalizedEmail = normalizeTeamEmail(email)
  if (!isTeamEmail(normalizedEmail))
    throw new Error('Este acesso está reservado à equipe autorizada.')
  await pb.collection('raiox_team').authWithPassword(normalizedEmail, password)
}

export async function requestTeamPasswordReset(email: string) {
  const normalizedEmail = normalizeTeamEmail(email)
  if (!isTeamEmail(normalizedEmail))
    throw new Error('Este acesso está reservado à equipe autorizada.')
  await pb.collection('raiox_team').requestPasswordReset(normalizedEmail)
}

export async function confirmTeamPasswordReset(
  token: string,
  password: string,
  passwordConfirm: string,
) {
  if (!token) throw new Error('O link de redefinição está incompleto ou expirou.')
  await pb.collection('raiox_team').confirmPasswordReset(token, password, passwordConfirm)
}

export async function exportRaioxSubmissions() {
  if (!pb.authStore.isValid || !isTeamEmail(String(pb.authStore.record?.email || ''))) {
    throw new Error('Entre com o e-mail autorizado da equipe Simbiosia.')
  }
  const response = await fetch(
    `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/raiox-export.csv`,
    {
      method: 'GET',
      headers: { Authorization: pb.authStore.token },
    },
  )
  if (!response.ok) {
    let message = 'Não foi possível baixar o CSV.'
    try {
      message = (await response.json()).message || message
    } catch (parseError) {
      if (parseError instanceof Error) message = response.statusText || message
    }
    throw new Error(message)
  }
  return response.blob()
}

export function getTeamAuthError(error: unknown) {
  if (error instanceof ClientResponseError) {
    if (error.status === 400) return 'E-mail ou senha inválidos.'
    if (error.status === 403) return 'Acesso restrito à equipe Simbiosia.'
    return error.message || 'Não foi possível completar a operação.'
  }
  return error instanceof Error ? error.message : 'Não foi possível completar a operação.'
}
