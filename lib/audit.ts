import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';

export async function writeAuditLog(event: string, userId?: string, metadata?: Record<string, unknown>) {
  try {
    db.prepare(
      'INSERT INTO audit_log (id, event, user_id, created_at, metadata) VALUES (?, ?, ?, ?, ?)',
    ).run(randomUUID(), event, userId ?? null, Date.now(), metadata ? JSON.stringify(metadata) : null);
  } catch (error) {
    console.error('Audit log write failed', error);
  }
}
