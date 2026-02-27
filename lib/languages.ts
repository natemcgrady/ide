export const SUPPORTED_LANGUAGES = ['typescript', 'python'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

export function inferLanguageFromTitle(title: string): SupportedLanguage {
  const normalized = title.trim().toLowerCase();
  const extension = normalized.split(".").pop();

  if (extension === "py") {
    return "python";
  }

  return "typescript";
}
