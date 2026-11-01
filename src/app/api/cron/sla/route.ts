import { timingSafeEqual } from 'node:crypto';
import { connectToDatabase } from '@/lib/db/connect';
import { runSlaAutomation } from '@/lib/services/sla-automation';

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';
  if (!expected || expected.length < 16 || !authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length);
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return Response.json({ error: 'SLA automation is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    await connectToDatabase();
    const result = await runSlaAutomation();
    return Response.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && /^[A-Z0-9_]+$/.test(String(error.code)) ? ` (${error.code})` : '';
    console.error(`SLA automation failed${code}.`);
    return Response.json({ error: 'SLA automation could not complete. The scheduled job can retry.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
