import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { db } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

const appUrl = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
  throw new Error('BETTER_AUTH_SECRET must be set to a random value of at least 32 characters.');
}

const resendApiKey = process.env.RESEND_API_KEY;

export const auth = betterAuth({
  database: db,
  secret: secret ?? 'local-development-only-secret-change-me',
  baseURL: appUrl,
  trustedOrigins: [appUrl],
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/sign-in/magic-link': { window: 60, max: 5 },
      '/sign-in/passkey': { window: 60, max: 5 },
    },
  },
  advanced: {
    disableCSRFCheck: false,
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        after: async ({ data }) => {
          const session = data as { userId?: string };
          await writeAuditLog('session.created', session.userId);
        },
      },
      delete: {
        before: async ({ data }) => {
          const session = data as { userId?: string };
          await writeAuditLog('session.revoked', session.userId);
        },
      },
    },
    user: {
      create: {
        before: async ({ data }) => {
          const user = data as { email?: string };
          if (!adminEmail || user.email?.trim().toLowerCase() !== adminEmail) {
            return false;
          }
          return true;
        },
        after: async ({ data }) => {
          const user = data as { id?: string };
          await writeAuditLog('user.created', user.id);
        },
      },
      update: {
        after: async ({ data, oldData }) => {
          const user = data as { id?: string; email?: string };
          const previous = oldData as { email?: string } | undefined;
          if (previous?.email !== user.email) {
            await writeAuditLog('user.email_changed', user.id);
          }
        },
      },
    },
    account: {
      create: {
        after: async (data) => {
          const account = data as { userId?: string; providerId?: string };
          await writeAuditLog('account.linked', account.userId, { provider: account.providerId });
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        if (!resendApiKey) {
          throw new Error('Email delivery is not configured. Set RESEND_API_KEY before requesting a link.');
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? 'Alessio Bellan Meet <onboarding@resend.dev>',
            to: [email],
            subject: 'Accedi ad Alessio Bellan Meet',
            html: `<p>Apri questo link per accedere:</p><p><a href="${url}">${url}</a></p>`,
          }),
        });

        if (!response.ok) {
          throw new Error('Email delivery failed. Check the configured email provider.');
        }
      },
    }),
    passkey({
      rpID: new URL(appUrl).hostname,
      rpName: 'Alessio Bellan Meet',
      origin: appUrl,
    }),
  ],
});
