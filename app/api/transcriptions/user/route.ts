
// // import { NextResponse } from 'next/server';
// // import { Storage } from '@google-cloud/storage';
// // import { db } from '@/lib/db';
// // import { transcriptions } from '@/lib/db/schema';
// // import { eq } from 'drizzle-orm';
// // import { getSession } from '@/lib/auth';

// // const storage = new Storage({ /* ... GCS config ... */ });
// // const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// // export async function GET() {
// //   const session = await getSession();
// //   if (!session?.team?.id) {
// //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //   }

// //   try {
// //     const teamFiles = await db.select()
// //       .from(transcriptions)
// //       .where(eq(transcriptions.teamId, session.team.id));

// //     const options = { version: 'v4' as const, action: 'read' as const, expires: Date.now() + 15 * 60 * 1000 };
    
// //     const filesWithUrls = await Promise.all(
// //       teamFiles.map(async (file) => {
// //         const [url] = await bucket.file(file.fileName).getSignedUrl(options);
// //         return { name: file.fileName, url };
// //       })
// //     );

// //     return NextResponse.json(filesWithUrls);
// //   } catch (error) {
// //     console.error('Error fetching team files:', error);
// //     return NextResponse.json({ error: 'Failed to fetch files.' }, { status: 500 });
// //   }
// // }

// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle'; // Corrected Path
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { getUser } from '@/lib/db/queries'; // Corrected Path

// export async function GET() {
//   try {
//     const user = await getUser();
//     if (!user) {
//       return new NextResponse('Unauthorized', { status: 401 });
//     }

//     const files = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.userId, user.id));

//     return NextResponse.json(files);
//   } catch (error) {
//     console.error('Error fetching user files:', error);
//     return new NextResponse('Internal Server Error', { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { Storage } from '@google-cloud/storage';
import { bucket } from '@/lib/gcs'; // Adjust the import path based on your project structure

// --- Start of The Fix ---

// // Initialize Google Cloud Storage
// // This should be the same configuration as your upload route
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// --- End of The Fix ---


export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!bucket.name) {
      throw new Error('Google Cloud Storage bucket is not initialized. Check server logs for details.');
    }

    // 1. Fetch the file records from the database
    const filesFromDb = await db
      .select()
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.userId, user.id));

    // --- Start of The Fix ---

    // 2. Generate a signed URL for each file
    const filesWithSignedUrls = await Promise.all(
      filesFromDb.map(async (file) => {
        // The GCS URI is stored in file.url, e.g., "gs://bucket-name/file-name.wav"
        // We need to extract just the file name.
        const gcsFileName = file.url.split('/').pop();

        if (!gcsFileName) {
          // Return the file as-is but with an empty URL if the format is unexpected
          return { ...file, url: '' };
        }

        const options = {
          version: 'v4' as const,
          action: 'read' as const,
          expires: Date.now() + 15 * 60 * 1000, // Grant 15 minutes of read access
        };

        // Generate the secure, temporary HTTPS URL
        const [signedUrl] = await bucket.file(gcsFileName).getSignedUrl(options);

        // Return a new object with all original file data but with the new signed URL
        return { ...file, url: signedUrl };
      })
    );
    
    // 3. Return the list of files with the playable URLs
    return NextResponse.json(filesWithSignedUrls);

    // --- End of The Fix ---

  } catch (error) {
    console.error('Error fetching user files and generating signed URLs:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}