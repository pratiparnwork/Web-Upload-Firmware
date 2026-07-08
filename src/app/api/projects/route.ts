import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await db.getAllProjects();
    return NextResponse.json(projects);
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
