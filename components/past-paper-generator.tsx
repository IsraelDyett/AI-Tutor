// //components\past-paper-generator.tsx
// 'use client';

// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogFooter,
//     DialogHeader,
//     DialogTitle,
//     DialogTrigger,
// } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Loader2, Plus, Sparkles, Trash2, Save, FileText, Upload, X } from 'lucide-react';
// import { savePastPaperQuestion } from '@/app/(dashboard)/actions';
// import { useRouter } from 'next/navigation';

// interface PastPaperQuestion {
//     year: string;
//     question: string;
//     answer: string;
//     explanation?: string;
// }

// interface PastPaperGeneratorProps {
//     subject: string;
//     topicId: number | string; // 'all' or number
//     topicName: string;
//     onSaved?: () => void;
// }

// export default function PastPaperGenerator({ subject, topicId, topicName, onSaved }: PastPaperGeneratorProps) {
//     const [open, setOpen] = useState(false);
//     const [mode, setMode] = useState<'generate' | 'manual'>('generate');
//     const [loading, setLoading] = useState(false);
//     const [questions, setQuestions] = useState<PastPaperQuestion[]>([]);
//     const [files, setFiles] = useState<{ name: string; type: string; data: string }[]>([]);

//     // Manual Input State
//     const [manualYear, setManualYear] = useState('');
//     const [manualQuestion, setManualQuestion] = useState('');
//     const [manualAnswer, setManualAnswer] = useState('');
//     const [manualExplanation, setManualExplanation] = useState('');

