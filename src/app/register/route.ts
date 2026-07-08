import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const data = text.trim().split('\n');
    
    if (data.length < 5) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    const hostName = data[0].trim();
    const firmwareVersion = data[1].trim();
    const macAddress = data[2].trim();
    const wifiSignalStrength = parseInt(data[3].trim());
    const ipAddress = data[4].trim();

    if (!hostName || !firmwareVersion || !macAddress || isNaN(wifiSignalStrength) || !ipAddress) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    await db.registerDevice(hostName, firmwareVersion, macAddress, wifiSignalStrength, ipAddress);

    return new NextResponse(`Registered device ${hostName} successfully.`, { status: 200 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
