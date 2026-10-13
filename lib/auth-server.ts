import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!session || !adminEmail || session.user.email.trim().toLowerCase() !== adminEmail) {
    return null;
  }

  return session;
}
