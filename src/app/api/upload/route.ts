import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'upload');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save the file for each selected hostname
    for (const hostname of hostnames) {
      const fileName = `${hostname}_firmware.bin`;
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      
      // Mark as having an update ready
      db.setUpdateStatus(hostname, true);
    }

    return NextResponse.json({ success: true, message: `Update queued for ${hostnames.length} devices.` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
