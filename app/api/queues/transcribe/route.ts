// app/api/queues/transcribe/route.ts

// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';
// import { SpeechClient } from '@google-cloud/speech';
// // Import the specific types we need from the library
// import { google } from '@google-cloud/speech/build/protos/protos';

// // Initialize the Speech-to-Text client
// const speechClient = new SpeechClient({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH,
// });

// export async function POST(request: NextRequest) {
//   // 1. Secure the endpoint
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   // 2. Get the fileId from the request body
//   const { fileId } = await request.json();

//   if (!fileId) {
//     return NextResponse.json({ message: 'No file ID provided' }, { status: 400 });
//   }

//   // 3. Begin the transcription process
//   try {
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'processing' })
//       .where(eq(transcriptionFiles.id, fileId));

//     const fileRecord = await db.query.transcriptionFiles.findFirst({
//       where: eq(transcriptionFiles.id, fileId),
//     });

//     if (!fileRecord || !fileRecord.url) {
//       throw new Error(`File record not found or has no URL for ID: ${fileId}`);
//     }

//     const requestConfig = {
//       audio: { uri: fileRecord.url },
//       config: {
//         // FIX #2: Use 'as const' to tell TypeScript this is a literal type
//         encoding: 'MP3' as const,
//         languageCode: 'en-US',
//         enableSpeakerDiarization: true,
//         diarizationSpeakerCount: 2,
//       },
//     };

//     // FIX #1: Correctly await the promise before destructuring
//     const [operation] = await speechClient.longRunningRecognize(requestConfig);
//     const [response] = await operation.promise();

//     // FIX #3: Provide an explicit type for the 'result' parameter
//     const transcription = response.results
//       ?.map((result: google.cloud.speech.v1.ISpeechRecognitionResult) => {
//           const speakerTag = result.alternatives?.[0].words?.[0].speakerTag;
//           const text = result.alternatives?.[0].transcript;
//           return `Speaker ${speakerTag || 'Unknown'}: ${text}`;
//       })
//       .join('\n');

//     await db
//       .update(transcriptionFiles)
//       .set({
//         transcription: transcription || 'Transcription complete, no text generated.',
//         status: 'completed',
//       })
//       .where(eq(transcriptionFiles.id, fileId));

//     return NextResponse.json({ success: true, message: `File ${fileId} transcribed.` });

//   } catch (error) {
//     console.error(`Error transcribing file ${fileId}:`, error);
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'failed' })
//       .where(eq(transcriptionFiles.id, fileId));

//     return NextResponse.json({ success: false, error: 'Transcription failed.' }, { status: 500 });
//   }
// }


// app/api/queues/transcribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles, teamUsage } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { SpeechClient } from '@google-cloud/speech';
import { google } from '@google-cloud/speech/build/protos/protos';
import { getUser } from '@/lib/db/queries'; // <--- Import the user query function


const speechClient = new SpeechClient({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEYFILE_PATH,    //GCS_KEYFILE_PATH
});

export async function POST(request: NextRequest) {
    // --- Secure Authentication: Check for an active user session ---
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

  const { fileId } = await request.json();
  if (!fileId) {
    return NextResponse.json({ message: 'No file ID provided' }, { status: 400 });
  }

  try {
    await db
      .update(transcriptionFiles)
      .set({ status: 'transcript processing' })
      .where(eq(transcriptionFiles.id, fileId));

    const fileRecord = await db.query.transcriptionFiles.findFirst({
      where: eq(transcriptionFiles.id, fileId),
    });

    if (!fileRecord || !fileRecord.url) {
      throw new Error(`File record not found or has no URL for ID: ${fileId}`);
    }

    const requestConfig = {
      audio: { uri: fileRecord.url },
      config: {
        encoding: 'MP3' as const, // Or another encoding if needed
        languageCode: 'en-US',
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 2,
      },
    };

    const [operation] = await speechClient.longRunningRecognize(requestConfig);
    const [response] = await operation.promise();

    // --- Start of The Fix ---
    const transcription = response.results
      ?.map((result: google.cloud.speech.v1.ISpeechRecognitionResult) => {
        const alternative = result.alternatives?.[0];
        if (!alternative) return ''; // Skip if there are no alternatives

        const text = alternative.transcript || '';
        // Safely access the speakerTag. If words array is missing or empty, this will be undefined.
        const speakerTag = alternative.words?.[0]?.speakerTag;

        return `Speaker ${speakerTag || 'Unknown'}: ${text}`;
      })
      // Filter out any empty strings from results that had no alternatives
      .filter(line => line.length > 0)
      .join('\n');
    // --- End of The Fix ---

    await db
      .update(transcriptionFiles)
      .set({
        transcription: transcription || 'Transcription complete, but no text was generated.',
        status: 'completed',
      })
      .where(eq(transcriptionFiles.id, fileId));

    return NextResponse.json({ success: true, message: `File ${fileId} transcribed.` });

  } catch (error) {
    console.error(`Error transcribing file ${fileId}:`, error);
    await db
      .update(transcriptionFiles)
      .set({ status: 'failed' })
      .where(eq(transcriptionFiles.id, fileId));

    return NextResponse.json({ success: false, error: 'Transcription failed.' }, { status: 500 });
  }
}