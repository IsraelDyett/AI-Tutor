// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq, inArray } from 'drizzle-orm';
// import { SpeechClient } from '@google-cloud/speech';
// import { google } from '@google-cloud/speech/build/protos/protos';
// import path from 'path';

// // Initialize the Google Speech Client
// const speechClient = new SpeechClient({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH,
// });

// type AudioEncoding = google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

// function getAudioConfig(fileName: string): { encoding: AudioEncoding, sampleRateHertz?: number } {
//   const extension = path.extname(fileName).toLowerCase();
//   const { AudioEncoding } = google.cloud.speech.v1.RecognitionConfig;

//   switch (extension) {
//     case '.wav':
//       return { encoding: AudioEncoding.LINEAR16 };
//     case '.mp3':
//       return { encoding: AudioEncoding.MP3 };
//     case '.flac':
//       return { encoding: AudioEncoding.FLAC };
//     case '.ogg':
//       return { encoding: AudioEncoding.OGG_OPUS };
//     case '.amr':
//       return { encoding: AudioEncoding.AMR };
//     default:
//       return { encoding: AudioEncoding.ENCODING_UNSPECIFIED };
//   }
// }

// export async function GET(request: NextRequest) {
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   try {
//     const pendingFiles = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.status, 'pending'));

//     if (pendingFiles.length === 0) {
//       return NextResponse.json({ success: true, message: 'No pending files to process.' });
//     }

//     const fileIdsToProcess = pendingFiles.map((file) => file.id);
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'processing' })
//       .where(inArray(transcriptionFiles.id, fileIdsToProcess));
    
//     await Promise.all(
//       pendingFiles.map(async (file) => {
//         try {
//           const audioConfig = getAudioConfig(file.name);
          
//           if (audioConfig.encoding === google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED) {
//             console.log(`File ${file.name} has an unspecified encoding. Letting Google attempt to auto-detect.`);
//           }
          
//           const requestConfig: google.cloud.speech.v1.ILongRunningRecognizeRequest = {
//             audio: { uri: file.url },
//             config: {
//               ...audioConfig,
//               languageCode: 'en-US',
//               model: 'latest_long',
//               enableAutomaticPunctuation: true,

//               // --- START OF THE FIX ---
//               // Tell Google how to handle the stereo audio from the WAV file
//               audioChannelCount: 2,
//               enableSeparateRecognitionPerChannel: true,
//               // --- END OF THE FIX ---
              
//               diarizationConfig: {
//                 enableSpeakerDiarization: true,
//               },
//             },
//           };
          
//           const [operation] = await speechClient.longRunningRecognize(requestConfig);
//           const [response] = await operation.promise();

//           // When using enableSeparateRecognitionPerChannel, the result includes a `channelTag`
//           const transcription = response.results
//             ?.map((result) => {
//                 const channel = result.channelTag;
//                 const text = result.alternatives?.[0]?.transcript || '';
//                 // Format the output to show which channel the text came from
//                 return `[Channel ${channel}]: ${text}`;
//             })
//             .filter(Boolean)
//             .join('\n');

//           await db
//             .update(transcriptionFiles)
//             .set({
//               transcription: transcription || 'Transcription complete, but no text was generated.',
//               status: 'completed',
//             })
//             .where(eq(transcriptionFiles.id, file.id));

//         } catch (error) {
//           console.error(`Failed to transcribe file ID: ${file.id}`, error);
          
//           let errorMessage = 'An unknown error occurred.';
//           if (error instanceof Error) {
//             errorMessage = error.message;
//           }
          
//           await db
//             .update(transcriptionFiles)
//             .set({ status: 'failed', transcription: `Error: ${errorMessage}` })
//             .where(eq(transcriptionFiles.id, file.id));
//         }
//       })
//     );

//     return NextResponse.json({ success: true, message: `Processed ${pendingFiles.length} files.` });

//   } catch (error) {
//     console.error('Error in cron job:', error);
//     return NextResponse.json({ success: false, error: 'Cron job failed.' }, { status: 500 });
//   }
// }

// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq, inArray } from 'drizzle-orm';
// import { SpeechClient } from '@google-cloud/speech';
// import { google } from '@google-cloud/speech/build/protos/protos';
// import path from 'path';

