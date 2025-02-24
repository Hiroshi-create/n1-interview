import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
}

export async function POST(req: NextRequest) {
  try {
    const {  }: RequestBody = await req.json();

    return NextResponse.json({}, { status: 201 });
  } catch (error: unknown) {
    console.error(':', error);
    return NextResponse.json({ message: '' }, { status: 500 });
  }
}
