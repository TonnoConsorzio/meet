import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ emailConfigured: Boolean(process.env.RESEND_API_KEY) }, { headers: { 'Cache-Control': 'no-store' } });
}
