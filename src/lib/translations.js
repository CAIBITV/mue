import I18n from '@eartharoid/i18n';

import * as en_US from 'translations/en_US.json';
import * as zh_CN from 'translations/zh_CN.json';

/**
 * Initialise the i18n object.
 * The i18n object is then returned.
 * @param locale _ The locale to use.
 * @returns The i18n object.
 */
export function initTranslations(locale) {
  const safeLocale = locale === 'zh_CN' ? 'zh_CN' : 'en_US';
  const i18n = new I18n(safeLocale, {
    en_US,
    zh_CN,
  });

  return i18n;
}

export const translations = {
  en_US,
  zh_CN,
};
