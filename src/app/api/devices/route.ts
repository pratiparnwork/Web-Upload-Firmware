import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Disable caching for this route so it always returns fresh data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const devices = await db.getAllDevices();
    return NextResponse.json(devices);
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { hostnames } = body;
    if (!hostnames || !Array.isArray(hostnames)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    await db.removeDevices(hostnames);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
