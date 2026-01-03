

// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { getUser, getTeamForUser } from '@/lib/db/queries';
// import { Storage } from '@google-cloud/storage';

// // Initialize Google Cloud Storage
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH,
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// export async function POST(request: Request) {
//   // --- 1. Authentication & Validation ---
//   const user = await getUser();
//   if (!user) {
//     return new NextResponse('Unauthorized', { status: 401 });
//   }

//   const team = await getTeamForUser();
//   if (!team) {
//     return new NextResponse('Team not found for the current user', { status: 404 });
//   }

//   const formData = await request.formData();
//   const file = formData.get('file') as File;

//   if (!file) {
//     return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
//   }

//   try {
//     // --- 2. Upload File to Permanent Storage (GCS) ---
//     // Sanitize the filename to be GCS-friendly
//     const gcsFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
//     const gcsFile = bucket.file(gcsFileName);

//     // Stream the file to the bucket
//     const stream = gcsFile.createWriteStream({
//       metadata: { contentType: file.type },
//     });
//     const buffer = Buffer.from(await file.arrayBuffer());
//     stream.end(buffer);

//     // This is the URI the Google Speech-to-Text API needs
//     const gcsUri = `gs://${bucket.name}/${gcsFileName}`;

//     // --- 3. Create a Database Record ---
//     // The record is created with a 'pending' status so the frontend can show a loading state.
//     const [newFileRecord] = await db
//       .insert(transcriptionFiles)
//       .values({
//         name: file.name,
//         url: gcsUri, // Store the internal GCS URI
//         userId: user.id,
//         teamId: team.id,
//         status: 'pending',
//       })
//       .returning();

//     // // --- 4. Trigger the Background Job (The Queue) ---
//     // // Make a secure, server-to-server request to our worker endpoint.
//     // fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/queues/transcribe`, {
//     //   method: 'POST',
//     //   headers: {
//     //     'Content-Type': 'application/json',
//     //     // This secret ensures only our application can trigger the job
//     //     Authorization: `Bearer ${process.env.CRON_SECRET}`,
//     //   },
//     //   body: JSON.stringify({
//     //     // Pass the database ID of the file to be processed
//     //     fileId: newFileRecord.id,
//     //   }),
//     // });

//     // --- 5. Return a Quick Response to the User ---
//     // The user gets an immediate success message; they don't wait for the transcription.
//    // return NextResponse.json({ success: true, file: newFileRecord });
//     return NextResponse.json({
//         success: true,
//         uploadUrl: gcsUri,
//         file: newFileRecord,
//       });

//   } catch (error) {
//     console.error('Error in upload process:', error);
//     return NextResponse.json(
//       { error: 'Failed to start upload process.' },
//       { status: 500 }
//     );
//   }
// }

// // import { NextResponse } from 'next/server';
// // import { db } from '@/lib/db/drizzle';
// // import { transcriptionFiles } from '@/lib/db/schema';
// // import { getUser, getTeamForUser } from '@/lib/db/queries';
// // import { Storage } from '@google-cloud/storage';

// // const storage = new Storage({
// //   projectId: process.env.GCS_PROJECT_ID,
// //   keyFilename: process.env.GCS_KEYFILE_PATH,
// // });
// // const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// // export async function POST(request: Request) {
// //   const user = await getUser();
// //   if (!user) {
// //     return new NextResponse('Unauthorized', { status: 401 });
// //   }
// //   const team = await getTeamForUser();
// //   if (!team) {
// //     return new NextResponse('Team not found for the current user', { status: 404 });
// //   }
// //   const formData = await request.formData();
// //   const file = formData.get('file') as File;
// //   if (!file) {
// //     return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
// //   }

// //   try {
// //     const gcsFileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
// //     const gcsFile = bucket.file(gcsFileName);
// //     const buffer = Buffer.from(await file.arrayBuffer());

