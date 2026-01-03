// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { getTeamForUser } from '@/lib/db/queries'; // Corrected Path

// export async function GET() {
//   try {
//     const team = await getTeamForUser();
//     if (!team) {
//       return new NextResponse('Team not found', { status: 404 });
//     }

//     const files = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.teamId, team.id));

//     return NextResponse.json(files);
//   } catch (error) {
//     console.error('Error fetching team files:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';
import { Storage } from '@google-cloud/storage'; // <-- Import Storage
import { bucket } from '@/lib/gcs'; // Adjust the import path based on your project structure

// --- Start of The Fix ---

// // Initialize Google Cloud Storage (should be the same as your other routes)
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// --- End of The Fix ---

export async function GET() {
  try {
    const team = await getTeamForUser();
    if (!team) {
      // It's better to return a 401 Unauthorized or 404 Not Found if no team is associated
      return new NextResponse('Unauthorized or no team found for user', { status: 401 });
    }

    if (!bucket.name) {
      throw new Error('Google Cloud Storage bucket is not initialized. Check server logs for details.');
    }

    // 1. Fetch file records from the database for the team
    const filesFromDb = await db
      .select()
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.teamId, team.id));

    // --- Start of The Fix ---

    // 2. Generate a signed URL for each file
    const filesWithSignedUrls = await Promise.all(
      filesFromDb.map(async (file) => {
        // Extract just the file name from the GCS URI stored in the DB
        const gcsFileName = file.url.split('/').pop();

        if (!gcsFileName) {
          return { ...file, url: '' }; // Handle potential malformed URL
        }

        const options = {
          version: 'v4' as const,
          action: 'read' as const,
          expires: Date.now() + 15 * 60 * 1000, // 15-minute read access
        };

        // Generate the secure, temporary HTTPS URL
        const [signedUrl] = await bucket.file(gcsFileName).getSignedUrl(options);

        // Return a new object with the playable URL
        return { ...file, url: signedUrl };
      })
    );
    
    // 3. Return the list of files with playable URLs
    return NextResponse.json(filesWithSignedUrls);

    // --- End of The Fix ---

  } catch (error) {
    console.error('Error fetching team files:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}