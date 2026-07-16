import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Automatically convert Google Drive view links to direct download links
    let fetchUrl = pdfUrl;
    if (pdfUrl.includes('drive.google.com')) {
      const idMatch = pdfUrl.match(/[-\w]{25,}/);
      if (idMatch) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${idMatch[0]}`;
      }
    }

    const response = await fetch(fetchUrl, { cache: 'no-store' });
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
