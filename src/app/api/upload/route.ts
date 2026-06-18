import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const hostnamesJson = formData.get('hostnames') as string | null;

    if (!file || !hostnamesJson) {
      return NextResponse.json({ error: 'Missing file or hostnames' }, { status: 400 });
    }

    const hostnames: string[] = JSON.parse(hostnamesJson);
    if (!Array.isArray(hostnames) || hostnames.length === 0) {
      return NextResponse.json({ error: 'Invalid hostnames array' }, { status: 400 });
    }

    // Upload the file once to Vercel Blob
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(`firmware_${Date.now()}.bin`, buffer, {
      access: 'public',
    });

    // Save the blob URL to all selected devices
    for (const hostname of hostnames) {
      await db.setUpdateStatus(hostname, true, blob.url);
    }

    return NextResponse.json({ success: true, message: `Update queued for ${hostnames.length} devices.` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
