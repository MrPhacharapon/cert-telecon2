import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let csvUrl = searchParams.get('url');

  if (!csvUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Auto-convert Google Sheets view/edit link to CSV export link
    if (csvUrl.includes('drive.google.com') || csvUrl.includes('docs.google.com')) {
      if (csvUrl.includes('/edit') || csvUrl.includes('/view')) {
        csvUrl = csvUrl.replace(/\/(edit|view).*$/, '/export?format=csv');
      }
    }

    const response = await fetch(csvUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    
    // Return the CSV text directly
    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120'
      },
    });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch CSV through proxy' }, { status: 500 });
  }
}
