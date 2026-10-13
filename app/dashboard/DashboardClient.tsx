'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';

type Meeting = {
  id: string;
  title: string | null;
  status: 'active' | 'revoked' | 'ended';
  createdAt: number;
  inviteUrl?: string;
};

export function DashboardClient({ email }: { email: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [latestInvite, setLatestInvite] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function loadMeetings() {
    const response = await fetch('/api/meetings', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossibile caricare le riunioni.');
    const data = (await response.json()) as { meetings: Meeting[] };
    setMeetings(data.meetings);
  }

  useEffect(() => {
    loadMeetings().catch((loadError) => setError(loadError.message));
  }, []);

  async function createMeeting() {
    setPending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as { meeting?: Meeting; error?: string };
      if (!response.ok || !data.meeting?.inviteUrl) throw new Error(data.error ?? 'Riunione non creata.');
      setLatestInvite(data.meeting.inviteUrl);
      setTitle('');
      setMessage('Riunione creata. Copia il link e invialo al cliente.');
      await loadMeetings();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Riunione non creata.');
    } finally {
      setPending(false);
    }
  }

  async function revokeMeeting(id: string) {
    const response = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Impossibile revocare l’invito.');
      return;
    }
    await loadMeetings();
    setMessage('Invito revocato.');
  }

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage('Link copiato.');
  }

  async function registerPasskey() {
    setPending(true);
    setError(undefined);
    const result = await authClient.passkey.addPasskey({ name: 'Alessio Bellan Meet' });
    setPending(false);
    if (result.error) setError(result.error.message || 'Passkey non registrata.');
    else setMessage('Passkey registrata su questo dispositivo.');
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-nav">
        <Link className="brand-logo" href="/" aria-label="Alessio Bellan Meet"><Image src="/brand/alessio-bellan-mark.png" alt="" aria-hidden="true" width={36} height={36} priority /><span>Alessio Bellan <strong>Meet</strong></span></Link>
        <div className="dashboard-account"><span>{email}</span><button onClick={() => authClient.signOut().then(() => { window.location.href = '/'; })}>Esci</button></div>
      </header>

      <section className="dashboard-intro">
        <div><h1>Le tue riunioni.</h1><p>Prepara un incontro e condividi il link.</p></div>
        <button className="button button-secondary compact" onClick={registerPasskey} disabled={pending}>Registra passkey</button>
      </section>

      <section className="create-panel" aria-labelledby="new-meeting-title">
        <div><h2 id="new-meeting-title">Crea una riunione</h2><p>Gli inviti sono revocabili e ogni stanza ammette fino a cinque persone.</p></div>
        <div className="create-form"><label htmlFor="meeting-title">Titolo <span>(facoltativo)</span></label><div className="create-row"><input id="meeting-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="es. Revisione identità visiva" maxLength={120} /><button className="button button-primary" onClick={createMeeting} disabled={pending}>{pending ? 'Creazione...' : 'Crea riunione'}</button></div></div>
      </section>

      {latestInvite ? <section className="invite-callout" aria-live="polite"><div><p>{latestInvite}</p></div><button className="button button-primary" onClick={() => copyInvite(latestInvite)}>Copia link</button></section> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {error ? <p className="meet-error" role="alert">{error}</p> : null}

        <section className="meeting-list" aria-labelledby="meeting-list-title"><div className="section-heading"><h2 id="meeting-list-title">Riunioni create</h2><span>{meetings.length}</span></div>{meetings.length === 0 ? <p className="empty-state">Nessuna riunione ancora. Crea il primo invito qui sopra.</p> : <div className="meeting-rows">{meetings.map((meeting) => <article className="meeting-row" key={meeting.id}><div><strong>{meeting.title || 'Riunione senza titolo'}</strong><span>{new Date(meeting.createdAt).toLocaleDateString('it-IT')} · {meeting.status === 'active' ? 'Invito attivo' : 'Invito revocato'}</span></div><div className="meeting-actions">{meeting.status === 'active' ? <button className="text-button danger" onClick={() => revokeMeeting(meeting.id)}>Revoca</button> : <span className="status-muted">Chiuso</span>}</div></article>)}</div>}</section>
    </main>
  );
}
