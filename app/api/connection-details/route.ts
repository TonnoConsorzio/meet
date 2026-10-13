import { randomBytes } from 'node:crypto';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getMeetingByInviteToken, MAX_PARTICIPANTS } from '@/lib/meeting-store';

export const dynamic = 'force-dynamic';

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function GET(request: NextRequest) {
  const inviteToken = request.nextUrl.searchParams.get('inviteToken');
  const participantName = request.nextUrl.searchParams.get('participantName')?.trim();

  if (!inviteToken || !participantName) {
    return NextResponse.json({ error: 'Invito e nome sono obbligatori.' }, { status: 400 });
  }
  if (participantName.length > 80 || /[\u0000-\u001f\u007f]/.test(participantName)) {
    return NextResponse.json({ error: 'Il nome non è valido.' }, { status: 400 });
  }
  if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
    return NextResponse.json({ error: 'LiveKit non è configurato sul server.' }, { status: 503 });
  }

  const meeting = getMeetingByInviteToken(inviteToken);
  if (!meeting || meeting.status !== 'active') {
    return NextResponse.json({ error: 'Questo invito non è più disponibile.' }, { status: 404 });
  }

  const participantToken = await createParticipantToken(
    {
      identity: `guest-${randomBytes(10).toString('hex')}`,
      name: participantName,
    },
    meeting.roomName,
  );

  return NextResponse.json(
    {
      serverUrl: LIVEKIT_URL,
      roomName: meeting.roomName,
      participantToken,
      participantName,
      maxParticipants: MAX_PARTICIPANTS,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

async function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const accessToken = new AccessToken(API_KEY, API_SECRET, userInfo);
  accessToken.ttl = '5m';
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  accessToken.addGrant(grant);
  return accessToken.toJwt();
}
