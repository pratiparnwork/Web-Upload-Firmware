import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostName = searchParams.get('hostName') || searchParams.get('hostname');
    const macAddress = searchParams.get('macAddress') || searchParams.get('mac') || searchParams.get('eui');

    if (!hostName && !macAddress) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    await db.setFlashing({ hostname: hostName, macAddress });

    return new NextResponse(`Firmware flashing initiated for ${macAddress || hostName}`, { status: 200 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
