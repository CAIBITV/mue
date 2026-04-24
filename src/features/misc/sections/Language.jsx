import variables from 'config/variables';
import { useState, useEffect, useRef } from 'react';

import { Radio } from 'components/Form/Settings';

import languages from '@/i18n/languages.json';

const SUPPORTED_QUOTE_LANGUAGE_CODES = {
  en: 'en_US',
  en_US: 'en_US',
  en_GB: 'en_US',
  zh: 'zh_CN',
  zh_CN: 'zh_CN',
  zh_Hant: 'zh_CN',
};

const LanguageOptions = () => {
  const [quoteLanguages, setQuoteLanguages] = useState([
    {
      name: variables.getMessage('modals.main.loading'),
      value: 'loading',
    },
  ]);

  const controllerRef = useRef(new AbortController());

  const getquoteLanguages = async () => {
    const data = await (
      await fetch(variables.constants.API_URL + '/quotes/languages', {
        signal: controllerRef.current.signal,
      })
    ).json();

    if (controllerRef.current.signal.aborted === true) {
      return;
    }

    const fetchedQuoteLanguages = data
      .filter((language) => SUPPORTED_QUOTE_LANGUAGE_CODES[language.name])
      .map((language) => {
        const normalizedCode = SUPPORTED_QUOTE_LANGUAGE_CODES[language.name];
        const matchedLanguage = languages.find((item) => item.value === normalizedCode);

        return {
          name: matchedLanguage ? matchedLanguage.name : 'English (US)',
          value: { ...language, name: normalizedCode },
        };
      });

    setQuoteLanguages(fetchedQuoteLanguages);
  };

  useEffect(() => {
    if (navigator.onLine === false || localStorage.getItem('offlineMode') === 'true') {
      setQuoteLanguages([
        {
          name: variables.getMessage('modals.main.marketplace.offline.description'),
          value: 'loading',
        },
      ]);
      return;
    }

    getquoteLanguages();

    return () => {
      // stop making requests
      controllerRef.current.abort();
    };
  }, []);

  return (
    <>
      <div className="modalHeader">
        <span className="mainTitle">
          {variables.getMessage('modals.main.settings.sections.language.title')}
        </span>
      </div>
      <div className="languageSettings">
        <Radio name="language" options={languages} element=".other" />
      </div>
      <span className="mainTitle">
        {variables.getMessage('modals.main.settings.sections.language.quote')}
      </span>
      <div className="languageSettings">
        <Radio
          name="quoteLanguage"
          options={quoteLanguages.map((language) => {
            return { name: language.name, value: language.value.name };
          })}
          defaultValue={quoteLanguages[0].name}
          category="quote"
        />
      </div>
    </>
  );
};

export { LanguageOptions as default, LanguageOptions };
