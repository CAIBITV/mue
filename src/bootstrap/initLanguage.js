import variables from 'config/variables';
import { initTranslations } from 'lib/translations';

const SUPPORTED_LANGUAGES = ['en_US', 'zh_CN'];

export function initLanguage() {
  const storedLanguage = localStorage.getItem('language');
  const normalizedLanguage =
    storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)
      ? storedLanguage
      : storedLanguage?.startsWith('zh')
        ? 'zh_CN'
        : 'en_US';

  if (storedLanguage !== normalizedLanguage) {
    localStorage.setItem('language', normalizedLanguage);
  }

  variables.language = initTranslations(normalizedLanguage);
  variables.languagecode = normalizedLanguage;
  document.documentElement.lang = normalizedLanguage.replace('_', '-');

  variables.getMessage = (text, optional) =>
    variables.language.getMessage(variables.languagecode, text, optional || {});

  return variables;
}
