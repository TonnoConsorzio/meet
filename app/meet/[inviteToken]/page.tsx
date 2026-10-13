import { notFound } from 'next/navigation';
import { PageClientImpl } from '@/app/rooms/[roomName]/PageClientImpl';
import { isVideoCodec } from '@/lib/types';
import { getMeetingByInviteToken } from '@/lib/meeting-store';

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<{ hq?: string; codec?: string; singlePC?: string }>;
}) {
  const { inviteToken } = await params;
  const query = await searchParams;
  const invite = getMeetingByInviteToken(inviteToken);
  if (!invite || invite.status !== 'active') notFound();

  return (
    <PageClientImpl
      inviteToken={inviteToken}
      meetingTitle={invite.title}
      hq={query.hq === 'true'}
      codec={typeof query.codec === 'string' && isVideoCodec(query.codec) ? query.codec : 'vp9'}
      singlePeerConnection={query.singlePC !== 'false'}
    />
  );
}
