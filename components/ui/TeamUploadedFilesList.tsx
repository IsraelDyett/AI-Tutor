// 'use client';

// import useSWR from 'swr';
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription
// } from '@/components/ui/card';

// // More detailed type to match the API response
// type TranscriptionFile = {
//   id: string;      // A unique ID is best for React keys
//   name: string;
//   url: string;     // This will be the signed HTTPS URL
//   status: 'pending' | 'processing' | 'completed' | 'failed';
// };

// const fetcher = (url: string) => fetch(url).then((res) => res.json());

// export function TeamUploadedFilesList() {
//   const {
//     data: files,
//     error,
//     isLoading
//   } = useSWR<TranscriptionFile[]>('/api/transcriptions/team', fetcher);

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Team Uploaded Files</CardTitle>
//         <CardDescription>
//           Listen to the media files uploaded by your team.
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
//               // Use the unique file.id for the key
//               <li key={file.id} className="p-4 border rounded-lg">
//                 <p className="font-medium mb-2">{file.name}</p>
//                 {/* Conditionally render the player or the status */}
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
//           <p className="text-gray-500">
//             No files have been uploaded by your team yet.
//           </p>
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

// More detailed type to match the API response
type TranscriptionFile = {
  id: string; // A unique ID is best for React keys
  name: string;
  url: string; // This will be the signed HTTPS URL
  status: 'pending' | 'processing' | 'completed' | 'failed';
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TeamUploadedFilesList() {
  const {
    data: files,
    error,
    isLoading
  } = useSWR<TranscriptionFile[]>('/api/transcriptions/team', fetcher);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Uploaded Files</CardTitle>
        <CardDescription>
          Listen to the media files uploaded by your team.
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
              // Use the unique file.id for the key
              <li key={file.id}>
                <Link href={`/dashboard/transcription/${file.id}`} legacyBehavior>
                  <a className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <p className="font-medium mb-2">{file.name}</p>
                    {/* Conditionally render the player or the status */}
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
          <p className="text-gray-500">
            No files have been uploaded by your team yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}