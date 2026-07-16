import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent caching

const GAS_URL = "https://script.google.com/macros/s/AKfycbwMImClKhKO9p7c1wfIvZ_4-HJ7Xw85BHnbVB-VnyOul_THS3MFxltqASaBLjCVOhcQbw/exec";

export async function GET() {
  try {
    const res = await fetch(GAS_URL, { cache: 'no-store' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If it's not JSON, there might be an error or redirect issue
      console.error("Failed to parse GAS response as JSON:", text);
      throw new Error("Invalid response from GAS");
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Send data to GAS
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const text = await res.text();
    return NextResponse.json({ success: true, result: text });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
