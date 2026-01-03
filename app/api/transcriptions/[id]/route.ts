// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db'; // Adjust this to your actual db import
// import { transcriptionFiles } from '@/lib/db/schema'; // Adjust this to your actual schema import
// import { eq } from 'drizzle-orm';

// export async function GET(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   const id = parseInt(params.id, 10);

//   if (isNaN(id)) {
//     return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
//   }

//   try {
//     const transcription = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.id, id))
//       .limit(1);

//     if (transcription.length === 0) {
//       return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
//     }

//     return NextResponse.json(transcription[0]);
//   } catch (error) {
//     console.error('Error fetching transcription:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }













// // app/api/transcriptions/[id]/route.ts

// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db'; // Adjust this to your actual db import
// import { transcriptionFiles } from '@/lib/db/schema'; // Adjust this to your actual schema import
// import { eq } from 'drizzle-orm';
// import { Storage } from '@google-cloud/storage'; // --- 1. IMPORT STORAGE
// import { getUserWithTeam } from '@/lib/db/queries';


// // --- 2. INITIALIZE GOOGLE CLOUD STORAGE ---
// // Make sure these environment variables are available
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH,
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);


// export async function GET(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   const id = parseInt(params.id, 10);

//   if (isNaN(id)) {
//     return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
//   }

//   try {
//     // --- 3. FETCH THE RAW FILE DATA ---
//     const results = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.id, id))
//       .limit(1);

//     if (results.length === 0) {
//       return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
//     }

//     const fileRecord = results[0];

//     // --- 4. GENERATE THE SIGNED URL ---
//     // Get the filename from the "gs://..." uri
//     const gcsFileName = fileRecord.url.split('/').pop();

//     let signedUrl = ''; // Default to empty string

//     if (gcsFileName) {
//         const options = {
//             version: 'v4' as const,
//             action: 'read' as const,
//             expires: Date.now() + 15 * 60 * 1000, // 15 minutes
//         };

//         // Generate the secure, temporary HTTPS URL
//         [signedUrl] = await bucket.file(gcsFileName).getSignedUrl(options);
//     }
    
//     // --- 5. COMBINE AND RETURN THE DATA ---
//     // Create a new object containing all original data, but overwrite the url field
//     const responseData = {
//         ...fileRecord,
//         url: signedUrl,
//     };

//     return NextResponse.json(responseData);

//   } catch (error) {
//     console.error('Error fetching transcription:', error);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }




// app/api/transcriptions/[id]/route.ts

// app/api/transcriptions/[id]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles, managerComments  } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Storage } from '@google-cloud/storage';
import { bucket } from '@/lib/gcs'; // Adjust the import path based on your project structure

// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

export async function GET(
  request: NextRequest,
  context: any
  // { params }: { params: { id: string } }
) {
  const { params } = context as { params: { id: string } };
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  if (!bucket.name) {
    throw new Error('Google Cloud Storage bucket is not initialized. Check server logs for details.');
  }

  try {
    // --- Start of The Fix: Use relational query to include comments ---
    const fileRecord = await db.query.transcriptionFiles.findFirst({
      where: eq(transcriptionFiles.id, id),
      with: {
        // "comments" is the relation name you defined in your schema
        comments: {
          with: {
            // "author" is the relation name from the comments table to the users table
            author: {
              columns: {
                id: true,
                name: true, // Fetch the author's name and ID
              },
            },
          },
           // --- Start of The Fix: Simplify the orderBy call ---
           orderBy: [asc(managerComments.createdAt)],
           // --- End of The Fix ---
        },
      },
    });
    // --- End of The Fix ---

    if (!fileRecord) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    const gcsFileName = fileRecord.url.split('/').pop();
    let signedUrl = fileRecord.url; // Default to the gs:// URL

    if (gcsFileName) {
        try {
            const options = {
                version: 'v4' as const,
                action: 'read' as const,
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            };
            [signedUrl] = await bucket.file(gcsFileName).getSignedUrl(options);
        } catch (urlError) {
            console.error(`Could not generate signed URL for ${gcsFileName}. The object may not exist.`, urlError);
            // Keep the gs:// URL so the app doesn't crash, but log the error
        }
    }
    
    const responseData = {
        ...fileRecord,
        url: signedUrl,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}