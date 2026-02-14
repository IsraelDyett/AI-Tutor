'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Loader2 } from 'lucide-react';

interface MermaidRendererProps {
    chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                    fontFamily: 'Outfit, sans-serif',
                });
                initialized.current = true;
            } catch (e) {
                console.warn('Mermaid initialization warning:', e);
            }
        }
    }, []);

    useEffect(() => {
        const renderChart = async () => {
            if (!chart) return;
            setIsLoading(true);
            setError(null);

            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError('Failed to render diagram. Please try again.');
                // Reset mermaid to prevent it from crashing on subsequent renders
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                    fontFamily: 'Outfit, sans-serif',
                });

            } finally {
                setIsLoading(false);
            }
        };

        renderChart();
    }, [chart]);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
                <pre className="mt-2 text-xs opacity-50 overflow-x-auto">{chart}</pre>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="mermaid-container w-full overflow-x-auto p-4 bg-white/5 rounded-xl border border-white/10 flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