// //     // --- Start of The Fix ---
// //     // Wrap the stream upload in a Promise to await its completion
// //     await new Promise<void>((resolve, reject) => {
// //       const stream = gcsFile.createWriteStream({
// //         metadata: { contentType: file.type },
// //       });

// //       stream.on('finish', () => {
// //         // The file has been successfully uploaded.
// //         resolve();
// //       });

// //       stream.on('error', (err) => {
// //         // An error occurred during the upload.
// //         reject(err);
// //       });

// //       // Start the upload by writing the buffer.
// //       stream.end(buffer);
// //     });
// //     // --- End of The Fix ---

// //     // Now that we've awaited the upload, we know the file exists in GCS.
// //     // The rest of the code can now run safely.
// //     const gcsUri = `gs://${bucket.name}/${gcsFileName}`;

// //     const [newFileRecord] = await db
// //       .insert(transcriptionFiles)
// //       .values({
// //         name: file.name,
// //         url: gcsUri,
// //         userId: user.id,
// //         teamId: team.id,
// //         status: 'pending',
// //       })
// //       .returning();

// //     // Trigger the queue *after* the upload is confirmed complete.
// //     fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/queues/transcribe`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         Authorization: `Bearer ${process.env.CRON_SECRET}`,
// //       },
// //       body: JSON.stringify({
// //         fileId: newFileRecord.id,
// //       }),
// //     });

// //     return NextResponse.json({ success: true, file: newFileRecord });
// //   } catch (error) {
// //     console.error('Error in upload process:', error);
// //     return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 });
// //   }
// // }










// import { NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { getUser, getTeamForUser } from '@/lib/db/queries';
// import { Storage } from '@google-cloud/storage';

// // Initialize Google Cloud Storage
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH,
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

// export async function POST(request: Request) {
//   try {
//     // --- 1. Authentication & Get File Info ---
//     const user = await getUser();
//     if (!user) {
//       return new NextResponse('Unauthorized', { status: 401 });
//     }
//     const team = await getTeamForUser();
//     if (!team) {
//       return new NextResponse('Team not found for the current user', { status: 404 });
//     }

//     // Get the filename and type from the client request
//     const { name: fileName, type: fileType } = await request.json();
//     if (!fileName || !fileType) {
//         return NextResponse.json({ success: false, error: 'File name and type are required.' }, { status: 400 });
//     }

//     // --- 2. Prepare GCS File and Signed URL ---
//     // Sanitize and create a unique filename to avoid overwrites
//     const gcsFileName = `${Date.now()}-${fileName.replace(/\s/g, '_')}`;
//     const gcsFile = bucket.file(gcsFileName);
//     const gcsUri = `gs://${bucket.name}/${gcsFileName}`;

//     // Generate a v4 signed URL for a 'write' operation
//     const options = {
//       version: 'v4' as const,
//       action: 'write' as const,
//       expires: Date.now() + 15 * 60 * 1000, // 15-minute expiry
//       contentType: fileType,
//     };
//     const [uploadUrl] = await gcsFile.getSignedUrl(options);

//     // --- 3. Create a Database Record ---
//     const [newFileRecord] = await db
//       .insert(transcriptionFiles)
//       .values({
//         name: fileName,
//         url: gcsUri, // Store the permanent GCS URI
//         userId: user.id,
//         teamId: team.id,
//         status: 'pending', // Status is pending until transcription is done
//       })
//       .returning();

//     // --- 4. Return URL and file record to client ---
//     return NextResponse.json({
//         success: true,
//         uploadUrl: uploadUrl, // The temporary URL for the client to use
//         file: newFileRecord,
//       });

//   } catch (error) {
//     console.error('Error in GCS signed URL generation:', error);
//     return NextResponse.json(
//       { success: false, error: 'Failed to start upload process.' },
//       { status: 500 }
//     );
//   }
// }















// app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
// --- Add teamUsage to your imports ---
import { transcriptionFiles, teamUsage, plans } from '@/lib/db/schema';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { Storage } from '@google-cloud/storage';
import { eq, sql  } from 'drizzle-orm';
import { bucket } from '@/lib/gcs'; // Adjust the import path based on your project structure

