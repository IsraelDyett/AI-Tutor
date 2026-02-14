'use client';

import { useState, useEffect } from 'react';
import { ContextRenderer, ContextType } from './context-renderer';
import { X, History, Maximize2, Minimize2, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface VisualContext {
    id: string;
    type: ContextType;
    content: string;
    source: 'generated' | 'database' | 'upload';
    timestamp: Date;
}

interface ActiveContextPanelProps {
    contexts: VisualContext[];
    onClose?: () => void;
    isOpen: boolean;
}

export function ActiveContextPanel({ contexts, onClose, isOpen }: ActiveContextPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

    console.log('[ActiveContextPanel Debug] Render. isOpen:', isOpen, 'Contexts:', contexts.length);

    const currentContext = contexts[contexts.length - 1];
    const history = [...contexts].reverse().slice(1);

    // Auto-switch to current tab when a new context arrives
    useEffect(() => {
        setActiveTab('current');
    }, [contexts.length]);

    if (!isOpen && contexts.length === 0) return null;

    return (
        <div
            className={cn(
                "h-full w-full md:w-[400px] bg-[#1a1625]/95 backdrop-blur-xl border-l border-white/10 transition-all duration-500 ease-in-out z-[100] flex flex-col shadow-2xl relative overflow-hidden",
                !isOpen && "hidden md:flex md:w-0 md:opacity-0 md:border-0"
            )}
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest letter-spacing-wider font-outfit">
                        Active Context
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors md:hidden"
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-4">
                <button
                    onClick={() => setActiveTab('current')}
                    className={cn(
                        "px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                        activeTab === 'current' ? "text-white" : "text-white/40 hover:text-white/60"
                    )}
                >
                    {activeTab === 'current' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    Latest
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        "px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all relative flex items-center gap-2",
                        activeTab === 'history' ? "text-white" : "text-white/40 hover:text-white/60"
                    )}
                >
                    {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    History
                    {history.length > 0 && (
                        <span className="bg-white/10 text-white/60 px-1.5 py-0.5 rounded-full text-[10px]">
                            {history.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1 p-6">
                {activeTab === 'current' ? (
                    currentContext ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-full break-words">
                            <ContextRenderer
                                type={currentContext.type}
                                content={currentContext.content}
                                source={currentContext.source}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                <ChevronUp className="w-8 h-8 rotate-180" />
                            </div>
                            <p className="text-sm font-medium">Waiting for AI to share visual context...</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        {history.length > 0 ? (
                            history.map((ctx) => (
                                <div key={ctx.id} className="pb-6 border-b border-white/5 last:border-0 max-w-full break-words">
                                    <div className="flex items-center justify-between mb-3 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                                        <span>{ctx.type.replace('_', ' ')}</span>
                                        <span>{ctx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <ContextRenderer
                                        type={ctx.type}
                                        content={ctx.content}
                                        source={ctx.source}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-20">
                                <History className="w-12 h-12" />
                                <p className="text-sm font-medium">No history yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            {/* Mobile Drawer Trigger (when closed/minimized) */}
            {!isOpen && contexts.length > 0 && (
                <button
                    onClick={() => onClose?.()}
                    className="md:hidden fixed bottom-24 right-4 w-12 h-12 rounded-full bg-blue-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-white z-[90] animate-bounce"
                >
                    <div className="relative">
                        <Minimize2 size={24} className="rotate-45" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1625]" />
                    </div>
                </button>
            )}
        </div>
    );
}
