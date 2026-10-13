# Alessio Bellan Meet

Piattaforma privata per videoriunioni basata su Next.js, LiveKit Cloud, Better Auth e SQLite.

Il progetto è il fork personalizzato di [LiveKit Meet](https://github.com/livekit-examples/meet), adattato all'identità di Alessio Bellan.

## Funzioni

- Accesso dell'organizzatore con magic link o passkey.
- Nessuna registrazione pubblica.
- Creazione di riunioni riservata all'indirizzo configurato in `ADMIN_EMAIL`.
- Inviti senza account per i partecipanti.
- Revoca degli inviti e gestione dello stato della riunione.
- Massimo cinque partecipanti per stanza.
- Logo del brand presente nelle pagine pubbliche e durante la riunione.
- SQLite persistente e Docker standalone per una VPS singola.

## Requisiti

- Node.js 24+
- pnpm 10+
- Credenziali LiveKit Cloud
- Chiave Resend per il magic link

## Sviluppo locale

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Apri `http://localhost:3000`.

Per il primo accesso configura almeno:

```env
BETTER_AUTH_SECRET=una-stringa-casuale-di-almeno-32-caratteri
ADMIN_EMAIL=alessiobellan@ik.me
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://tuo-progetto.livekit.cloud
RESEND_API_KEY=...
EMAIL_FROM=Alessio Bellan Meet <noreply@tuodominio.it>
```

Il database viene inizializzato automaticamente in `DATABASE_PATH`. In locale il valore predefinito è `./data/meet.sqlite`.

## Percorsi principali

- `/` homepage pubblica.
- `/login` accesso dell'organizzatore.
- `/dashboard` dashboard privata.
- `/meet/:inviteToken` ingresso degli invitati.
- `/api/meetings` creazione e lettura delle riunioni protette.
- `/api/invites/:token` verifica dell'invito.
- `/api/connection-details` emissione del token LiveKit limitato alla stanza.

## Deploy Docker

1. Copia `.env.example` in `.env.production` e inserisci valori reali.
2. Imposta `APP_URL` e `BETTER_AUTH_URL` sull'URL HTTPS pubblico.
3. Avvia il servizio:

```bash
docker compose up -d --build
```

Il volume `meet-data` conserva SQLite tra gli aggiornamenti. Usa un reverse proxy HTTPS davanti al container e fai un backup del volume prima di ogni deploy.

## Verifica

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
node scripts/browser-check.mjs
```

I test browser verificano homepage e login su desktop e mobile, overflow, errori console e risposte delle API non autenticata. Una verifica WebRTC completa richiede credenziali LiveKit e dispositivi reali o browser configurati.

## Sicurezza

- Le API di creazione sono protette lato server.
- I token LiveKit sono brevi e limitati alla stanza autorizzata.
- Gli inviti sono casuali, memorizzati e revocabili.
- Better Auth applica origini fidate, cookie sicuri, rate limiting e audit log.
- Non inserire segreti in Git, Dockerfile o immagini.

Per il modello delle minacce vedi [meet-threat-model.md](./meet-threat-model.md).

## Repository

Fork: [TonnoConsorzio/meet](https://github.com/TonnoConsorzio/meet)
