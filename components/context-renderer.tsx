'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Quote, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { MermaidRenderer } from './mermaid-renderer';

export type ContextType = 'formula' | 'source_text' | 'diagram' | 'summary' | 'loading' | 'mermaid';

interface ContextRendererProps {
    type: ContextType;
    content?: string;
    source?: 'generated' | 'database' | 'upload';
    isLoading?: boolean;
}

export function ContextRenderer({ type, content, source, isLoading }: ContextRendererProps) {
    // Helper to ensure math is surrounded by delimiters
    const normalizeMath = (text: string) => {
        if (!text) return '';
        // If it looks like LaTeX but lacks delimiters, wrap it
        if ((text.includes('\\') || text.includes('frac')) && !text.includes('$')) {
            return `$$${text}$$`;
        }
        return text;
    };

    if (isLoading || type === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                <p className="text-sm text-white/40 font-medium">Searching knowledge base...</p>
            </div>
        );
    }

    if (!content) return null;

    switch (type) {
        case 'mermaid':
            return <MermaidRenderer chart={content} />;

        case 'formula':
            return (
                <div className="max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ children }) => <p className="mb-4 last:mb-0 text-white leading-relaxed font-outfit">{children}</p>,
                            h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4 font-outfit">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-3 font-outfit">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-md font-bold text-white mb-2 font-outfit">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-white/90 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-white/90 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-white/90 font-outfit">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-white">{children}</em>,
                            code: ({ node, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                if (match && match[1] === 'mermaid') {
                                    return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
                                }
                                return <code className={className} {...props}>{children}</code>;
                            }
                        }}
                    >
                        {normalizeMath(content || '')}
                    </ReactMarkdown>
                </div>
            );

        case 'source_text':
            return (
                <div className="relative p-4 rounded-xl bg-white/5 border border-white/10 group overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Quote size={40} className="text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-white/40 font-bold text-[10px] uppercase tracking-wider">
                        <FileText size={12} />
                        <span>Found in context</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed font-outfit italic">
                        "{content}"
                    </p>
                </div>
            );

        case 'diagram':
            // Logic: If it starts with http, it's an image. If it starts with 'graph', 'sequenceDiagram', etc., it's mermaid.
            // But usually type should be explicit.
            if (content?.startsWith('http')) {
                return (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                        <img
                            src={content}
                            alt="Context Diagram"
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/600x400/100c14/white?text=Image+Not+Found';
                            }}
                        />
                    </div>
                );
            }
            // Fallback for direct mermaid code in 'diagram' type
            return <MermaidRenderer chart={content} />;

        case 'summary':
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white/40 font-bold text-[10px] uppercase tracking-wider">
                        <FileText size={12} />
                        <span>Quick Summary</span>
                    </div>
                    <p className="text-base text-white/90 leading-relaxed font-outfit">
                        {content}
                    </p>
                </div>
            );

        default:
            return <p className="text-white/60">{content}</p>;
    }
}