// // Initialize the Google Speech Client
// const speechClient = new SpeechClient({
//   projectId: process.env.GCS_PROJECT_ID,
//   keyFilename: process.env.GCS_KEYFILE_PATH, //GCS_KEYFILE_PATH
// });

// type AudioEncoding = google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

// function getAudioConfig(fileName: string): { encoding: AudioEncoding, sampleRateHertz?: number } {
//   const extension = path.extname(fileName).toLowerCase();
//   const { AudioEncoding } = google.cloud.speech.v1.RecognitionConfig;

//   switch (extension) {
//     case '.wav':
//       return { encoding: AudioEncoding.LINEAR16 };
//     case '.mp3':
//       return { encoding: AudioEncoding.MP3 };
//     case '.flac':
//       return { encoding: AudioEncoding.FLAC };
//     case '.ogg':
//       return { encoding: AudioEncoding.OGG_OPUS };
//     case '.amr':
//       return { encoding: AudioEncoding.AMR };
//     default:
//       return { encoding: AudioEncoding.ENCODING_UNSPECIFIED };
//   }
// }

// export async function GET(request: NextRequest) {
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response('Unauthorized', { status: 401 });
//   }

//   try {
//     const pendingFiles = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.status, 'pending'));

//     if (pendingFiles.length === 0) {
//       return NextResponse.json({ success: true, message: 'No pending files to process.' });
//     }

//     const fileIdsToProcess = pendingFiles.map((file) => file.id);
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'transcript processing' })
//       .where(inArray(transcriptionFiles.id, fileIdsToProcess));
    
//     await Promise.all(
//       pendingFiles.map(async (file) => {
//         try {
//           const audioConfig = getAudioConfig(file.name);
          
//           if (audioConfig.encoding === google.cloud.speech.v1.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED) {
//             console.log(`File ${file.name} has an unspecified encoding. Letting Google attempt to auto-detect.`);
//           }
          
//           const requestConfig: google.cloud.speech.v1.ILongRunningRecognizeRequest = {
//             audio: { uri: file.url },
//             config: {
//               ...audioConfig,
//               languageCode: 'en-US',
//               model: 'latest_long',
//               enableAutomaticPunctuation: true,
//               audioChannelCount: 2,
//               enableSeparateRecognitionPerChannel: true,
//               diarizationConfig: {
//                 enableSpeakerDiarization: true,
//               },
//             },
//           };
          
//           const [operation] = await speechClient.longRunningRecognize(requestConfig);
//           const [response] = await operation.promise();

//           // --- START OF THE FIX ---
//           // Process the response but only save the text from Channel 1
//           const transcription = response.results
//             // 1. Filter the results to ONLY include those from the first channel
//             ?.filter(result => result.channelTag === 1)
//             // 2. Map over the filtered results and extract just the text
//             .map(result => result.alternatives?.[0]?.transcript || '')
//             .filter(Boolean) // This removes any empty strings from the result
//             .join('\n'); // Join the text segments with a newline
//           // --- END OF THE FIX ---

//           await db
//             .update(transcriptionFiles)
//             .set({
//               transcription: transcription || 'Transcription complete, but no text was generated.',
//               //status: 'completed', 
//               status: 'transcript completed',
//             })
//             .where(eq(transcriptionFiles.id, file.id));

//         } catch (error) {
//           console.error(`Failed to transcribe file ID: ${file.id}`, error);
          
//           let errorMessage = 'An unknown error occurred.';
//           if (error instanceof Error) {
//             errorMessage = error.message;
//           }
          
//           await db
//             .update(transcriptionFiles)
//             .set({ status: 'failed', transcription: `Error: ${errorMessage}` })
//             .where(eq(transcriptionFiles.id, file.id));
//         }
//       })
//     );

//     return NextResponse.json({ success: true, message: `Processed ${pendingFiles.length} files.` });

//   } catch (error) {
//     console.error('Error in cron job:', error);
//     return NextResponse.json({ success: false, error: 'Cron job failed.' }, { status: 500 });
//   }
// }




// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db/drizzle';
// import { transcriptionFiles } from '@/lib/db/schema';
// import { eq, inArray } from 'drizzle-orm';
// import { SpeechClient } from '@google-cloud/speech';
// import { google } from '@google-cloud/speech/build/protos/protos';

// // Initialize the Google Speech Client using base64 credentials
// const getSpeechClientConfig = () => {
//   // Use the base64 encoded credentials you have
//   if (process.env.GCP_CREDENTIALS) {
//     try {
//       const credentialsJson = Buffer.from(
//         process.env.GCP_CREDENTIALS, 
//         'base64'
//       ).toString('utf8');
      
//       const credentials = JSON.parse(credentialsJson);
//       console.log("Initializing GCS with base64 credentials");
      
//       return {
//         projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
//         credentials: credentials,
//       };
//     } catch (error) {
//       console.error('Error parsing base64 credentials:', error);
//       throw new Error('Invalid GCP credentials format');
//     }
//   }
  
//   // Fallback to keyfile if base64 not available (for local development)
//   if (process.env.GCS_KEYFILE_PATH) {
//     console.log('Initializing GCS with keyfile from path: ', process.env.GCS_KEYFILE_PATH);
//     return {
//       projectId: process.env.GCS_PROJECT_ID,
//       keyFilename: process.env.GCS_KEYFILE_PATH,
//     };
//   }
  
//   throw new Error('No GCP credentials found');
// };

// const speechClient = new SpeechClient(getSpeechClientConfig());

// interface TranscriptionConfig {
//   encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding;
//   sampleRateHertz?: number;
//   audioChannelCount?: number;
//   enableSeparateRecognitionPerChannel?: boolean;
//   enableSpeakerDiarization?: boolean;
//   model?: string;
//   description: string;
// }

// function getTranscriptionConfigs(url: string): TranscriptionConfig[] {
//   const { AudioEncoding } = google.cloud.speech.v1.RecognitionConfig;
  
//   const urlPath = url.split('?')[0];
//   const extension = urlPath.split('.').pop()?.toLowerCase();
  
//   console.log(`File extension detected: ${extension}`);
  
//   // Return configurations in order of preference - most likely to work first
//   const baseConfigs: TranscriptionConfig[] = [];
  
//   switch (extension) {
//     case 'mp3':
//       baseConfigs.push(
//         // Most basic MP3 config - often most reliable
//         {
//           encoding: AudioEncoding.MP3,
//           model: 'latest_long',
//           description: 'MP3 - Auto-detect everything'
//         },
//         // Try with explicit sample rates
//         {
//           encoding: AudioEncoding.MP3,
//           sampleRateHertz: 44100,
//           model: 'latest_long',
//           description: 'MP3 - 44.1kHz'
//         },
//         {
//           encoding: AudioEncoding.MP3,
//           sampleRateHertz: 48000,
//           model: 'latest_long',
//           description: 'MP3 - 48kHz'
//         },
//         {
//           encoding: AudioEncoding.MP3,
//           sampleRateHertz: 16000,
//           model: 'latest_long',
//           description: 'MP3 - 16kHz'
//         },
//         // Try different models
//         {
//           encoding: AudioEncoding.MP3,
//           model: 'default',
//           description: 'MP3 - Default model'
//         },
//         {
//           encoding: AudioEncoding.MP3,
//           model: 'phone_call',
//           description: 'MP3 - Phone call model'
//         }
//       );
//       break;
      
//     case 'wav':
//       baseConfigs.push(
//         {
//           encoding: AudioEncoding.LINEAR16,
//           model: 'latest_long',
//           description: 'WAV - Auto-detect'
//         },
//         {
//           encoding: AudioEncoding.LINEAR16,
//           sampleRateHertz: 16000,
//           model: 'latest_long',
//           description: 'WAV - 16kHz'
//         },
//         {
//           encoding: AudioEncoding.LINEAR16,
//           sampleRateHertz: 44100,
//           model: 'latest_long',
//           description: 'WAV - 44.1kHz'
//         },
//         {
//           encoding: AudioEncoding.LINEAR16,
//           sampleRateHertz: 48000,
//           model: 'latest_long',
//           description: 'WAV - 48kHz'
//         }
//       );
//       break;
      
