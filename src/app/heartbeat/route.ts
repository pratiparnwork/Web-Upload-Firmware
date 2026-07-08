import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const macAddressParamNames = ['macAddress', 'mac', 'eui'];

const getMacAddress = (searchParams: URLSearchParams) => (
  macAddressParamNames.map(name => searchParams.get(name)).find(Boolean)
);

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = await req.text();
    const [hostNameFromBody, macAddressFromBody] = text.trim().split(/\r?\n/).map(part => part.trim());
    const hostName = searchParams.get('hostName') || searchParams.get('hostname') || hostNameFromBody;
    const macAddress = getMacAddress(searchParams) || macAddressFromBody;

    if (!hostName && !macAddress) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    await db.updateHeartbeat({ hostname: hostName, macAddress });

    return new NextResponse(`Heartbeat received from ${macAddress || hostName}.`, { status: 200 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
