import variables from 'config/variables';
import { initTranslations } from 'lib/translations';

export function initLanguage() {
  const languagecode = localStorage.getItem('language') || 'en_GB';

  variables.language = initTranslations(languagecode);
  variables.languagecode = languagecode;
  document.documentElement.lang = languagecode.replace('_', '-');

  variables.getMessage = (text, optional) =>
    variables.language.getMessage(variables.languagecode, text, optional || {});

  return variables;
}
