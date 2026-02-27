'use client';

import type { Language } from '@/lib/executor';
import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/lib/languages';
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

const languageLabels: Record<SupportedLanguage, string> = {
  typescript: 'TypeScript',
  python: 'Python',
};

const languages: { value: Language; label: string }[] = SUPPORTED_LANGUAGES.map((value) => ({
  value,
  label: languageLabels[value],
}));

export default function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <Select value={language} onValueChange={(value) => onChange(value as Language)}>
      <SelectTrigger className="w-[140px] border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 hover:border-muted-foreground/30 [&_svg]:opacity-100">
        <SelectValue placeholder="Select language">
          {language && isSupportedLanguage(language)
            ? languageLabels[language]
            : undefined}
        </SelectValue>
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