//     default:
//       // For unknown formats, try common configurations
//       baseConfigs.push(
//         {
//           encoding: AudioEncoding.MP3,
//           model: 'latest_long',
//           description: `${extension?.toUpperCase() || 'Unknown'} - MP3 fallback`
//         },
//         {
//           encoding: AudioEncoding.LINEAR16,
//           model: 'latest_long',
//           description: `${extension?.toUpperCase() || 'Unknown'} - LINEAR16 fallback`
//         }
//       );
//   }
  
//   // Create variations of each base config
//   const allConfigs: TranscriptionConfig[] = [];
  
//   for (const baseConfig of baseConfigs) {
//     // 1. Basic config (no channel/diarization settings)
//     allConfigs.push({
//       ...baseConfig,
//       description: `${baseConfig.description} - Basic`
//     });
    
//     // 2. With diarization but no channel specification
//     allConfigs.push({
//       ...baseConfig,
//       enableSpeakerDiarization: true,
//       description: `${baseConfig.description} - With diarization`
//     });
    
//     // 3. Mono with diarization
//     allConfigs.push({
//       ...baseConfig,
//       audioChannelCount: 1,
//       enableSpeakerDiarization: true,
//       description: `${baseConfig.description} - Mono + diarization`
//     });
    
//     // 4. Stereo with channel separation
//     allConfigs.push({
//       ...baseConfig,
//       audioChannelCount: 2,
//       enableSeparateRecognitionPerChannel: true,
//       enableSpeakerDiarization: true,
//       description: `${baseConfig.description} - Stereo + separation`
//     });
//   }
  
//   return allConfigs;
// }

// async function attemptTranscriptionWithConfig(
//   file: any,
//   config: TranscriptionConfig
// ): Promise<{ success: boolean; transcription?: string; error?: string }> {
//   try {
//     console.log(`\n🔄 Attempting: ${config.description}`);
//     console.log(`Config details:`, JSON.stringify(config, null, 2));
    
//     const recognitionConfig: google.cloud.speech.v1.IRecognitionConfig = {
//       encoding: config.encoding,
//       languageCode: 'en-US',
//       model: config.model || 'latest_long',
//       enableAutomaticPunctuation: true,
//     };
    
//     // Add optional properties only if they exist
//     if (config.sampleRateHertz) {
//       recognitionConfig.sampleRateHertz = config.sampleRateHertz;
//     }
//     if (config.audioChannelCount) {
//       recognitionConfig.audioChannelCount = config.audioChannelCount;
//     }
//     if (config.enableSeparateRecognitionPerChannel) {
//       recognitionConfig.enableSeparateRecognitionPerChannel = config.enableSeparateRecognitionPerChannel;
//     }
//     if (config.enableSpeakerDiarization) {
//       recognitionConfig.diarizationConfig = {
//         enableSpeakerDiarization: true,
//       };
//     }

//     const requestConfig: google.cloud.speech.v1.ILongRunningRecognizeRequest = {
//       audio: { uri: file.url },
//       config: recognitionConfig,
//     };

//     const [operation] = await speechClient.longRunningRecognize(requestConfig);
//     const [response] = await operation.promise();
    
//     // Process the response
//     let transcription = '';
    
//     if (response.results?.some(result => result.channelTag)) {
//       // Multi-channel: extract from all channels, but prefer channel 1
//       console.log('📻 Multi-channel audio detected');
      
//       // Try channel 1 first
//       const channel1Text = response.results
//         ?.filter(result => result.channelTag === 1)
//         .map(result => result.alternatives?.[0]?.transcript || '')
//         .filter(Boolean)
//         .join(' ');
      
//       // If channel 1 is empty or very short, try all channels
//       if (!channel1Text || channel1Text.trim().length < 10) {
//         console.log('📻 Channel 1 text insufficient, using all channels');
//         transcription = response.results
//           ?.map(result => result.alternatives?.[0]?.transcript || '')
//           .filter(Boolean)
//           .join(' ');
//       } else {
//         transcription = channel1Text;
//       }
//     } else {
//       // Single channel: save all results
//       console.log('📻 Single channel audio');
//       transcription = response.results
//         ?.map(result => result.alternatives?.[0]?.transcript || '')
//         .filter(Boolean)
//         .join(' ') ?? '';
//     }