//     const router = useRouter();

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files) {
//             const newFiles = Array.from(e.target.files);
//             newFiles.forEach(file => {
//                 const reader = new FileReader();
//                 reader.onloadend = () => {
//                     setFiles(prev => [...prev, {
//                         name: file.name,
//                         type: file.type,
//                         data: reader.result as string
//                     }]);
//                 };
//                 reader.readAsDataURL(file);
//             });
//         }
//     };

//     const removeFile = (index: number) => {
//         setFiles(prev => prev.filter((_, i) => i !== index));
//     };

//     const handleGenerate = async () => {
//         setLoading(true);
//         try {
//             const response = await fetch('/api/ai/generate', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     type: 'questions',
//                     subject,
//                     topic: topicName,
//                     topicId: topicId,
//                     count: 3, // Default batch size for questions
//                     files: files.map(f => ({
//                         name: f.name,
//                         type: f.type,
//                         data: f.data.split(',')[1] // Send only base64 part
//                     }))
//                 }),
//             });
//             const data = await response.json();
//             if (Array.isArray(data)) {
//                 setQuestions((prev) => [...prev, ...data]);
//             } else if (data.questions) {
//                 setQuestions((prev) => [...prev, ...data.questions]);
//             }
//         } catch (error) {
//             console.error('Generation failed', error);
//             // Ideally show toast error
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleAddManual = () => {
//         if (!manualYear || !manualQuestion || !manualAnswer) return;
//         setQuestions((prev) => [...prev, { year: manualYear, question: manualQuestion, answer: manualAnswer, explanation: manualExplanation }]);
//         setManualYear('');
//         setManualQuestion('');
//         setManualAnswer('');
//         setManualExplanation('');
//     };

//     const handleRemove = (index: number) => {
//         setQuestions((prev) => prev.filter((_, i) => i !== index));
//     };

//     const handleSaveAll = async () => {
//         if (topicId === 'all') {
//             alert("Please select a specific topic to save questions.");
//             return;
//         }

//         setLoading(true);
//         let savedCount = 0;

//         // Save sequentially
//         for (const q of questions) {
//             const result = await savePastPaperQuestion({
//                 topicId: Number(topicId),
//                 year: q.year,
//                 question: q.question,
//                 answer: q.answer,
//                 explanation: q.explanation
//             });
//             if (result.success) savedCount++;
//         }

//         setLoading(false);
//         setOpen(false);
//         setQuestions([]);
//         router.refresh();
//         if (onSaved) onSaved();
//     };

//     return (
//         <Dialog open={open} onOpenChange={setOpen}>
//             <DialogTrigger asChild>
//                 <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
//                     <FileText className="h-4 w-4 mr-2" /> Generate / Add Questions
//                 </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
//                 <DialogHeader>
//                     <DialogTitle>Questions for {topicName}</DialogTitle>
//                     <DialogDescription>
//                         Generate practice questions with AI or add them manually.
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="flex gap-2 mb-4">
//                     <Button
//                         variant={mode === 'generate' ? 'default' : 'outline'}
//                         onClick={() => setMode('generate')}
//                         className="flex-1"
//                     >
//                         <Sparkles className="h-4 w-4 mr-2" /> AI Generate
//                     </Button>
//                     <Button
//                         variant={mode === 'manual' ? 'default' : 'outline'}
//                         onClick={() => setMode('manual')}
//                         className="flex-1"
//                     >
//                         <Plus className="h-4 w-4 mr-2" /> Manual Entry
//                     </Button>
//                 </div>

//                 {mode === 'generate' && (
//                     <div className="space-y-4 py-4 border-b border-gray-100">
//                         <p className="text-sm text-gray-500">
//                             Click generate to create 3 practice questions based on the topic <strong>"{topicName}"</strong>.
//                         </p>

//                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
//                             <Label className="text-xs font-semibold text-gray-700 mb-2 block">Upload Context (Optional)</Label>
//                             <div className="flex gap-2 items-center">
//                                 <Input
//                                     type="file"
//                                     onChange={handleFileChange}
//                                     accept=".pdf,.docx,.jpg,.jpeg,.png"
//                                     multiple
//                                     className="hidden"
//                                     id="file-upload-paper"
//                                 />
//                                 <Button asChild variant="outline" size="sm" className="h-8 bg-white">
//                                     <label htmlFor="file-upload-paper" className="cursor-pointer flex items-center">
//                                         <Upload className="h-3.5 w-3.5 mr-2" /> Upload Notes
//                                     </label>
//                                 </Button>
//                                 <span className="text-[10px] text-gray-400">PDF, Word, Images</span>
//                             </div>

//                             {files.length > 0 && (
//                                 <div className="mt-3 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
//                                     {files.map((f, i) => (
//                                         <div key={i} className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-gray-100">
//                                             <div className="flex items-center truncate">
//                                                 <FileText className="h-3 w-3 mr-2 text-blue-500" />
//                                                 <span className="truncate max-w-[150px]">{f.name}</span>
//                                             </div>
//                                             <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-red-50 hover:text-red-500" onClick={() => removeFile(i)}>
//                                                 <X className="h-3 w-3" />
//                                             </Button>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                         <Button onClick={handleGenerate} disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
//                             {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
//                             Generate 3 Questions
//                         </Button>
//                     </div>
//                 )}

//                 {mode === 'manual' && (
//                     <div className="space-y-4 py-4 border-b border-gray-100">
//                         <div className="grid grid-cols-4 gap-4">
//                             <div className="col-span-1">
//                                 <Label>Year</Label>
//                                 <Input
//                                     value={manualYear}
//                                     onChange={(e) => setManualYear(e.target.value)}
//                                     placeholder="e.g. 2023"
//                                 />
//                             </div>
//                             <div className="col-span-3">
//                                 <Label>Question</Label>
//                                 <Input
//                                     value={manualQuestion}
//                                     onChange={(e) => setManualQuestion(e.target.value)}
//                                     placeholder="e.g. Explain the process of..."
//                                 />
//                             </div>
//                         </div>
//                         <div>
//                             <Label>Answer (Model Answer)</Label>
//                             <Textarea
//                                 value={manualAnswer}
//                                 onChange={(e) => setManualAnswer(e.target.value)}
//                                 placeholder="e.g. The process involves..."
//                                 rows={3}
//                             />
//                         </div>
//                         <div>
//                 <Label>Explanation (Optional)</Label>
//                 <Textarea
//                     value={manualExplanation}
//                     onChange={(e) => setManualExplanation(e.target.value)}
//                     placeholder="e.g. This occurs because..."
//                     rows={2}
//                     />
//                 </div>
//                         <Button onClick={handleAddManual} className="w-full" variant="secondary">
//                             Add to List
//                         </Button>
//                     </div>
//                 )}

//                 {/* Preview List */}
//                 <div className="space-y-3 mt-4">
//                     <h3 className="font-semibold text-sm text-gray-700">Questions to Save ({questions.length})</h3>
//                     {questions.length === 0 && <p className="text-sm text-gray-400 italic">No questions added yet.</p>}

//                     {questions.map((q, idx) => (
//                         <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
//                             <div className="space-y-2 w-full mr-4">
//                                 <div className="flex gap-2 items-center">
//                                     <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded">{q.year}</span>
//                                     <span className="text-xs text-gray-500 font-medium">Question Preview</span>
//                                 </div>
//                                 <p className="text-sm font-semibold text-gray-800">{q.question}</p>
//                                 <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-100 whitespace-pre-line">
//                                     <strong className="text-green-600">Answer:</strong> {q.answer}
//                                 </div>
//                             </div>
//                             <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-600 shrink-0">
//                                 <Trash2 className="h-4 w-4" />
//                             </Button>
//                         </div>
//                     ))}
//                 </div>

//                 <DialogFooter>
//                     <Button onClick={handleSaveAll} disabled={loading || questions.length === 0} className="w-full sm:w-auto">
//                         {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
//                         Save {questions.length} Questions
//                     </Button>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );

// components/past-paper-generator.tsx
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
import { Loader2, Plus, Sparkles, Trash2, Save, FileText, Upload, X } from 'lucide-react';
import { savePastPaperQuestion } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';

interface PastPaperQuestion {
    year: string;
    question: string;
    answer: string;
    explanation?: string;
    worksheetName?: string; // Tagged worksheet name
}

interface PastPaperGeneratorProps {
    subject: string;
    topicId: number | string; // 'all' or number
    topicName: string;
    onSaved?: () => void;
}

export default function PastPaperGenerator({ subject, topicId, topicName, onSaved }: PastPaperGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'generate' | 'manual'>('generate');
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<PastPaperQuestion[]>([]);
    const [files, setFiles] = useState<{ name: string; type: string; data: string }[]>([]);

    // Global / Batch Worksheet Name
    const [worksheetName, setWorksheetName] = useState('');

    // AI Generation Parameters
    const [questionCount, setQuestionCount] = useState<string>('3');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Manual Input State
    const [manualYear, setManualYear] = useState('');
    const [manualQuestion, setManualQuestion] = useState('');
    const [manualAnswer, setManualAnswer] = useState('');
    const [manualExplanation, setManualExplanation] = useState('');

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

    const handleCountChange = (val: string) => {
        setValidationError(null);
        setQuestionCount(val);
        
        const num = parseInt(val);
        if (!isNaN(num)) {
            if (num > 20) {
                setValidationError('You can generate a maximum of 20 questions at a time.');
            } else if (num < 1) {
                setValidationError('Please generate at least 1 question.');
            }
        }
    };

    const handleGenerate = async () => {
        const countNum = parseInt(questionCount);
        if (isNaN(countNum) || countNum < 1 || countNum > 20) {
            setValidationError('Please enter a valid count between 1 and 20.');
            return;
        }

        setLoading(true);
        setValidationError(null);
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'questions',
                    subject,
                    topic: topicName,
                    topicId: topicId,
                    count: countNum, // Dynamic count!
                    files: files.map(f => ({
                        name: f.name,
                        type: f.type,
                        data: f.data.split(',')[1] // Send only base64 part
                    }))
                }),
            });
            const data = await response.json();
            
            let newQuestions: PastPaperQuestion[] = [];
            if (Array.isArray(data)) {
                newQuestions = data;
            } else if (data.questions) {
                newQuestions = data.questions;
            }

            // Tag each generated question with the custom worksheet name if provided
            const taggedQuestions = newQuestions.map(q => ({
                ...q,
                worksheetName: worksheetName.trim() || undefined
            }));

            setQuestions((prev) => [...prev, ...taggedQuestions]);
        } catch (error) {
            console.error('Generation failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddManual = () => {
        if (!manualYear || !manualQuestion || !manualAnswer) return;
        setQuestions((prev) => [
            ...prev, 
            { 
                year: manualYear, 
                question: manualQuestion, 
                answer: manualAnswer, 
                explanation: manualExplanation,
                worksheetName: worksheetName.trim() || undefined // Tag with custom worksheet name
            }
        ]);
        setManualYear('');
        setManualQuestion('');
        setManualAnswer('');
        setManualExplanation('');
    };

    const handleRemove = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        if (topicId === 'all') {
            alert("Please select a specific topic to save questions.");
            return;
        }

        setLoading(true);
        let savedCount = 0;

        // Save sequentially to avoid race conditions
        for (const q of questions) {
            const result = await savePastPaperQuestion({
                topicId: Number(topicId),
                year: q.year,
                question: q.question,
                answer: q.answer,
                explanation: q.explanation,
                worksheetName: q.worksheetName // Pass worksheet name to server action
            });
            if (result.success) savedCount++;
        }

        setLoading(false);
        setOpen(false);
        setQuestions([]);
        setWorksheetName(''); // Reset
        setQuestionCount('3'); // Reset
        router.refresh();
        if (onSaved) onSaved();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    <FileText className="h-4 w-4 mr-2" /> Generate / Add Questions
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Past Paper Questions for {topicName}</DialogTitle>
                    <DialogDescription>
                        Generate practice questions with AI or add them manually.
                    </DialogDescription>
                </DialogHeader>

                {/* Shared Worksheet Name Input */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg space-y-1.5 mb-2">
                    <Label htmlFor="batch-worksheet-name" className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                        Worksheet Name *
                    </Label>
                    <Input
                        id="batch-worksheet-name"
                        value={worksheetName}
                        onChange={(e) => setWorksheetName(e.target.value)}
                        placeholder="e.g. Worksheet 1, Fractions Practice, Assignment A..."
                        className="h-9 bg-white"
                    />
                </div>

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
                        {/* Dynamic Count Input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="question-count" className="text-xs font-bold text-gray-700 tracking-wide uppercase">
                                Number of Questions to Generate (Max 20)
                            </Label>
                            <Input
                                id="question-count"
                                type="number"
                                min={1}
                                max={25}
                                value={questionCount}
                                onChange={(e) => handleCountChange(e.target.value)}
                                className="h-9 bg-white"
                            />
                            {validationError && (
                                <p className="text-xs font-semibold text-red-500 mt-1">{validationError}</p>
                            )}
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Upload Context (Optional)</Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                                    multiple
                                    className="hidden"
                                    id="file-upload-paper"
                                />
                                <Button asChild variant="outline" size="sm" className="h-8 bg-white">
                                    <label htmlFor="file-upload-paper" className="cursor-pointer flex items-center">
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
                        <Button 
                            onClick={handleGenerate} 
                            disabled={loading || !!validationError} 
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Generate {questionCount && !validationError ? questionCount : 'Questions'}
                        </Button>
                    </div>
                )}

                {mode === 'manual' && (
                    <div className="space-y-4 py-4 border-b border-gray-100">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <Label>Year</Label>
                                <Input
                                    value={manualYear}
                                    onChange={(e) => setManualYear(e.target.value)}
                                    placeholder="e.g. 2023"
                                />
                            </div>
                            <div className="col-span-3">
                                <Label>Question</Label>
                                <Input
                                    value={manualQuestion}
                                    onChange={(e) => setManualQuestion(e.target.value)}
                                    placeholder="e.g. Explain the process of..."
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Answer (Model Answer)</Label>
                            <Textarea
                                value={manualAnswer}
                                onChange={(e) => setManualAnswer(e.target.value)}
                                placeholder="e.g. The process involves..."
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label>Explanation (Optional)</Label>
                            <Textarea
                                value={manualExplanation}
                                onChange={(e) => setManualExplanation(e.target.value)}
                                placeholder="e.g. This occurs because..."
                                rows={2}
                            />
                        </div>
                        <Button onClick={handleAddManual} className="w-full" variant="secondary">
                            Add to List
                        </Button>
                    </div>
                )}

                {/* Preview List */}
                <div className="space-y-3 mt-4">
                    <h3 className="font-semibold text-sm text-gray-700">Questions to Save ({questions.length})</h3>
                    {questions.length === 0 && <p className="text-sm text-gray-400 italic">No questions added yet.</p>}

                    {questions.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="space-y-2 w-full mr-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded">{q.year}</span>
                                    {q.worksheetName && (
                                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                            Group: {q.worksheetName}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500 font-medium">Question Preview</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                                <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-100 whitespace-pre-line">
                                    <strong className="text-green-600">Answer:</strong> {q.answer}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button onClick={handleSaveAll} disabled={loading || questions.length === 0} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save {questions.length} Questions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}