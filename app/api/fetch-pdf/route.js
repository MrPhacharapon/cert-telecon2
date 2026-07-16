import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(pdfUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    
    // Return the PDF buffer directly
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error("PDF Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