//     // Clean up the transcription
//     transcription = transcription.trim().replace(/\s+/g, ' ');
    
//     console.log(`📝 Transcription length: ${transcription.length} characters`);
//     console.log(`📝 Preview: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`);
    
//     // Consider it successful if we got a reasonable amount of text
//     if (transcription.length > 20) {
//       console.log(`✅ Success with: ${config.description}`);
//       return { success: true, transcription };
//     } else {
//       console.log(`⚠️  Transcription too short with: ${config.description}`);
//       return { success: false, error: 'Transcription too short' };
//     }
    
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     console.log(`❌ Failed with: ${config.description} - ${errorMessage}`);
//     return { success: false, error: errorMessage };
//   }
// }

// async function transcribeFileWithComprehensiveFallbacks(file: any): Promise<string> {
//   const configs = getTranscriptionConfigs(file.url);
  
//   console.log(`\n🎯 Trying ${configs.length} different configurations for file ${file.id}`);
  
//   let bestResult: { transcription: string; length: number } | null = null;
//   const errors: string[] = [];
  
//   for (let i = 0; i < configs.length; i++) {
//     const config = configs[i];
//     console.log(`\n--- Attempt ${i + 1}/${configs.length} ---`);
    
//     const result = await attemptTranscriptionWithConfig(file, config);
    
//     if (result.success && result.transcription) {
//       const length = result.transcription.length;
      
//       // Keep track of the best result (longest transcription)
//       if (!bestResult || length > bestResult.length) {
//         bestResult = { transcription: result.transcription, length };
//         console.log(`🏆 New best result! Length: ${length}`);
//       }
      
//       // If we got a substantial transcription, we can stop here
//       // But continue if it seems too short (might be better configs ahead)
//       if (length > 100) {
//         console.log(`🎯 Got substantial transcription (${length} chars), using this result`);
//         return result.transcription;
//       }
//     } else {
//       errors.push(`${config.description}: ${result.error}`);
//     }
//   }
  
//   // If we have any result, use the best one
//   if (bestResult) {
//     console.log(`🏆 Using best result: ${bestResult.length} characters`);
//     return bestResult.transcription;
//   }
  
//   // All attempts failed
//   throw new Error(`All transcription attempts failed. Errors: ${errors.join('; ')}`);
// }

// export async function GET(request: NextRequest) {
//   const authHeader = request.headers.get('authorization');
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     console.log('Unauthorized');
//     return new Response('Unauthorized', { status: 401 });
//   }

//   try {
//     const pendingFiles = await db
//       .select()
//       .from(transcriptionFiles)
//       .where(eq(transcriptionFiles.status, 'pending'));

//     if (pendingFiles.length === 0) {
//       console.log('No pending files to process.');
//       return NextResponse.json({ success: true, message: 'No pending files to process.' });
//     }

//     const fileIdsToProcess = pendingFiles.map((file) => file.id);
//     console.log('File IDs to process:', fileIdsToProcess);
    
//     await db
//       .update(transcriptionFiles)
//       .set({ status: 'transcript processing' })
//       .where(inArray(transcriptionFiles.id, fileIdsToProcess));
//     console.log('Files updated to processing status.');
    
//     const results = await Promise.allSettled(
//       pendingFiles.map(async (file) => {
//         try {
//           console.log(`\n🎵 ===== PROCESSING FILE ID: ${file.id} =====`);
//           console.log(`🎵 File URL: ${file.url}`);
          
//           const transcription = await transcribeFileWithComprehensiveFallbacks(file);
          
//           await db
//             .update(transcriptionFiles)
//             .set({
//               transcription: transcription || 'Transcription complete, but no text was generated.',
//               status: 'transcript completed',
//             })
//             .where(eq(transcriptionFiles.id, file.id));

//           console.log(`\n🎉 File ID ${file.id} COMPLETED SUCCESSFULLY`);
//           console.log(`📊 Final transcription length: ${transcription.length} characters`);
          
