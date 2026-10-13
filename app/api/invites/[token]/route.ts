import { NextResponse } from 'next/server';
import { getMeetingByInviteToken } from '@/lib/meeting-store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const meeting = getMeetingByInviteToken(token);

  if (!meeting || meeting.status !== 'active') {
    return NextResponse.json({ error: 'Questo invito non è più disponibile.' }, { status: 404 });
  }

  return NextResponse.json(
    { title: meeting.title, status: meeting.status },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
