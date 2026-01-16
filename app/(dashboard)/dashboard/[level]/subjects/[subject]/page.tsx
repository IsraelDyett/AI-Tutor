import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Brain, MessageCircle } from 'lucide-react';
import { getTopics } from '@/app/(dashboard)/actions';
import NewTopicDialog from '@/components/new-topic-dialog';

export default async function SubjectPage({ params }: { params: Promise<{ level: string; subject: string }> }) {
    const { level, subject } = await params;
    const decodedSubject = decodeURIComponent(subject);
    const upperLevel = level.toUpperCase() as 'SEA' | 'CSEC' | 'CAPE';

    const topics = await getTopics(decodedSubject, upperLevel);
    // console.log(`[SubjectPage] Level: ${level}, Subject: ${decodedSubject}, Found: ${topics.length}`);

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Link href={`/dashboard/${level}`} className="text-sm text-gray-500 hover:text-orange-600 mb-2 block">
                            &larr; Back to {upperLevel} Subjects
                        </Link>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {decodedSubject} Topics ({upperLevel})
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Select a topic to start your study session or choose "All Topics" for a general review.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <Button variant="outline" asChild className="border-orange-500 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none">
                            <Link href={`/dashboard/${level}/subjects/${subject}/all`}>
                                <Brain className="mr-2 h-4 w-4" /> All Cards / General Tutor
                            </Link>
                        </Button>
                        <div className="flex-1 sm:flex-none">
                            <NewTopicDialog subject={decodedSubject} educationLevel={upperLevel} />
                        </div>
                    </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/dashboard/${level}/subjects/${subject}/${topic.id}`}
                            className="block group"
                        >
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md hover:border-orange-300 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        View Content
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                                    {topic.name}
                                </h3>
                                <p className="text-gray-600 text-sm mb-6 flex-grow">
                                    {topic.description || 'No description.'}
                                </p>

                                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Brain className="h-3 w-3 mr-1" />
                                        Quiz
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        Tutor
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Empty State */}
                    {topics.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-500">No topics found for "{decodedSubject}" at level "{upperLevel}".</p>
                            {/* <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left inline-block border border-gray-100">
                                <p className="text-xs font-mono text-gray-400">Debug Info:</p>
                                <ul className="text-xs text-gray-500 list-disc list-inside mt-1">
                                    <li>Subject: <code>{decodedSubject}</code></li>
                                    <li>Level: <code>{upperLevel}</code></li>
                                </ul>
                            </div> */}
                            <div className='mt-6'>
                                <NewTopicDialog subject={decodedSubject} educationLevel={upperLevel} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