//           return { fileId: file.id, success: true, transcriptionLength: transcription.length };

//         } catch (error) {
//           console.error(`\n💥 FAILED to transcribe file ID: ${file.id}`, error);
          
//           let errorMessage = 'An unknown error occurred.';
//           if (error instanceof Error) {
//             errorMessage = error.message;
//           }
          
//           await db
//             .update(transcriptionFiles)
//             .set({ status: 'failed', transcription: `Error: ${errorMessage}` })
//             .where(eq(transcriptionFiles.id, file.id));
            
//           return { fileId: file.id, success: false, error: errorMessage };
//         }
//       })
//     );

//     const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
//     const failed = results.length - successful;

//     return NextResponse.json({ 
//       success: true, 
//       message: `Processed ${pendingFiles.length} files. ${successful} successful, ${failed} failed.`,
//       results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
//     });

//   } catch (error) {
//     console.error('Error in cron job:', error);
//     return NextResponse.json({ success: false, error: 'Cron job failed.' }, { status: 500 });
//   }
// }




// ### Updated Code (`app/api/cron/route.ts`)


import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { transcriptionFiles } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Storage, StorageOptions } from '@google-cloud/storage'; // Import StorageOptions
// import ffmpeg from 'fluent-ffmpeg';
// import ffmpegPath from '@ffmpeg-installer/ffmpeg';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if(process.env.OPENAI_API_KEY){
  //console.log("OPENAI_API_KEY true" + process.env.OPENAI_API_KEY )
}

// NEW: Helper function to get GCS configuration from base64 credentials
const getGcsClientConfig = (): StorageOptions => {
  if (!process.env.GCP_CREDENTIALS) {
    throw new Error('GCP_CREDENTIALS environment variable not set.');
  }

  try {
    const credentialsJson = Buffer.from(
      process.env.GCP_CREDENTIALS,
      'base64'
    ).toString('utf8');
    
    const credentials = JSON.parse(credentialsJson);
    console.log("Initializing Google Cloud Storage with base64 credentials.");
    
    return {
      projectId: credentials.project_id,
      credentials,
    };
  } catch (error) {
    console.error('Error parsing base64 GCP credentials:', error);
    throw new Error('Invalid GCP_CREDENTIALS format. Ensure it is a valid base64 encoded JSON key file.');
  }
};

// Initialize the Google Cloud Storage client using the helper function
const storage = new Storage(getGcsClientConfig());


/**
 * Downloads a file from a URL to a temporary local path.
 * This function now supports both public https:// URLs and private gs:// URIs.
 * @param url The URL of the file to download.
 * @returns The local path to the downloaded file.
 */
