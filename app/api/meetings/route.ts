import { RoomServiceClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-server';
import { createMeeting, deleteMeeting, listMeetings, MAX_PARTICIPANTS } from '@/lib/meeting-store';

export const dynamic = 'force-dynamic';

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function getLiveKitApi() {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return null;
  return new RoomServiceClient(
    LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'),
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
}

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
  }
  return NextResponse.json({ meetings: listMeetings() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || !(await getAdminSession())) {
    return NextResponse.json({ error: 'Richiesta non autorizzata.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (title.length > 120) {
    return NextResponse.json({ error: 'Il titolo è troppo lungo.' }, { status: 400 });
  }

  const livekit = getLiveKitApi();
  if (!livekit) {
    return NextResponse.json({ error: 'LiveKit non è configurato sul server.' }, { status: 503 });
  }

  const { meeting, inviteToken } = createMeeting(title || null);
  try {
    await livekit.createRoom({
      name: meeting.roomName,
      maxParticipants: MAX_PARTICIPANTS,
      emptyTimeout: 10 * 60,
    });
  } catch (error) {
    deleteMeeting(meeting.id);
    console.error('LiveKit room creation failed', error);
    return NextResponse.json({ error: 'La stanza LiveKit non è stata creata.' }, { status: 502 });
  }

  return NextResponse.json(
    {
      meeting: { ...meeting, inviteUrl: `${request.nextUrl.origin}/meet/${inviteToken}` },
    },
    { status: 201 },
  );
}
