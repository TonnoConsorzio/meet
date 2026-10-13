'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    const statusResponse = await fetch('/api/auth-status', { cache: 'no-store' });
    const status = (await statusResponse.json()) as { emailConfigured?: boolean };
    if (!status.emailConfigured) {
      setPending(false);
      setError('L\'invio email non è configurato. Imposta RESEND_API_KEY sul server.');
      return;
    }
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: '/dashboard',
      errorCallbackURL: '/login',
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message || 'Non è stato possibile inviare il link.');
      return;
    }
    setMessage('Controlla la tua email. Il link scade tra dieci minuti.');
  }

  async function handlePasskey() {
    setPending(true);
    setError(undefined);
    const result = await authClient.signIn.passkey({
      fetchOptions: { onSuccess: () => { window.location.href = '/dashboard'; } },
    });
    setPending(false);
    if (result.error) setError(result.error.message || 'Passkey non riconosciuta.');
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-card-heading">
        <h1 id="login-title">Bentornato.</h1>
        <p>Usa il link email o la passkey registrata.</p>
      </div>
      <form onSubmit={handleMagicLink} className="auth-form">
        <label htmlFor="email">Email autorizzata</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username webauthn"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="nome@dominio.it"
        />
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? 'Invio in corso...' : 'Invia link di accesso'}
        </button>
      </form>
      <div className="auth-divider"><span>oppure</span></div>
      <button className="button button-secondary" type="button" onClick={handlePasskey} disabled={pending}>
        Accedi con passkey
      </button>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {error ? <p className="meet-error" role="alert">{error}</p> : null}
      <p className="auth-footnote">L&apos;accesso è riservato all&apos;organizzatore configurato sul server.</p>
    </section>
  );
}
