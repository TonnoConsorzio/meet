import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';

export const MAX_PARTICIPANTS = 5;

export type Meeting = {
  id: string;
  roomName: string;
  title: string | null;
  status: 'active' | 'revoked' | 'ended';
  createdAt: number;
};

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function toMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: String(row.id),
    roomName: String(row.room_name),
    title: row.title === null ? null : String(row.title),
    status: row.status as Meeting['status'],
    createdAt: Number(row.created_at),
  };
}

export function createMeeting(title: string | null) {
  const id = randomUUID();
  const roomName = `alessio-${randomBytes(12).toString('hex')}`;
  const inviteToken = randomBytes(32).toString('base64url');
  const createdAt = Date.now();

  db.prepare(
    `INSERT INTO meetings (id, room_name, title, invite_token_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, roomName, title, hashInviteToken(inviteToken), createdAt);

  return { meeting: { id, roomName, title, status: 'active' as const, createdAt }, inviteToken };
}

export function listMeetings() {
  const rows = db.prepare('SELECT * FROM meetings ORDER BY created_at DESC').all() as Record<
    string,
    unknown
  >[];
  return rows.map(toMeeting);
}

export function getMeetingById(id: string) {
  const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? toMeeting(row) : null;
}

export function getMeetingByRoomName(roomName: string) {
  const row = db.prepare('SELECT * FROM meetings WHERE room_name = ?').get(roomName) as
    | Record<string, unknown>
    | undefined;
  return row ? toMeeting(row) : null;
}

export function getMeetingByInviteToken(inviteToken: string) {
  const row = db
    .prepare('SELECT * FROM meetings WHERE invite_token_hash = ?')
    .get(hashInviteToken(inviteToken)) as Record<string, unknown> | undefined;
  return row ? toMeeting(row) : null;
}

export function revokeMeeting(id: string) {
  const result = db
    .prepare("UPDATE meetings SET status = 'revoked', revoked_at = ? WHERE id = ? AND status = 'active'")
    .run(Date.now(), id);
  return result.changes > 0;
}

export function deleteMeeting(id: string) {
  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
}
