import { useEffect, useState } from 'react'
import { Download, Loader2, LogIn, LogOut, Mail, ShieldCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import {
  exportRaioxSubmissions,
  getTeamAuthError,
  isTeamEmail,
  requestTeamPasswordReset,
  signInTeamUser,
} from '@/services/teamAccess'

export default function TeamExport() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const syncAuthorization = () => {
      const record = pb.authStore.record
      const allowed =
        pb.authStore.isValid &&
        isTeamEmail(String(record?.email || '')) &&
        record?.team_member === true &&
        record?.verified === true
      if (active) setIsAuthenticated(allowed)
      if (pb.authStore.isValid && !allowed) pb.authStore.clear()
    }
    const unsubscribe = pb.authStore.onChange(syncAuthorization)
    const verifyExistingSession = async () => {
      if (!pb.authStore.isValid) {
        syncAuthorization()
        return
      }
      try {
        await pb.collection('raiox_team').authRefresh()
        syncAuthorization()
      } catch {
        pb.authStore.clear()
        if (active) setIsAuthenticated(false)
      }
    }
    void verifyExistingSession()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await signInTeamUser(email, password)
    } catch (err) {
      setError(getTeamAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const onReset = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await requestTeamPasswordReset(email)
      setNotice('Solicitação enviada. Verifique jose.aquino@simbiosia.com.br e a pasta de spam.')
    } catch (err) {
      setError(getTeamAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const onDownload = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const blob = await exportRaioxSubmissions()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'leads-raio-x-farol.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Arquivo CSV baixado.')
    } catch (err) {
      setError(getTeamAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setIsAuthenticated(false)
    setNotice('Sessão encerrada.')
  }

  return (
    <main className="team-page">
      <section className="team-card">
        <img src="/simbiosia-logo.svg" alt="Simbiosia" className="team-logo" />
        <div className="team-kicker">ÁREA RESTRITA · SIMBIOSIA</div>
        <h1>Exportação de leads</h1>
        <p className="team-intro">
          A planilha contém apenas nome e e-mail de quem concluiu o questionário.
        </p>
        {isAuthenticated ? (
          <>
            <div className="team-identity">
              <ShieldCheck size={18} /> Sessão autorizada: {pb.authStore.record?.email}
            </div>
            <button className="team-primary" onClick={onDownload} disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <Download size={18} />} Baixar CSV
            </button>
            <button className="team-secondary" onClick={logout}>
              <LogOut size={17} /> Sair
            </button>
          </>
        ) : (
          <form onSubmit={onLogin} className="team-form">
            <label>
              E-mail autorizado
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <button className="team-primary" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />} Entrar
            </button>
            <button
              className="team-link"
              type="button"
              onClick={() => {
                setEmail('jose.aquino@simbiosia.com.br')
                setError('')
                setNotice('')
              }}
            >
              <Mail size={15} /> Usar meu e-mail real para redefinir senha
            </button>
            <button className="team-link" type="button" onClick={onReset} disabled={busy}>
              {busy ? <Loader2 className="spin" size={15} /> : <Mail size={15} />} Enviar link de
              redefinição
            </button>
            <p className="team-hint">
              Use o seu endereço de e-mail verdadeiro da equipe Simbiosia.
            </p>
          </form>
        )}
        {error && (
          <div className="team-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="team-notice" role="status">
            {notice}
          </div>
        )}
      </section>
    </main>
  )
}
