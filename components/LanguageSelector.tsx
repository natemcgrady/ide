'use client';

import type { Language } from '@/lib/executor';

interface LanguageSelectorProps {
  language: Language;
  onChange: (language: Language) => void;
}

const languages: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'typescript', label: 'TypeScript', icon: 'TS' },
  { value: 'python', label: 'Python', icon: 'PY' },
  { value: 'go', label: 'Go', icon: 'GO' },
];

export default function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <select
      value={language}
      onChange={(e) => onChange(e.target.value as Language)}
      className="px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded-md text-sm text-[#c9d1d9] 
                 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent
                 cursor-pointer hover:bg-[#30363d] transition-colors"
    >
      {languages.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

