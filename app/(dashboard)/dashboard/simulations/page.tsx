// app/(dashboard)/dashboard/simulations/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mic, Zap, BrainCircuit, Shield } from 'lucide-react';
import LiveSimulationComponent from '@/components/live-simulation-component'; // We will create/rename this next

// Define the type for the analysis result
type SimulationAnalysis = {
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    performanceScore: number;
};

type Difficulty = 'easy' | 'medium' | 'hard';

type SimulationState = 'selection' | 'active' | 'analyzing' | 'results';

/**
 * Builds the initial system prompt for the AI customer based on difficulty.
 * @param difficulty The chosen difficulty level.
 * @param salesManual The team's sales manual for context.
 * @returns A detailed string prompt.
 */
function buildSimulationPrompt(difficulty: Difficulty, salesManual: string | null): string {
    let customerPersona: string;

    switch (difficulty) {
        case 'medium':
            customerPersona = `You are a moderately interested but busy and skeptical customer. While you have a general need for the product, you are concerned about the price and the time it will take to implement. You will raise at least two common objections, such as "It costs too much," or "I need to think about it." You are not easily convinced and require the sales representative to demonstrate clear value.`;
            break;
        case 'hard':
            customerPersona = `You are a resistant and highly critical customer, possibly a gatekeeper. You are very skeptical of sales calls and believe your current situation is satisfactory. You will be dismissive initially and will raise at least three challenging or multi-part objections. You may test the sales representative's knowledge and patience. To be persuaded, the representative must be exceptionally persuasive, build strong rapport, and flawlessly handle your objections.`;
            break;
        case 'easy':
        default:
            customerPersona = `You are a friendly and interested customer. You have a clear need for the product and are actively seeking a solution. You are receptive to the sales pitch, asking positive and clarifying questions. You will present one minor, easily addressable objection. Your aim is to be a cooperative conversation partner.`;
            break;
    }

    return `
    ### AI Persona and Mission ###
    You are an AI-powered customer persona for a sales call simulation. Your identity and behavior are determined by the selected difficulty level. You must remain in character as this persona throughout the entire conversation and must not reveal that you are an AI. Your primary language for this interaction is English.
    
    Conversational Rules:
        Initiation: The simulation begins when the user, acting as the sales representative, starts the conversation. Do not speak first.
        Engagement Loop: Your primary task is to engage in a natural, spoken conversation with the sales representative. Listen to their pitch, respond to their questions, and act in accordance with your assigned character profile.

        ### Your Character Profile (Difficulty: ${difficulty}) ###
        ${customerPersona}

        Information Source: Your knowledge about the product and the company is based on the provided sales manual. Use this information to ask relevant questions and formulate realistic objections. If no sales manual is provided, you will improvise based on the context of a generic B2B software product.

    Guardrails:
        Stay in Character: You must not break character under any circumstances. If the user tries to get you to acknowledge that you are an AI, you should respond in a way that is consistent with your customer persona.
        No AI Revelation: Do not, under any circumstances, reveal that you are an AI or that this is a simulation.
        Realistic Objections: Your objections should be grounded in the information provided in the sales manual or be typical for the assigned customer persona.
        Natural Conversation Flow: Avoid robotic or unnatural responses. Strive for a conversational pace and tone that is appropriate for your persona.
    
    ### Product Knowledge ###
    You are being sold the product(s) described in the company's sales manual provided below. You should use this manual to understand the product features and company policies so you can ask relevant questions and raise realistic objections.
    ---
    ${salesManual || 'No sales manual provided. Improvise based on a generic B2B software product.'}
    ---

    ### Your Task ###
    Engage in a natural, spoken conversation with the sales representative (the user). Respond to their questions, listen to their pitch, and act according to your character profile. The simulation begins now. Wait for the user to speak first.
    `;
}


