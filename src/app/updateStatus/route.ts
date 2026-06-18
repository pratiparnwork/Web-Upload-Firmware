import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostName = searchParams.get('hostName');

    if (!hostName) {
      return new NextResponse('Bad Request.', { status: 400 });
    }

    // ดึงข้อมูลอุปกรณ์จาก KV
    const device = await db.getDevice(hostName);

    // หากอุปกรณ์มีการอัปเดตและมี URL ให้ส่ง URL กลับ
    if (device && device.hasUpdate) {
      if (device.firmwareUrl) {
        return new NextResponse(device.firmwareUrl, { status: 200 });
      }
      // fallback – ส่งข้อความเดิม
      return new NextResponse('Update Available', { status: 200 });
    }

    // ไม่มีอัปเดต
    return new NextResponse('No Update', { status: 200 });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
