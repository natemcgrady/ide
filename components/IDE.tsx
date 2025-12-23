'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Language } from '@/lib/executor';
import type { CodeSnippet } from '@/lib/db/schema';
import Console from './Console';
import Toolbar from './Toolbar';
import SaveDialog from './SaveDialog';
import SnippetsList from './SnippetsList';
import languageTemplates from '@/lib/code-templates';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import('./Editor'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="text-[#8b949e]">Loading editor...</div>
    </div>
  ),
});

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

export default function IDE() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState<string>(languageTemplates.javascript);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  
  // Snippet management state
  const [currentSnippet, setCurrentSnippet] = useState<CodeSnippet | null>(null);
  const [savedCode, setSavedCode] = useState<string>('');
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [isLoadingSnippets, setIsLoadingSnippets] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSnippetsList, setShowSnippetsList] = useState(false);

  const hasUnsavedChanges = currentSnippet ? code !== savedCode : false;

  // Fetch snippets when opening the list
  const fetchSnippets = useCallback(async () => {
    setIsLoadingSnippets(true);
    try {
      const response = await fetch('/api/snippets');
      const data = await response.json();
      setSnippets(data);
    } catch (err) {
      console.error('Failed to fetch snippets:', err);
    } finally {
      setIsLoadingSnippets(false);
    }
  }, []);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(languageTemplates[newLanguage]);
    setCurrentSnippet(null);
    setSavedCode('');
    // Clear console when switching languages
    setOutput('');
    setError('');
    setExecutionTime(undefined);
  }, []);

  const handleCodeChange = useCallback((value: string | undefined) => {
    setCode(value || '');
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setExecutionTime(undefined);

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      const result: ExecutionResult = await response.json();
      
      setOutput(result.output);
      setError(result.error);
      setExecutionTime(result.executionTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  }, [code, language]);

  const handleClear = useCallback(() => {
    setOutput('');
    setError('');
    setExecutionTime(undefined);
  }, []);

  const handleSave = useCallback(async (name: string) => {
    try {
      if (currentSnippet) {
        // Update existing snippet
        const response = await fetch('/api/snippets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentSnippet.id,
            name,
            code,
            language,
          }),
        });
        const updated = await response.json();
        setCurrentSnippet(updated);
        setSavedCode(code);
      } else {
        // Create new snippet
        const response = await fetch('/api/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, code, language }),
        });
        const created = await response.json();
        setCurrentSnippet(created);
        setSavedCode(code);
      }
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  }, [code, language, currentSnippet]);

  const handleLoadSnippet = useCallback((snippet: CodeSnippet) => {
    setCode(snippet.code);
    setLanguage(snippet.language as Language);
    setCurrentSnippet(snippet);
    setSavedCode(snippet.code);
    setShowSnippetsList(false);
    setOutput('');
    setError('');
    setExecutionTime(undefined);
  }, []);

  const handleDeleteSnippet = useCallback(async (id: string) => {
    try {
      await fetch(`/api/snippets?id=${id}`, { method: 'DELETE' });
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      if (currentSnippet?.id === id) {
        setCurrentSnippet(null);
        setSavedCode('');
      }
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  }, [currentSnippet]);

  const handleOpenSaveDialog = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleOpenSnippetsList = useCallback(() => {
    fetchSnippets();
    setShowSnippetsList(true);
  }, [fetchSnippets]);

  // Keyboard shortcut for save (Cmd/Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (currentSnippet) {
          // Quick save if already has a name
          handleSave(currentSnippet.name);
        } else {
          setShowSaveDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSnippet, handleSave]);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      <Toolbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        onSave={handleOpenSaveDialog}
        onLoad={handleOpenSnippetsList}
        isRunning={isRunning}
        currentSnippetName={currentSnippet?.name}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
      {/* Main content area with resizable panels */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Editor Panel - 60% */}
        <div className="flex-6 min-h-0">
          <Editor
            code={code}
            language={language}
            onChange={handleCodeChange}
            onRun={handleRun}
          />
        </div>
        
        {/* Console Panel - 40% */}
        <div className="flex-4 min-h-0">
          <Console
            output={output}
            error={error}
            isRunning={isRunning}
            executionTime={executionTime}
            onClear={handleClear}
          />
        </div>
      </div>

      {/* Save Dialog */}
      <SaveDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
        defaultName={currentSnippet?.name || ''}
        isUpdating={!!currentSnippet}
      />

      {/* Snippets List */}
      <SnippetsList
        isOpen={showSnippetsList}
        onClose={() => setShowSnippetsList(false)}
        snippets={snippets}
        onLoad={handleLoadSnippet}
        onDelete={handleDeleteSnippet}
        isLoading={isLoadingSnippets}
      />
    </div>
  );
}
