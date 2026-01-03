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
import { createTopic } from '@/app/(dashboard)/actions';
import { useRouter } from 'next/navigation';

interface NewTopicDialogProps {
    subject: string;
}

export default function NewTopicDialog({ subject }: NewTopicDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!name) return;
        setLoading(true);

        // Note: Assuming createTopic signature matches (subject, name).
        // If actions.ts was updated differently, this needs to match.
        const result = await createTopic(subject, name);

        setLoading(false);
        if (result.success) {
            setOpen(false);
            setName('');
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
