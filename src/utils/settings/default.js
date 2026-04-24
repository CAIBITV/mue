import defaultSettings from 'utils/data/default_settings.json';
import languages from 'i18n/languages.json';
import variables from 'config/variables';

/**
 * It sets the default settings for the extension
 * @param reset - boolean
 */
export function setDefaultSettings(reset) {
  localStorage.clear();
  defaultSettings.forEach((element) => localStorage.setItem(element.name, element.value));

  // Languages
  const browserLanguage = (navigator.language || 'en-US').replace('-', '_');
  const browserLanguages = (navigator.languages || []).map((lang) => lang.replace('-', '_'));
  const prefersChinese =
    browserLanguage.startsWith('zh') || browserLanguages.some((lang) => lang.startsWith('zh'));
  const fallbackLanguage = prefersChinese ? 'zh_CN' : 'en_US';

  if (languages.some(({ value }) => value === fallbackLanguage)) {
    localStorage.setItem('language', fallbackLanguage);
  } else {
    localStorage.setItem('language', 'en_US');
  }

  localStorage.setItem('tabName', variables.getMessage('tabname'));

  if (reset) {
    localStorage.setItem('showWelcome', false);
  }

  // finally we set this to true so it doesn't run the function on every load
  localStorage.setItem('firstRun', true);
}
