import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostName = searchParams.get('hostName');

    if (!hostName) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    await db.setFlashing(hostName);

    return new NextResponse(`Firmware flashing initiated for ${hostName}`, { status: 200 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
