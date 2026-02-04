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
import { Loader2, Plus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { createTopic } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';

interface NewTopicDialogProps {
    subject: string;
    educationLevel?: 'SEA' | 'CSEC' | 'CAPE';
}

export default function NewTopicDialog({ subject, educationLevel = 'CSEC' }: NewTopicDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [lessonPlan, setLessonPlan] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!name) return;
        setLoading(true);

        const result = await createTopic(subject, name, educationLevel, lessonPlan);

        setLoading(false);
        if (result.success) {
            setOpen(false);
            setName('');
            setLessonPlan('');
            router.refresh();
        } else {
            alert("Failed to create topic");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
                    <Plus className="mr-2 h-4 w-4" /> New Topic
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Topic for {subject}</DialogTitle>
                    <DialogDescription>
                        Add a new topic to organize your study materials.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Cell Biology"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="lessonPlan" className="text-right pt-2">
                            Lesson Plan
                        </Label>
                        <Textarea
                            id="lessonPlan"
                            value={lessonPlan}
                            onChange={(e) => setLessonPlan(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional: Enter a specific lesson plan for this topic..."
                            rows={4}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Topic
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
