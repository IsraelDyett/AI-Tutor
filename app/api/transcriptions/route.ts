import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { bucket } from '@/lib/gcs'; // Adjust the import path based on your project structure


// // Re-initialize the storage client (or you can share it from a common module)
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });

// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

export async function GET() {
  if (!bucket.name) {
    throw new Error('Google Cloud Storage bucket is not initialized. Check server logs for details.');
  }

  try {
    // Options for the signed URL
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    // List all files in the bucket
    const [files] = await bucket.getFiles();

    // Generate a signed URL for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl(options);
        return {
          name: file.name,
          url: url,
        };
      })
    );

    return NextResponse.json(filesWithUrls);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list files.' },
      { status: 500 }
    );
  }
}