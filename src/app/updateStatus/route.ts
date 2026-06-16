import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostName = searchParams.get('hostName');

    if (!hostName) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    const hasUpdate = db.checkUpdateStatus(hostName);

    if (hasUpdate) {
      return new NextResponse('Update Available', { status: 200 });
    } else {
      return new NextResponse('No Update', { status: 200 });
    }
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
