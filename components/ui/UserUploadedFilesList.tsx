// 'use client';

// import useSWR from 'swr';
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription
// } from '@/components/ui/card';

// // Expanded type to match the data from the API
// type TranscriptionFile = {
//   id: string; // Use the unique ID for keys
//   name: string;
//   url: string; // This will now be the signed HTTPS URL
//   status: 'pending' | 'processing' | 'completed' | 'failed';
//   // Add any other fields you might want to display
// };

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// export function UserUploadedFilesList() {
//   const {
//     data: files,
//     error,
//     isLoading
//   } = useSWR<TranscriptionFile[]>('/api/transcriptions/user', fetcher);

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>My Uploaded Files</CardTitle>
//         <CardDescription>
//           Listen to the media files you have uploaded.
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         {isLoading && <p>Loading files...</p>}
//         {error && (
//           <p className="text-red-500">
//             Error loading files. Please try again later.
//           </p>
//         )}
//         {files && files.length > 0 && (
//           <ul className="space-y-4">
//             {files.map((file) => (
//               // Use file.id for the key for better reliability
//               <li key={file.id} className="p-4 border rounded-lg">
//                 <p className="font-medium mb-2">{file.name}</p>
//                 {/* 
//                   Only show the audio player if the URL is valid and the file is ready.
//                   A file with status 'completed' will have a playable URL.
//                 */}
//                 {file.url && file.status === 'completed' ? (
//                   <audio controls src={file.url} className="w-full">
//                     Your browser does not support the audio element.
//                   </audio>
//                 ) : (
//                   <p className="text-sm text-gray-500">Status: {file.status}...</p>
//                 )}
//               </li>
//             ))}
//           </ul>
//         )}
//         {files && files.length === 0 && !isLoading && (
//           <p className="text-gray-500">You have not uploaded any files yet.</p>
//         )}
//       </CardContent>
//     </Card>
//   );
// }


'use client';

import useSWR from 'swr';
import Link from 'next/link'; // Import the Link component
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';

type TranscriptionFile = {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function UserUploadedFilesList() {
  const {
    data: files,
    error,
    isLoading
  } = useSWR<TranscriptionFile[]>('/api/transcriptions/user', fetcher);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Uploaded Files</CardTitle>
        <CardDescription>
          Listen to the media files you have uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Loading files...</p>}
        {error && (
          <p className="text-red-500">
            Error loading files. Please try again later.
          </p>
        )}
        {files && files.length > 0 && (
          <ul className="space-y-4">
            {files.map((file) => (
              <li key={file.id}>
                <Link href={`/dashboard/transcription/${file.id}`} legacyBehavior>
                  <a className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="font-medium mb-2">{file.name}</p>
                    {file.url && file.status === 'completed' ? (
                      <audio controls src={file.url} className="w-full">
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="text-sm text-gray-500">Status: {file.status}...</p>
                    )}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {files && files.length === 0 && !isLoading && (
          <p className="text-gray-500">You have not uploaded any files yet.</p>
        )}
      </CardContent>
    </Card>
  );
}