// // Initialize Google Cloud Storage
// const storage = new Storage({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });
// const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);

export async function POST(request: Request) {
  try {
    // --- 1. Authentication & Get File Info ---
    const user = await getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const team = await getTeamForUser();
    if (!team) {
      return new NextResponse('Team not found for the current user', { status: 404 });
    }

    if (!bucket.name) {
      throw new Error('Google Cloud Storage bucket is not initialized. Check server logs for details.');
    }

    // --- 2. Get the transcript limit from the team's plan in the DB ---
    const planResult = await db
      .select({
        // ASSUMPTION: Your 'plans' table has a 'transcript_limit' column
        limit: plans.transcript_uploads_limit,
      })
      .from(plans)
      .where(eq(plans.name, team.planName as string ?? ''))
      .limit(1);

    if (planResult.length === 0) {
      return NextResponse.json({ success: false, error: `Invalid plan configured for your team.` }, { status: 400 });
    }
    
    // The limit is now dynamic
    const maxTranscripts = planResult[0].limit;



    // --- 2. Check Usage Against Limits ---
    // const maxTranscripts = parseInt(process.env.MAX_TRANSCRIPT_LIMIT || '20'); // Get limit from .env


    const currentUsage = await db.query.teamUsage.findFirst({
        where: eq(teamUsage.teamId, team.id),
//columns: { isTranscriptLimitReached: true }
    });

    // if (currentUsage?.isTranscriptLimitReached) {
    //     return NextResponse.json(
    //         { success: false, error: 'You have reached your monthly transcript upload limit.' },
    //         { status: 403 } // 403 Forbidden is a good status code here
    //     );
    // }

    // Block the upload if the team has reached its transcript limit.
    if (currentUsage && currentUsage.transcriptsUploaded >= maxTranscripts) {
        return NextResponse.json(
            { success: false, error: 'You have reached your monthly transcript upload limit.' },
            { status: 403 } // 403 Forbidden is an appropriate status code
        );
    }
    
    // --- End of The Fix ---
    

    const { name: fileName, type: fileType } = await request.json();
    if (!fileName || !fileType) {
        return NextResponse.json({ success: false, error: 'File name and type are required.' }, { status: 400 });
    }

    // --- 3. Prepare GCS File and Signed URL (only if limit is not reached) ---
    const gcsFileName = `${Date.now()}-${fileName.replace(/\s/g, '_')}`;
    const gcsFile = bucket.file(gcsFileName);
    const gcsUri = `gs://${bucket.name}/${gcsFileName}`;

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000,
      contentType: fileType,
    };
    const [uploadUrl] = await gcsFile.getSignedUrl(options);

    // --- 4. Create a Database Record ---
    const [newFileRecord] = await db
      .insert(transcriptionFiles)
      .values({
        name: fileName,
        url: gcsUri,
        userId: user.id,
        teamId: team.id,
        status: 'pending',
      })
      .returning();


    // --- Start of The Fix ---

    // --- 3. Update the Usage Count (After successful file record creation) ---
    // This happens after the main work is done, so it doesn't slow down the user response.
    // We don't need to `await` this, it can run in the background.
    const newTranscriptCountExpr = sql`${teamUsage.transcriptsUploaded} + 1`;
    db.update(teamUsage)
      .set({
        transcriptsUploaded: newTranscriptCountExpr,
        isTranscriptLimitReached: sql`${newTranscriptCountExpr} >= ${maxTranscripts}`,
        updatedAt: new Date()
      })
      .where(eq(teamUsage.teamId, team.id)).catch(console.error); // Log errors if the update fails
    
    // --- End of The Fix ---

    return NextResponse.json({
        success: true,
        uploadUrl: uploadUrl,
        file: newFileRecord,
      });

  } catch (error) {
    console.error('Error in GCS signed URL generation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start upload process.' },
      { status: 500 }
    );
  }
}