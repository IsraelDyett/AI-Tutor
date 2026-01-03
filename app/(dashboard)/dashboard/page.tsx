'use client';

import Link from 'next/link';

export default function DashboardPage() {
  const subjects = [
    { name: 'English', icon: '📚' },
    { name: 'Biology', icon: '🧬' },
    { name: 'Spanish', icon: '🇪🇸' },
    { name: 'French', icon: '🇫🇷' },
    { name: 'Chemistry', icon: '🧪' },
    { name: 'Physics', icon: '⚛️' },
    { name: 'History', icon: '📜' },
    { name: 'POA', icon: '💼' },
    { name: 'POB', icon: '📊' },
    { name: 'Literature', icon: '📖' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6">
      <div className="max-w-5xl w-full text-center space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Choose Your Subject
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select a CXC subject to start studying with AI-powered flashcards, past papers, and your personal Voice Tutor.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {subjects.map((subject) => (
            <Link
              key={subject.name}
              href={`/dashboard/subjects/${subject.name}`}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-orange-500 group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                {subject.icon}
              </div>
              <span className="font-semibold text-gray-800 group-hover:text-orange-600">
                {subject.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
