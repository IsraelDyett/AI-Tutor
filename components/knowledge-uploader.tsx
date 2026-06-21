//components\knowledge-uploader.tsx
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
import { Loader2, Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { uploadTopicDocument } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';
import mammoth from 'mammoth';

interface KnowledgeUploaderProps {
    topicId: number | string;
    topicName: string;
}

export default function KnowledgeUploader({ topicId, topicName }: KnowledgeUploaderProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<{ name: string; type: string; data: string }[]>([]);
    const [success, setSuccess] = useState(false);

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

    const handleUpload = async () => {
        if (topicId === 'all') return;
        setLoading(true);
        setSuccess(false);

        try {
            for (const file of files) {
                const base64Data = file.data.split(',')[1];
                await uploadTopicDocument(Number(topicId), file.name, file.type, base64Data);
            }
            setSuccess(true);
            setFiles([]);
            setTimeout(() => {
                setOpen(false);
                setSuccess(false);
                router.refresh();
            }, 2000);
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Upload className="h-4 w-4 mr-2" /> Add Knowledge
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Knowledge to {topicName}</DialogTitle>
                    <DialogDescription>
                        Upload documents to help the AI Tutor understand this topic better.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 text-center">
                        <Input
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.docx,.txt"
                            multiple
                            className="hidden"
                            id="kb-file-upload"
                        />
                        <label htmlFor="kb-file-upload" className="cursor-pointer flex flex-col items-center">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">Click to upload documents</span>
                            <span className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT</span>
                        </label>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-100">
                                    <div className="flex items-center truncate">
                                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                        <span className="truncate max-w-[200px]">{f.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-50 hover:text-red-500" onClick={() => removeFile(i)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center justify-center p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Knowledge added successfully!
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleUpload} disabled={loading || files.length === 0 || success} className="w-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        {loading ? 'Processing...' : `Upload ${files.length} Documents`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
