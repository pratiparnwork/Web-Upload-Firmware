import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hostnames, projectName } = body;

    if (!hostnames || !projectName || !Array.isArray(hostnames)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await db.assignToProject(hostnames, projectName);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
