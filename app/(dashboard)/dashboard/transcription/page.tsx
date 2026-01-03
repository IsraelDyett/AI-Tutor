'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { UserUploadedFilesList } from '@/components/ui/UserUploadedFilesList';
import { TeamUploadedFilesList } from '@/components/ui/TeamUploadedFilesList';
import { User } from '@/lib/db/schema'; // Import the User type

// --- Start of The Fix ---
// Add a fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());
// --- End of The Fix ---

export default function TranscriptionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  
  // --- Start of The Fix ---
  // Fetch the current user's data
  const { data: user } = useSWR<User>('/api/user', fetcher);
  // Determine if the user is an owner
  const isOwner = user?.role === 'owner';
  // --- End of The Fix ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadError(null);
      setUploadSuccess(null);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(0);

    try {
      // --- Step 1: Get the signed URL (this is still fast and needs to be awaited) ---
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, type: file.type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get an upload URL.');
      }
      
      const { uploadUrl, file: newFileRecord } = await response.json();

      if (!uploadUrl) {
        throw new Error('Server failed to provide a valid upload URL.');
      }
      
      // --- Step 2: The "Fire and Forget" Upload ---
      // We create the request but we DON'T await it.
      // The UI will update immediately while this runs in the background.
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      // --- These event handlers will update the state in the background ---
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        // The upload is complete.
        if (xhr.status >= 200 && xhr.status < 300) {
          // The main success message is already shown. Here we just finalize the state.
          // We can set progress to 100 and then stop the loading state.
          setUploadProgress(100);
          setIsUploading(false); // This will hide the progress bar and re-enable the button
          
          // Optionally, clear the success message after a few seconds
          setTimeout(() => setUploadSuccess(null), 5000);
        } else {
           // Handle a failure that occurs after the upload completes.
          setUploadError(`Upload failed with status: ${xhr.status}.`);
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        // Handle network errors, CORS issues, etc.
        setUploadError('An error occurred during the file upload. Check network or CORS settings.');
        setIsUploading(false); // Stop loading on error
        setUploadProgress(0); // Reset progress
      };

      // Start the upload. The code below will execute immediately.
      xhr.send(file);

      // --- Step 3: Immediate UI Feedback ---
      // These updates now happen instantly after the upload starts.
      setFile(null); // Clear the file input
      setUploadSuccess(`Uploading "${newFileRecord.name}"...`); // Show an initial success message
      
      // Re-fetch the file lists. The new file will appear instantly with a "pending" status.
      mutate('/api/transcriptions/user');
      mutate('/api/transcriptions/team');

    } catch (err: any) {
      // This catch block now primarily handles errors from getting the signed URL.
      setUploadError(err.message || 'Failed to start upload. Please try again.');
      setIsUploading(false); // Ensure we stop loading on pre-upload failure
      console.error(err);
    }
    // Note: We no longer have a `finally` block because `isUploading` is now managed
    // by the `onload` and `onerror` event handlers.
  };

  return (
    <section className="flex-1 p-4 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Upload an audio or video file to be transcribed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!file ? (
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  id="file-upload"
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept="audio/*,video/*,.m4a,.mp3,.wav"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center justify-center space-y-2 text-gray-500">
                  <UploadCloud className="h-10 w-10" />
                  <p className="font-medium">
                    <span className="text-orange-500">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-sm">Supports MP3, WAV, MP4, etc.</p>
                </div>
              </div>
            ) : (
              <div className="w-full p-4 border border-gray-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <File className="h-6 w-6 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {file.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {uploadError && (
              <p className="text-sm text-red-500">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="text-sm text-green-500">{uploadSuccess}</p>
            )}

            {/* The progress bar is now driven entirely by the background process */}
            {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {`Uploading... ${Math.round(uploadProgress)}%`}
                </>
              ) : (
                'Upload and Transcribe'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

       {/* --- Start of The Fix --- */}
      {/* Dynamically adjust the grid columns and render TeamUploadedFilesList only for owners */}
      <div className={`grid gap-6 ${isOwner ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <UserUploadedFilesList />
        {isOwner && <TeamUploadedFilesList />}
      </div>
      {/* --- End of The Fix --- */}
    </section>
  );
}