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
    const verify = async () => {
      if (!pb.authStore.isValid) {
        if (active) setIsAuthenticated(false)
        return
      }
      try {
        const auth = await pb.collection('raiox_team').authRefresh()
        const allowed =
          pb.authStore.isValid &&
          isTeamEmail(String(auth.record.email || '')) &&
          auth.record.team_member === true &&
          auth.record.verified === true
        if (active) setIsAuthenticated(allowed)
        if (!allowed) pb.authStore.clear()
      } catch {
        pb.authStore.clear()
        if (active) setIsAuthenticated(false)
      }
    }
    void verify()
    const unsubscribe = pb.authStore.onChange(() => {
      void verify()
    })
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
      setNotice(
        'Se houver uma conta autorizada para este e-mail, enviaremos um link para definir ou redefinir a senha.',
      )
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
          A base contém apenas nome, e-mail, percurso, data de envio e status do relatório.
          Respostas e PDFs não são armazenados.
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
            <button className="team-link" type="button" onClick={onReset} disabled={busy}>
              <Mail size={15} /> Definir / redefinir senha por e-mail
            </button>
            <p className="team-hint">Acesso exclusivo a jose@simbiosia.com.br.</p>
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
