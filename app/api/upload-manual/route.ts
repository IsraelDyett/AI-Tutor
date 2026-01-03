import { NextResponse } from 'next/server';

// NOTE: We are no longer importing ANY third-party libraries for file processing.

// The direct URL to the Cloudmersive API endpoint
const CLOUDMERSIVE_API_URL = 'https://api.cloudmersive.com/convert/autodetect/to/txt';

// Set a maximum file size (e.g., 10MB) to prevent abuse
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY;

  if (!apiKey) {
    console.error('Cloudmersive API key is not configured.');
    return NextResponse.json(
      { error: 'File processing service is not configured on the server.' },
      { status: 500 }
    );
  }
  
  try {

    const requestFormData = await request.formData();
    const file = requestFormData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` }, { status: 400 });
    }

    // We need to create a new FormData object to send to the external API
    const apiFormData = new FormData();
    apiFormData.append('inputFile', file);

    // Make the request using the standard `fetch` API
    const response = await fetch(CLOUDMERSIVE_API_URL, {
      method: 'POST',
      headers: {
        'Apikey': apiKey,
        // IMPORTANT: Do NOT set 'Content-Type'. `fetch` will do it automatically
        // for FormData, including the required boundary string.
      },
      body: apiFormData,
    });

    if (!response.ok) {
      // Try to get more detailed error information from the API response
      const errorBody = await response.json();
      console.error('Cloudmersive API Error:', errorBody);
      throw new Error(errorBody.ErrorDetails || `File processing failed with status: ${response.status}`);
    }

    const result = await response.json();
    const extractedText = result.TextResult;

    if (!extractedText) {
      return NextResponse.json({ error: 'Could not extract any text from the document.' }, { status: 500 });
    }

    return NextResponse.json({ text: extractedText });

  } catch (error: any) {
    console.error('Error in file upload handler:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while processing the file.' },
      { status: 500 }
    );
  }
}