'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Sparkles, Trash2, Save, Upload, X, FileText } from 'lucide-react';
import { saveFlashcard } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardGeneratorProps {
    subject: string;
    topicId: number | string; // 'all' or number
    topicName: string;
    onSaved?: () => void;
}

export default function FlashcardGenerator({ subject, topicId, topicName, onSaved }: FlashcardGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'generate' | 'manual'>('generate');
    const [loading, setLoading] = useState(false);
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [files, setFiles] = useState<{ name: string; type: string; data: string }[]>([]);

    // Manual Input State
    const [manualFront, setManualFront] = useState('');
    const [manualBack, setManualBack] = useState('');

    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFiles(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        data: reader.result as string
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'flashcards',
                    subject,
                    topic: topicName,
                    count: 5, // Default batch size
                    files: files.map(f => ({
                        name: f.name,
                        type: f.type,
                        data: f.data.split(',')[1] // Send only base64 part
                    }))
                }),
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setCards((prev) => [...prev, ...data]);
            } else if (data.flashcards) {
                setCards((prev) => [...prev, ...data.flashcards]);
            }
        } catch (error) {
            console.error('Generation failed', error);
            // Ideally show toast error
        } finally {
            setLoading(false);
        }
    };

    const handleAddManual = () => {
        if (!manualFront || !manualBack) return;
        setCards((prev) => [...prev, { front: manualFront, back: manualBack }]);
        setManualFront('');
        setManualBack('');
    };

    const handleRemove = (index: number) => {
        setCards((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        if (topicId === 'all') {
            alert("Please select a specific topic to save cards.");
            return;
        }

        setLoading(true);
        let savedCount = 0;

        // Save sequentially or parallel
        for (const card of cards) {
            const result = await saveFlashcard({
                topicId: Number(topicId),
                front: card.front,
                back: card.back
            });
            if (result.success) savedCount++;
        }

        setLoading(false);
        setOpen(false);
        setCards([]);
        router.refresh();
        if (onSaved) onSaved();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                    <Sparkles className="h-4 w-4 mr-2" /> Generate / Add Cards
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Flashcards for {topicName}</DialogTitle>
                    <DialogDescription>
                        Generate cards with AI or add them manually.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Button
                        variant={mode === 'generate' ? 'default' : 'outline'}
                        onClick={() => setMode('generate')}
                        className="flex-1"
                    >
                        <Sparkles className="h-4 w-4 mr-2" /> AI Generate
                    </Button>
                    <Button
                        variant={mode === 'manual' ? 'default' : 'outline'}
                        onClick={() => setMode('manual')}
                        className="flex-1"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Manual Entry
                    </Button>
                </div>

                {mode === 'generate' && (
                    <div className="space-y-4 py-4 border-b border-gray-100">
                        <p className="text-sm text-gray-500">
                            Click generate to create 5 flashcards based on the topic <strong>"{topicName}"</strong>.
                        </p>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Upload Context (Optional)</Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Button asChild variant="outline" size="sm" className="h-8 bg-white">
                                    <label htmlFor="file-upload" className="cursor-pointer flex items-center">
                                        <Upload className="h-3.5 w-3.5 mr-2" /> Upload Notes
                                    </label>
                                </Button>
                                <span className="text-[10px] text-gray-400">PDF, Word, Images</span>
                            </div>

                            {files.length > 0 && (
                                <div className="mt-3 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {files.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-gray-100">
                                            <div className="flex items-center truncate">
                                                <FileText className="h-3 w-3 mr-2 text-blue-500" />
                                                <span className="truncate max-w-[150px]">{f.name}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-red-50 hover:text-red-500" onClick={() => removeFile(i)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button onClick={handleGenerate} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Generate 5 Cards
                        </Button>
                    </div>
                )}

                {mode === 'manual' && (
                    <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-100">
                        <div>
                            <Label>Front (Question)</Label>
                            <Textarea
                                value={manualFront}
                                onChange={(e) => setManualFront(e.target.value)}
                                placeholder="e.g. What is the powerhouse?"
                            />
                        </div>
                        <div>
                            <Label>Back (Answer)</Label>
                            <Textarea
                                value={manualBack}
                                onChange={(e) => setManualBack(e.target.value)}
                                placeholder="e.g. Mitochondria"
                            />
                        </div>
                        <Button onClick={handleAddManual} className="col-span-2" variant="secondary">
                            Add to List
                        </Button>
                    </div>
                )}

                {/* Preview List */}
                <div className="space-y-3 mt-4">
                    <h3 className="font-semibold text-sm text-gray-700">Cards to Save ({cards.length})</h3>
                    {cards.length === 0 && <p className="text-sm text-gray-400 italic">No cards added yet.</p>}

                    {cards.map((card, idx) => (
                        <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 w-full mr-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Front</span>
                                    <p className="text-sm">{card.front}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase">Back</span>
                                    <p className="text-sm">{card.back}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button onClick={handleSaveAll} disabled={loading || cards.length === 0} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save {cards.length} Cards
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
