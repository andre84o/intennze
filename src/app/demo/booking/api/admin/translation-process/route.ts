import { NextResponse } from 'next/server';

// This endpoint exists solely to silence 404 errors from browser extensions or cached requests
// It appears something external (browser extension, cached request, etc.) is polling this endpoint
export async function GET() {
  return NextResponse.json({
    status: 'not_implemented',
    message: 'Translation process endpoint not implemented in this application'
  }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({
    status: 'not_implemented',
    message: 'Translation process endpoint not implemented in this application'
  }, { status: 200 });
}
