import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { confirmTeamPasswordReset, getTeamAuthError } from '@/services/teamAccess'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await confirmTeamPasswordReset(token, password, confirm)
      setDone(true)
      window.setTimeout(() => navigate('/equipe', { replace: true }), 1800)
    } catch (err) {
      setError(getTeamAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="team-page">
      <section className="team-card">
        <img src="/simbiosia-logo.svg" alt="Simbiosia" className="team-logo" />
        <div className="team-kicker">ÁREA RESTRITA · SIMBIOSIA</div>
        <h1>Definir senha</h1>
        {done ? (
          <div className="team-notice">
            <ShieldCheck size={18} /> Senha atualizada. Redirecionando para o login da equipe…
          </div>
        ) : !token ? (
          <div className="team-error">
            O link está incompleto ou expirou. Solicite um novo link de redefinição.
          </div>
        ) : (
          <form onSubmit={submit} className="team-form">
            <label>
              Nova senha
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              Confirme a nova senha
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button className="team-primary" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />} Salvar
              senha
            </button>
          </form>
        )}
        {error && (
          <div className="team-error" role="alert">
            {error}
          </div>
        )}
        <Link className="team-back" to="/equipe">
          Voltar à área da equipe
        </Link>
      </section>
    </main>
  )
}
