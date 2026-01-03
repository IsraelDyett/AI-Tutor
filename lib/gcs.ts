import { Storage, Bucket } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';

let storage: Storage;
let bucket: Bucket;
let speechClient: SpeechClient; // <-- Add SpeechClient

try {
  let credentials;

  if (process.env.GCP_CREDENTIALS) {
    console.log('Initializing GCS with credentials from environment variable.');
    const decoded = Buffer.from(process.env.GCP_CREDENTIALS, 'base64').toString('utf-8');
    credentials = JSON.parse(decoded);
  } else if (process.env.GCS_KEYFILE_PATH) {
    console.log(`Initializing GCS with keyfile from path: ${process.env.GCS_KEYFILE_PATH}`);
    // If using keyFilename, credentials object isn't needed for the constructor
  } else {
    throw new Error('GCS credentials not found.');
  }

  const config = {
    projectId: process.env.GCS_PROJECT_ID,
    // Conditionally add credentials OR keyFilename
    ...(credentials ? { credentials } : { keyFilename: process.env.GCS_KEYFILE_PATH }),
  };

  storage = new Storage(config);
  speechClient = new SpeechClient(config); // <-- Initialize it here too

  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME not set.');
  bucket = storage.bucket(bucketName);

} catch (error) {
  console.error('Failed to initialize Google Cloud clients:', error);
  // Create dummy objects to prevent crashes on import
  storage = {} as Storage;
  bucket = {} as Bucket;
  speechClient = {} as SpeechClient;
}

// Export all the clients you need
export { storage, bucket, speechClient };