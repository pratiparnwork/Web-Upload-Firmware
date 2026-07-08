import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Disable caching for this route so it always returns fresh data
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const devices = await db.getAllDevices();
    return NextResponse.json(devices);
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { macAddresses, hostnames } = body;
    const selectedMacAddresses = Array.isArray(macAddresses)
      ? macAddresses.filter((item): item is string => typeof item === 'string')
      : [];
    const selectedHostnames = Array.isArray(hostnames)
      ? hostnames.filter((item): item is string => typeof item === 'string')
      : [];

    if (selectedMacAddresses.length === 0 && selectedHostnames.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (selectedMacAddresses.length > 0) {
      await db.removeDevicesByMac(selectedMacAddresses);
    }

    if (selectedHostnames.length > 0) {
      await db.removeDevices(selectedHostnames);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
