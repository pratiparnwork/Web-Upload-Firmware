import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { macAddresses, hostnames, projectName } = body;
    const selectedMacAddresses = Array.isArray(macAddresses)
      ? macAddresses.filter((item): item is string => typeof item === 'string')
      : [];
    const selectedHostnames = Array.isArray(hostnames)
      ? hostnames.filter((item): item is string => typeof item === 'string')
      : [];

    if (typeof projectName !== 'string' || !projectName || (selectedMacAddresses.length === 0 && selectedHostnames.length === 0)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (selectedMacAddresses.length > 0) {
      await db.assignToProjectByMac(selectedMacAddresses, projectName);
    }

    if (selectedHostnames.length > 0) {
      await db.assignToProject(selectedHostnames, projectName);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
