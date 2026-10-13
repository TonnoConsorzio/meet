import { EgressClient, EncodedFileOutput, S3Upload } from 'livekit-server-sdk';
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

    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, S3_KEY_ID, S3_KEY_SECRET, S3_BUCKET, S3_ENDPOINT, S3_REGION } = process.env;
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL || !S3_KEY_ID || !S3_KEY_SECRET || !S3_BUCKET) {
      return new NextResponse('Recording storage is not configured', { status: 503 });
    }
    const hostURL = new URL(LIVEKIT_URL);
    hostURL.protocol = 'https:';
    const egressClient = new EgressClient(hostURL.origin, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const existingEgresses = await egressClient.listEgress({ roomName });
    if (existingEgresses.some((egress) => egress.status < 2)) {
      return new NextResponse('Meeting is already being recorded', { status: 409 });
    }

    const fileOutput = new EncodedFileOutput({
      filepath: `${new Date().toISOString()}-${roomName}.mp4`,
      output: { case: 's3', value: new S3Upload({ endpoint: S3_ENDPOINT, accessKey: S3_KEY_ID, secret: S3_KEY_SECRET, region: S3_REGION, bucket: S3_BUCKET }) },
    });
    await egressClient.startRoomCompositeEgress(roomName, { file: fileOutput }, { layout: 'speaker' });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Recording start failed', error);
    return new NextResponse('Recording could not be started', { status: 500 });
  }
}
