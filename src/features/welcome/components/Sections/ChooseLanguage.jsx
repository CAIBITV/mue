import variables from 'config/variables';
import languages from '@/i18n/languages.json';

import { Radio } from 'components/Form/Settings';
import { Header, Content } from '../Layout';

function ChooseLanguage() {
  return (
    <Content>
      <Header
        title={variables.getMessage('modals.welcome.sections.language.title')}
        subtitle={variables.getMessage('modals.welcome.sections.language.description')}
      />
      <div className="languageSettings">
        <Radio name="language" options={languages} category="welcomeLanguage" />
      </div>
    </Content>
  );
}

export { ChooseLanguage as default, ChooseLanguage };
