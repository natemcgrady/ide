'use client';

import MonacoEditor from '@monaco-editor/react';
import type { Language } from '@/lib/executor';

interface EditorProps {
  code: string;
  language: Language;
  onChange: (value: string | undefined) => void;
  onRun: () => void;
}

const languageMap: Record<Language, string> = {
  typescript: 'typescript',
  python: 'python',
};

export default function Editor({ code, language, onChange, onRun }: EditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
  };

  return (
    <div
      className="h-full w-full"
      onKeyDown={handleKeyDown}
    >
      <MonacoEditor
        height="100%"
        language={languageMap[language]}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}

