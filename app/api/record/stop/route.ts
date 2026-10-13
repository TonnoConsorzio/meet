import { EgressClient } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-server';
import { getMeetingByRoomName } from '@/lib/meeting-store';

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const roomName = req.nextUrl.searchParams.get('roomName');
    if ((origin && origin !== req.nextUrl.origin) || !(await getAdminSession())) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!roomName || !getMeetingByRoomName(roomName)) {
      return new NextResponse('Meeting not found', { status: 404 });
    }
    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return new NextResponse('LiveKit is not configured', { status: 503 });
    }
    const hostURL = new URL(LIVEKIT_URL);
    hostURL.protocol = 'https:';
    const egressClient = new EgressClient(hostURL.origin, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const activeEgresses = (await egressClient.listEgress({ roomName })).filter((info) => info.status < 2);
    if (activeEgresses.length === 0) return new NextResponse('No active recording found', { status: 404 });
    await Promise.all(activeEgresses.map((info) => egressClient.stopEgress(info.egressId)));
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Recording stop failed', error);
    return new NextResponse('Recording could not be stopped', { status: 500 });
  }
}
