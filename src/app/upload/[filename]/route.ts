import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // ESP expects `/upload/HOSTNAME_firmware.bin`
    if (!filename.endsWith('_firmware.bin')) {
      return new NextResponse('Invalid firmware filename.', { status: 400 });
    }

    const hostname = filename.replace('_firmware.bin', '');
    const device = await db.getDevice(hostname);

    if (!device || !device.firmwareUrl) {
      return new NextResponse('Firmware not found or no update available.', { status: 404 });
    }

    // Redirect the ESP device to the Vercel Blob URL
    return NextResponse.redirect(device.firmwareUrl, 302);
  } catch (error) {
    console.error('Firmware redirect error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
