//app\(dashboard)\dashboard\[level]\page.tsx
import Link from 'next/link';
import { getSubjectsForLevel } from '@/app/(dashboard)/actions';

export default async function LevelDashboardPage({ params }: { params: Promise<{ level: string }> }) {
    const { level } = await params;
    const upperLevel = level.toUpperCase() as 'SEA' | 'CSEC' | 'CAPE';

    const subjects = await getSubjectsForLevel(upperLevel);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6">
            <div className="max-w-5xl w-full text-center space-y-8">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                    {upperLevel} Subjects
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Select a subject to start studying with AI-powered flashcards, past papers, and your personal AI Tutor.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {subjects.map((subject) => (
                        <Link
                            key={subject.id}
                            href={`/dashboard/${level}/subjects/${subject.name}`}
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

                {subjects.length === 0 && (
                    <div className="py-12 bg-white rounded-xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-500">No subjects found for this level in the database.</p>
                        <p className="text-sm text-gray-400 mt-2">Add subjects to the database to see them here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
