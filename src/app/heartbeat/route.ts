import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const hostName = await req.text();
    const cleanHostName = hostName.trim();

    if (!cleanHostName) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    await db.updateHeartbeat(cleanHostName);

    return new NextResponse(`Heartbeat received from ${cleanHostName}.`, { status: 200 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
