import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-server';
import { getMeetingById, revokeMeeting } from '@/lib/meeting-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Richiesta non autorizzata.' }, { status: 403 });
  }
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  }

  const { id } = await params;
  if (!getMeetingById(id)) {
    return NextResponse.json({ error: 'Riunione non trovata.' }, { status: 404 });
  }
  revokeMeeting(id);
  return NextResponse.json({ ok: true });
}