async function downloadFile(url: string): Promise<string> {
  // This function remains the same as the previous correct version.
  // No changes are needed here.
  let buffer: Buffer;

  if (url.startsWith('gs://')) {
    console.log('Detected GCS URI. Downloading with GCS client...');
    const [bucketName, ...filePathParts] = url.replace('gs://', '').split('/');
    const fileName = filePathParts.join('/');

    const [fileContents] = await storage.bucket(bucketName).file(fileName).download();
    buffer = fileContents;
    
  } else {
    console.log('Detected standard URL. Downloading with fetch...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const anArrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(anArrayBuffer);
  }

  const tempDir = os.tmpdir();
  const extension = url.split('.').pop()?.split('?')[0] || 'tmp';
  const tempFilePath = path.join(tempDir, `${uuidv4()}.${extension}`);

  await fs.promises.writeFile(tempFilePath, buffer);
  console.log(`File downloaded to: ${tempFilePath}`);
  return tempFilePath;
}

/**
 * Transcribes an audio file using OpenAI's Whisper model.
 * @param file The file object containing the URL.
 * @returns The transcribed text.
 */
async function transcribeWithWhisper(file: { url: string }): Promise<string> {
  let tempFilePath: string | null = null;
  try {
    console.log(`\n🔄 Attempting transcription with OpenAI Whisper for URL: ${file.url}`);

    // 1. Download the file from the URL to a temporary local path
    tempFilePath = await downloadFile(file.url);

    // // 2. Transcribe the local audio file
    // const transcription = await openai.audio.transcriptions.create({
    //   file: fs.createReadStream(tempFilePath),
    //   model: 'whisper-1', // Use the whisper-1 model
    // });
    const transcriptionPrompt = "this is a sales conversation between a sales rep and a customer. The conversation is in english with a caribbean accent";


    
    // Prepare the transcription request with accuracy enhancements
    const transcriptionOptions: OpenAI.Audio.TranscriptionCreateParams = {
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en', // **IMPROVEMENT 1: Explicitly set the language**
      //prompt: transcriptionPrompt,
      temperature: 0, // A lower temperature makes the output more deterministic
      //logprob_threshold: -1.0,
      //no_speech_threshold: 0.6,
    };
    
   
    //transcriptionOptions.prompt = "this is a sales conversation between a sales rep and a customer. The conversation is in english with a caribbean accent";
    const transcription = await openai.audio.transcriptions.create(transcriptionOptions);


    let transcribedText = transcription.text.trim();
    console.log(`📝 Preview before prompt removal: "${transcribedText.substring(0, 100)}${transcribedText.length > 100 ? '...' : ''}"`);

    if (transcribedText.toLowerCase().startsWith(transcriptionPrompt.toLowerCase())) {
      console.log('Whisper output started with the prompt. Removing it.');
      // Using replace to only remove the first instance
      transcribedText = transcribedText.substring(transcriptionPrompt.length).trim();
    }

    console.log(`📝 Transcription length: ${transcribedText.length} characters`);
    console.log(`📝 Preview: "${transcribedText.substring(0, 100)}${transcribedText.length > 100 ? '...' : ''}"`);

    if (transcribedText.length > 0) {
      console.log(`✅ Success with Whisper`);
      return transcribedText;
    } else {
      console.log(`⚠️  Transcription was empty with Whisper.`);
      // Return an empty string if Whisper produces no text
      return '';
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`❌ Failed with Whisper: ${errorMessage}`);
    throw new Error(`Whisper transcription failed: ${errorMessage}`);
  } finally {
    // 3. Clean up the temporary file
    if (tempFilePath) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log(`Temporary file ${tempFilePath} deleted.`);
      } catch (cleanupError) {
        console.error(`Failed to delete temporary file ${tempFilePath}:`, cleanupError);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const pendingFiles = await db
      .select()
      .from(transcriptionFiles)
      .where(eq(transcriptionFiles.status, 'pending'));

    if (pendingFiles.length === 0) {
      console.log('No pending files to process.');
      return NextResponse.json({ success: true, message: 'No pending files to process.' });
    }

    const fileIdsToProcess = pendingFiles.map((file) => file.id);
    console.log('File IDs to process:', fileIdsToProcess);

    await db
      .update(transcriptionFiles)
      .set({ status: 'transcript processing' })
      .where(inArray(transcriptionFiles.id, fileIdsToProcess));
    console.log('Files updated to processing status.');

    const results = await Promise.allSettled(
      pendingFiles.map(async (file) => {
        try {
          console.log(`\n🎵 ===== PROCESSING FILE ID: ${file.id} =====`);
          console.log(`🎵 File URL: ${file.url}`);

          const transcription = await transcribeWithWhisper(file);

          await db
            .update(transcriptionFiles)
            .set({
              transcription: transcription || 'Transcription complete, but no text was generated.',
              status: 'transcript completed',
            })
            .where(eq(transcriptionFiles.id, file.id));

          console.log(`\n🎉 File ID ${file.id} COMPLETED SUCCESSFULLY`);
          console.log(`📊 Final transcription length: ${transcription.length} characters`);

          return { fileId: file.id, success: true, transcriptionLength: transcription.length };

        } catch (error) {
          console.error(`\n💥 FAILED to transcribe file ID: ${file.id}`, error);

          let errorMessage = 'An unknown error occurred.';
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          await db
            .update(transcriptionFiles)
            .set({ status: 'failed', transcription: `Error: ${errorMessage}` })
            .where(eq(transcriptionFiles.id, file.id));

          return { fileId: file.id, success: false, error: errorMessage };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingFiles.length} files. ${successful} successful, ${failed} failed.`,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed.' }, { status: 500 });
  }
}