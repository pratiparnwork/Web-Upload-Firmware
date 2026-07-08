import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // ESP can request `/upload/HOSTNAME_firmware.bin` or `/upload/MAC_firmware.bin`.
    if (!filename.endsWith('_firmware.bin')) {
      return new NextResponse('Invalid firmware filename.', { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const identifier = decodeURIComponent(filename.replace('_firmware.bin', ''));
    const macAddress = searchParams.get('macAddress') || searchParams.get('mac') || searchParams.get('eui') || identifier;
    const device = await db.getDevice({ hostname: identifier, macAddress });

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
