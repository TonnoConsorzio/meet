'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import { ConnectionDetails } from '@/lib/types';
import {
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';

const CONN_DETAILS_ENDPOINT =
  process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? '/api/connection-details';
const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU === 'true';

export function PageClientImpl(props: {
  inviteToken: string;
  meetingTitle?: string | null;
  hq: boolean;
  codec: VideoCodec;
  singlePeerConnection: boolean;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices>();
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails>();
  const [error, setError] = React.useState<string>();
  const preJoinDefaults = React.useMemo(
    () => ({ username: '', videoEnabled: true, audioEnabled: true }),
    [],
  );

  const handlePreJoinSubmit = React.useCallback(
    async (values: LocalUserChoices) => {
      setError(undefined);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.set('inviteToken', props.inviteToken);
      url.searchParams.set('participantName', values.username);

      try {
        const response = await fetch(url, { cache: 'no-store' });
        const data = (await response.json()) as ConnectionDetails & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Impossibile preparare la riunione.');
        setPreJoinChoices(values);
        setConnectionDetails(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Errore di connessione.');
      }
    },
    [props.inviteToken],
  );

  return (
    <main data-lk-theme="default" className="meet-shell">
      <BrandBug />
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div className="prejoin-wrap">
          <div className="prejoin-heading">
            <h1>{props.meetingTitle || 'Sei stato invitato a una riunione'}</h1>
            <p>Inserisci il tuo nome e controlla audio e video prima di entrare.</p>
          </div>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={(joinError) => setError(joinError instanceof Error ? joinError.message : 'Controlla i dispositivi.')}
          />
          {error ? <p className="meet-error" role="alert">{error}</p> : null}
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq, singlePeerConnection: props.singlePeerConnection }}
        />
      )}
    </main>
  );
}

function BrandBug() {
  return (
    <Link className="brand-bug" href="/" aria-label="Alessio Bellan Meet">
      <Image src="/brand/alessio-bellan-mark.png" alt="" aria-hidden="true" width={44} height={44} priority />
    </Link>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: { hq: boolean; codec: VideoCodec; singlePeerConnection: boolean };
}) {
  const keyProvider = React.useMemo(() => new ExternalE2EEKeyProvider(), []);
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);
  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);
  const router = useRouter();

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec || 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) videoCodec = undefined;
    const videoCaptureDefaults: VideoCaptureOptions = {
      deviceId: props.userChoices.videoDeviceId ?? undefined,
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    return {
      videoCaptureDefaults,
      publishDefaults,
      audioCaptureDefaults: { deviceId: props.userChoices.audioDeviceId ?? undefined },
      adaptiveStream: true,
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: props.options.singlePeerConnection,
    };
  }, [e2eeEnabled, keyProvider, props.options, props.userChoices, worker]);

  const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const handleError = React.useCallback((error: Error) => console.error(error), []);
  const handleEncryptionError = React.useCallback((error: Error) => console.error(error), []);

  React.useEffect(() => {
    if (!e2eeEnabled) {
      setE2eeSetupComplete(true);
      return;
    }
    keyProvider
      .setKey(decodePassphrase(e2eePassphrase))
      .then(() => room.setE2EEEnabled(true))
      .then(() => setE2eeSetupComplete(true))
      .catch(handleError);
  }, [e2eeEnabled, e2eePassphrase, handleError, keyProvider, room]);

  const connectOptions = React.useMemo<RoomConnectOptions>(() => ({ autoSubscribe: true }), []);

  React.useEffect(() => {
    if (!e2eeSetupComplete) return;
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);
    void room
      .connect(props.connectionDetails.serverUrl, props.connectionDetails.participantToken, connectOptions)
      .then(async () => {
        if (props.userChoices.videoEnabled) await room.localParticipant.setCameraEnabled(true);
        if (props.userChoices.audioEnabled) await room.localParticipant.setMicrophoneEnabled(true);
      })
      .catch(handleError);

    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
      void room.disconnect();
    };
  }, [connectOptions, e2eeSetupComplete, handleEncryptionError, handleError, handleOnLeave, props.connectionDetails, props.userChoices, room]);

  useLowCPUOptimizer(room);

  return (
    <div className="lk-room-container">
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
          SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
        />
        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}
