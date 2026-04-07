"use client";

import React, { useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { getIngestorMetadata } from '@/app/(dashboard)/actions'; // Import the action

export default function PastPaperIngestPage() {
  const [file, setFile] = useState<File | null>(null);
  
  // Dynamic Lists
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [levelsList, setLevelsList] = useState<string[]>([]);
  
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Fetch metadata on mount
  useEffect(() => {
    async function loadMetadata() {
        const data = await getIngestorMetadata();
        setSubjectsList(data.subjects);
        setLevelsList(data.levels);
        
        // Set initial defaults from the DB values
        if (data.subjects.length > 0) setSubject(data.subjects[0]);
        if (data.levels.length > 0) setLevel(data.levels[0]);
    }
    loadMetadata();
  }, []);

  const toBase64 = (file: File): Promise<string> => 
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subject || !level) return;

    setStatus('uploading');
    setMessage('AI is reading the PDF and generating questions...');

    try {
      const base64Data = await toBase64(file);

      const response = await fetch('/api/ai/admin/ingest-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfData: base64Data,
          subject,
          level,
          year,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`Successfully ingested ${data.count} questions. AI will generate search vectors in the background.`);
        setFile(null);
      } else {
        throw new Error(data.error || 'Failed to process paper');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Past Paper AI Ingestor</h1>
          <p className="text-gray-500">Select the subject and level from your database to categorize this paper correctly.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Dynamic Subject Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white"
                disabled={subjectsList.length === 0}
              >
                {subjectsList.length === 0 ? (
                    <option>Loading subjects...</option>
                ) : (
                    subjectsList.map(s => <option key={s} value={s}>{s}</option>)
                )}
              </select>
            </div>

            {/* Dynamic Level Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white"
                disabled={levelsList.length === 0}
              >
                {levelsList.length === 0 ? (
                    <option>Loading levels...</option>
                ) : (
                    levelsList.map(l => <option key={l} value={l}>{l}</option>)
                )}
              </select>
            </div>

            {/* Year Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input 
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Paper PDF</label>
            <div className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                {file ? (
                  <>
                    <FileText className="mx-auto h-12 w-12 text-blue-500" />
                    <p className="text-sm font-medium text-blue-700">{file.name}</p>
                    <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 underline">Remove file</button>
                  </>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400">Official Past Paper PDF only</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {status !== 'idle' && (
            <div className={`p-4 rounded-md flex items-center gap-3 ${
              status === 'uploading' ? 'bg-blue-50 text-blue-700' :
              status === 'success' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              {status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5" />}
              {status === 'error' && <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-medium">{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || status === 'uploading' || !subject || !level}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            {status === 'uploading' ? "Processing..." : "Start AI Ingestion"}
          </button>
        </form>
      </div>
    </div>
  );
}