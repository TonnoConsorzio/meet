import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth-server';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  return <DashboardClient email={session.user.email} />;
}
