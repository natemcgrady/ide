import type { Language } from '@/lib/executor';

const languageTemplates = {
  typescript: '',
  python: '',
} satisfies Record<Language, string>;

export default languageTemplates;