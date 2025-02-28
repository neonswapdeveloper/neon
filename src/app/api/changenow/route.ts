import { NextRequest, NextResponse } from 'next/server';

const API_KEY = 'f2ff07ba2116b356f3482c7f206d41b098e3866510bc8d718aa268f45df9eb8b';
const API_URL = 'https://api.changenow.io/v1';

export async function GET(request: NextRequest) {
  try {
    // Get the endpoint from the query parameters
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    // Build the URL
    const url = `${API_URL}/${endpoint}`;
    
    // Add API key to query parameters if not already present
    const params = new URLSearchParams(searchParams);
    params.delete('endpoint'); // Remove the endpoint parameter
    
    if (!params.has('api_key')) {
      params.append('api_key', API_KEY);
    }
    
    // Make the request to the ChangeNOW API
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'x-changenow-api-key': API_KEY,
      },
      cache: 'no-store',
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error in ChangeNOW API proxy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the endpoint from the query parameters
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    // Build the URL
    const url = `${API_URL}/${endpoint}`;
    
    // Get the request body
    const body = await request.json();
    
    // Make the request to the ChangeNOW API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-changenow-api-key': API_KEY,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error in ChangeNOW API proxy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 