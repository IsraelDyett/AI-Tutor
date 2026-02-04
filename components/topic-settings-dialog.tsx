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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings, Loader2 } from 'lucide-react';
import { updateTopicContext } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';

interface TopicSettingsDialogProps {
    topicId: string;
    topicName: string;
    initialLessonPlan?: string;
}

export default function TopicSettingsDialog({
    topicId,
    topicName,
    initialLessonPlan = ""
}: TopicSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lessonPlan, setLessonPlan] = useState(initialLessonPlan);
    const router = useRouter();

    const handleSave = async () => {
        if (topicId === 'all') return;
        setLoading(true);
        try {
            const result = await updateTopicContext(Number(topicId), {
                lessonPlan
            });
            if (result.success) {
                setOpen(false);
                router.refresh();
            } else {
                alert(result.error || "Failed to update settings");
            }
        } catch (error) {
            console.error("Save settings error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    AI Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Tutor Settings: {topicName}</DialogTitle>
                    <DialogDescription>
                        Customize how the AI Tutor teaches this specific topic.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="lessonPlan">Lesson Plan / Curriculum</Label>
                        <Textarea
                            id="lessonPlan"
                            placeholder="1. Introduction to topic&#10;2. Core principles&#10;3. Practice problems..."
                            value={lessonPlan}
                            onChange={(e) => setLessonPlan(e.target.value)}
                            className="min-h-[150px]"
                        />
                        <p className="text-xs text-gray-400">
                            The AI will attempt to follow this structure during the lesson.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
