import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, Brain, MessageCircle } from 'lucide-react';
import { getTopics } from '@/app/(dashboard)/actions';
import NewTopicDialog from '@/components/new-topic-dialog';

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
    const { subject } = await params;
    const decodedSubject = decodeURIComponent(subject);

    const topics = await getTopics(decodedSubject);

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-orange-600 mb-2 block">
                            &larr; Back to Subjects
                        </Link>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {decodedSubject} Topics
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Select a topic to start your study session or choose "All Topics" for a general review.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild className="border-orange-500 text-orange-600 hover:bg-orange-50">
                            <Link href={`/dashboard/subjects/${subject}/all`}>
                                <Brain className="mr-2 h-4 w-4" /> All Cards / General Tutor
                            </Link>
                        </Button>
                        <NewTopicDialog subject={decodedSubject} />
                    </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/dashboard/subjects/${subject}/${topic.id}`}
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
                            <p className="text-gray-500">No topics created yet.</p>
                            <div className='mt-2'>
                                <NewTopicDialog subject={decodedSubject} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