export default function SalesSimulationPage() {
    const [simulationState, setSimulationState] = useState<SimulationState>('selection');
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [manualText, setManualText] = useState<string | null>(null);
    const [isLoadingManual, setIsLoadingManual] = useState(true);
    const [isEndingSession, setIsEndingSession] = useState(false);
    const [analysis, setAnalysis] = useState<SimulationAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch the sales manual once on component load
    useEffect(() => {
        const fetchManual = async () => {
            setIsLoadingManual(true);
            try {
                const response = await fetch('/api/manual/get-manual');
                if (!response.ok) throw new Error('Failed to fetch sales manual.');
                const data = await response.json();
                setManualText(data.manualText);
            } catch (error) {
                console.error('Error fetching sales manual:', error);
                setManualText('The company sales manual could not be loaded.');
            } finally {
                setIsLoadingManual(false);
            }
        };
        fetchManual();
    }, []);

    const handleDifficultySelect = (level: Difficulty) => {
        setDifficulty(level);
        setSimulationState('active');
    };

    const handleEndSimulation = () => {
        setError(null);
        setIsEndingSession(true); // Signal the audio component to stop and return the blob
    };

    const handleConversationEnd = async (audioBlob: Blob) => {
        setSimulationState('analyzing');

        if (audioBlob.size < 1000) { // Simple check for empty audio
            setError("No audio was recorded. Please check your microphone and try again.");
            setSimulationState('results');
            return;
        }

        try {
            // We need to send the audio blob to our new API route for processing
            const formData = new FormData();
            formData.append('audio', audioBlob, 'simulation.webm');
            if (manualText) {
                formData.append('manual', manualText);
            }

            const response = await fetch('/api/simulations/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed.');
            }

            const result: SimulationAnalysis = await response.json();
            setAnalysis(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSimulationState('results');
            setIsEndingSession(false);
        }
    };
    
    const handleRestart = () => {
        setSimulationState('selection');
        setDifficulty(null);
        setAnalysis(null);
        setError(null);
    };

    if (isLoadingManual) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-4">Loading Sales Manual...</p>
            </div>
        );
    }

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-3xl mx-auto">
                {simulationState === 'selection' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Sales Call Simulation</CardTitle>
                            <CardDescription>Choose a difficulty level to start a live role-play session with an AI customer.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => handleDifficultySelect('easy')}>
                                <Shield className="h-6 w-6 text-green-500" /> Easy
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => handleDifficultySelect('medium')}>
                                <BrainCircuit className="h-6 w-6 text-yellow-500" /> Medium
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => handleDifficultySelect('hard')}>
                                <Zap className="h-6 w-6 text-red-500" /> Hard
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {simulationState === 'active' && difficulty && (
                    <div>
                        <div className="w-full h-[500px] relative rounded-lg overflow-hidden border">
                            <LiveSimulationComponent
                                prompt={buildSimulationPrompt(difficulty, manualText)}
                                onConversationEnd={handleConversationEnd}
                                isEnding={isEndingSession}
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <Button variant="destructive" onClick={handleEndSimulation} disabled={isEndingSession}>
                                {isEndingSession ? 'Processing...' : 'End Simulation & Analyze'}
                            </Button>
                        </div>
                    </div>
                )}
                
                {(simulationState === 'analyzing' || simulationState === 'results') && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Simulation Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {simulationState === 'analyzing' ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="mt-4">Transcribing and analyzing your performance...</p>
                                </div>
                            ) : error ? (
                                 <div className="text-red-600 p-4 bg-red-100 rounded-md">{error}</div>
                            ) : analysis && (
                                <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                                    <h3>Summary</h3>
                                    <p>{analysis.summary}</p>
                                    <h3>Strengths</h3>
                                    <ul>{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                    <h3>Areas for Improvement</h3>
                                    <ul>{analysis.areasForImprovement.map((a, i) => <li key={i}>{a}</li>)}</ul>
                                    <p><strong>Overall Performance Score:</strong> {analysis.performanceScore}/10</p>
                                </div>
                            )}
                            <div className="text-center">
                                <Button onClick={handleRestart}>Start New Simulation</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}