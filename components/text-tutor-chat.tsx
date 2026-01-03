'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Download, User, Bot, Loader2, FileText, Image as ImageIcon, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface Message {
    role: 'user' | 'model';
    content: string;
    files?: { name: string; type: string; data: string }[];
}

interface TextTutorChatProps {
    contextPrompt: string; // The system instructions + flashcards/past paper context
    topicName: string;
    subject: string;
}

export default function TextTutorChat({ contextPrompt, topicName, subject }: TextTutorChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: `Hello! I'm your AI Tutor for **${topicName}**. How can I help you today? You can ask me questions or upload images/notes for me to analyze.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<{ name: string; type: string; data: string }[]>([]);
    const [hasTrackedSession, setHasTrackedSession] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Check if session is allowed on mount
    useEffect(() => {
        const { checkFeatureAllowedAction } = require('@/app/(dashboard)/usage-actions');
        async function checkLimit() {
            const res = await checkFeatureAllowedAction('textTutor');
            if (!res.allowed) {
                setMessages([{
                    role: 'model',
                    content: `⚠️ **Usage Limit Reached**: ${res.error || "You have reached your text tutor session limit for this cycle. Please upgrade your plan to continue."}`
                }]);
                setIsLoading(true); // Disable input by keeping loading state
            }
        }
        checkLimit();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    // Extract base64 content part if needed by removing prefix "data:image/png;base64,"
                    // However, for preview we need the prefix. For API we might need to strip it.
                    // Let's store full string for now and strip in handleSend.
                    setFiles(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        data: base64String
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!input.trim() && files.length === 0) || isLoading) return;

        // --- Usage Tracking for Text Tutor Session ---
        if (!hasTrackedSession) {
            const { trackFeatureUsageAction } = require('@/app/(dashboard)/usage-actions');
            const result = await trackFeatureUsageAction('textTutor');
            if (!result.success) {
                setMessages(prev => [...prev, { role: 'model', content: `❌ ${result.error || "Failed to start session. Limit reached."}` }]);
                return;
            }
            setHasTrackedSession(true);
        }
        // --- End Usage Tracking ---

        const currentInput = input;
        const currentFiles = [...files]; // Copy files

        // Clear input state immediately
        setInput('');
        setFiles([]);

        const newUserMessage: Message = {
            role: 'user',
            content: currentInput,
            files: currentFiles
        };

        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);

        try {
            // Prepare payload
            // We need to strip media type prefix for Gemini API inlineData if using google-generative-ai SDK usually?
            // The route handler we built expects "file.data" to be the base64 string.
            // If we used readAsDataURL, it returns "data:image/png;base64,....."
            // We'll strip it here.

            const processedFiles = currentFiles.map(f => ({
                name: f.name,
                type: f.type,
                data: f.data.split(',')[1]
            }));

            // Construct full message history for the payload
            // Filter out the very first greeting if it was client-side only? 
            // Actually our API logic takes all messages content. 
            // The initial greeting is "model" role so it's fine to pass as history, 
            // although Gemini might get confused if we put words in its mouth that it didn't say.
            // Safe bet: Pass only "actual" history. But for simplicity let's pass all.
            const apiMessages = [...messages, { ...newUserMessage, files: processedFiles }];

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    context: contextPrompt,
                    subject
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error(data.error);
                setMessages(prev => [...prev, { role: 'model', content: "I encountered an error processing your request. Please try again." }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "Network error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text(`Lesson Notes: ${topicName}`, 20, 20);

        doc.setFontSize(12);
        doc.text(`Subject: ${subject}`, 20, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 36);

        let y = 50;

        messages.forEach((msg) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            const role = msg.role === 'user' ? 'Student' : 'AI Tutor';
            doc.setFont("helvetica", "bold");
            doc.text(`${role}:`, 20, y);
            y += 6;

            doc.setFont("helvetica", "normal");

            // Clean markdown roughly for PDF
            const cleanContent = msg.content.replace(/\*\*/g, '').replace(/###/g, '');
            const lines = doc.splitTextToSize(cleanContent, 170);
            doc.text(lines, 20, y);
            y += (lines.length * 6) + 6; // Spacing

            if (msg.files && msg.files.length > 0) {
                doc.setFont("helvetica", "italic");
                doc.text(`[Attached ${msg.files.length} file(s)]`, 20, y);
                y += 10;
            }
        });

        doc.save(`${subject}-${topicName}-Notes.pdf`);
    };

    return (
        <Card className="h-[600px] flex flex-col shadow-md border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-orange-50 border-b border-orange-100">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                    <Bot className="h-5 w-5" /> AI Text Tutor
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleDownload} className="text-orange-700 border-orange-200 hover:bg-orange-100">
                    <Download className="h-4 w-4 mr-2" /> End & Download PDF
                </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 bg-white">
                <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                                        {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className={`rounded-xl p-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                        {msg.files && msg.files.length > 0 && (
                                            <div className="mb-2 flex flex-wrap gap-2">
                                                {msg.files.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded text-xs text-white/90">
                                                        <Paperclip className="h-3 w-3" /> {f.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap leading-relaxed">
                                            {/* Simple Markdown Rendering Support (Basic) */}
                                            {msg.content.split('\n').map((line, i) => (
                                                <p key={i} className="min-h-[1em]">{line}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[80%]">
                                    <div className="mt-1 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                    <div className="rounded-xl p-3 bg-gray-100 text-gray-500 text-sm shadow-sm">
                                        Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>

            <CardFooter className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex-1 flex flex-col gap-2">
                    {/* File Preview */}
                    {files.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2">
                            {files.map((f, i) => (
                                <div key={i} className="relative group bg-white border border-orange-200 rounded p-1">
                                    <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <X className="h-3 w-3" />
                                    </button>
                                    <div className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                        {f.type.startsWith('image/') ? (
                                            <img src={f.data} alt={f.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <FileText className="h-6 w-6 text-gray-500" />
                                        )}
                                    </div>
                                    <p className="text-[10px] truncate max-w-[60px] text-center mt-1">{f.name}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        {/* File Upload Button */}
                        <div className="relative">
                            <Input
                                type="file"
                                id="chat-file-upload"
                                className="hidden"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                            />
                            <Button asChild variant="ghost" size="icon" className="text-gray-500 hover:text-orange-600" title="Upload Image or PDF">
                                <label htmlFor="chat-file-upload" className="cursor-pointer">
                                    <Paperclip className="h-5 w-5" />
                                </label>
                            </Button>
                        </div>

                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-[120px] resize-none"
                            rows={1}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && files.length === 0)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-center text-gray-400">
                        Shift+Enter for new line. Upload images or PDFs for analysis.
                    </p>
                </div>
            </CardFooter>
        </Card>
    );
}
