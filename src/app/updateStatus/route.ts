import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostName = searchParams.get('hostName') || searchParams.get('hostname');
    const macAddress = searchParams.get('macAddress') || searchParams.get('mac') || searchParams.get('eui');

    if (!hostName && !macAddress) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    const device = await db.getDevice({ hostname: hostName, macAddress });

    // หากอุปกรณ์มีการอัปเดตและมี URL ให้ส่ง URL กลับ
    if (device?.hasUpdate) {
      if (device.firmwareUrl) {
        return new NextResponse(device.firmwareUrl, { status: 200 });
      }
      // fallback – ส่งข้อความเดิม
      return new NextResponse('Update Available', { status: 200 });
    }

    return new NextResponse('No Update', { status: 200 });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
