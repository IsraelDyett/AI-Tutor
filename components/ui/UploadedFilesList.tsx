'use client';

import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';

// Define a type for our transcription files
type TranscriptionFile = {
  name: string;
  url:string;
};

// Create a fetcher function for SWR to use
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// This component is now self-contained and reusable
export function UploadedFilesList() {
  const {
    data: files,
    error,
    isLoading,
  } = useSWR<TranscriptionFile[]>('/api/transcriptions', fetcher);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
        <CardDescription>
          Listen to your previously uploaded media files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading files...</p>}
        {error && (
           <p className="text-red-500">Error loading files. Please try again later.</p>
        )}
        {files && files.length > 0 && (
          <ul className="space-y-4">
            {files.map((transcriptionFile) => (
              <li
                key={transcriptionFile.name}
                className="p-4 border rounded-lg"
              >
                <p className="font-medium mb-2">{transcriptionFile.name}</p>
                <audio controls src={transcriptionFile.url} className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </li>
            ))}
          </ul>
        )}
        {files && files.length === 0 && !isLoading && (
          <p className="text-gray-500">No files have been uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}