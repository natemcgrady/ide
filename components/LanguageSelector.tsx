'use client';

import type { Language } from '@/lib/executor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  language: Language;
  onChange: (language: Language) => void;
}

const languages: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
];

export default function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <Select value={language} onValueChange={(value) => onChange(value as Language)}>
      <SelectTrigger className="w-[140px] bg-secondary">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
