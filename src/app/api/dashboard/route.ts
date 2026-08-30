import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dashboard = await db.getDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
