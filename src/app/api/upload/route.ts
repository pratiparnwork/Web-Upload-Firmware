import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

const parseStringArray = (json: string | null): string[] | null => {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null;
  } catch {
    return null;
  }
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const macAddressesJson = formData.get('macAddresses') as string | null;
    const hostnamesJson = formData.get('hostnames') as string | null;
    const macAddresses = parseStringArray(macAddressesJson);
    const hostnames = parseStringArray(hostnamesJson);

    if (!macAddresses || !hostnames) {
      return NextResponse.json({ error: 'Invalid selected devices array' }, { status: 400 });
    }

    if (!file || (macAddresses.length === 0 && hostnames.length === 0)) {
      return NextResponse.json({ error: 'Missing file or selected devices' }, { status: 400 });
    }

    // Upload the file once to Vercel Blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(`firmware_${Date.now()}.bin`, buffer, {
      access: 'public',
    });

    // Save the blob URL to all selected devices
    for (const macAddress of macAddresses) {
      await db.setUpdateStatus({ macAddress }, true, blob.url);
    }

    for (const hostname of hostnames) {
      await db.setUpdateStatus({ hostname }, true, blob.url);
    }

    const targetCount = macAddresses.length + hostnames.length;
    return NextResponse.json({ success: true, message: `Update queued for ${targetCount} devices.` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
