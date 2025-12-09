import variables from 'config/variables';
import { memo } from 'react';

import Tabs from 'components/Elements/MainModal/backend/Tabs';

import { NavbarOptions } from 'features/navbar';
import { GreetingOptions } from 'features/greeting';
import { TimeOptions, DateOptions } from 'features/time';
import { QuickLinksOptions } from 'features/quicklinks';
import { QuoteOptions } from 'features/quote';
import { MessageOptions } from 'features/message';
import { BackgroundOptions } from 'features/background';
import { SearchOptions } from 'features/search';
import { WeatherOptions } from 'features/weather';
import { Stats } from 'features/stats';
import {
  About,
  AdvancedOptions,
  AppearanceOptions,
  Changelog,
  ExperimentalOptions,
  LanguageOptions,
  Overview,
} from '../sections';
import { SETTINGS_SECTION_LABELS } from '../constants/settingsSections';

const SECTION_COMPONENTS = {
  order: Overview,
  navbar: NavbarOptions,
  greeting: GreetingOptions,
  time: TimeOptions,
  quicklinks: QuickLinksOptions,
  quote: QuoteOptions,
  date: DateOptions,
  message: MessageOptions,
  background: BackgroundOptions,
  search: SearchOptions,
  weather: WeatherOptions,
  appearance: AppearanceOptions,
  language: LanguageOptions,
  advanced: AdvancedOptions,
  stats: Stats,
  experimental: ExperimentalOptions,
  changelog: Changelog,
  about: About,
};

function Settings(props) {
  return (
    <Tabs
      changeTab={(type) => props.changeTab(type)}
      current="settings"
      currentTab={props.currentTab}
      onSectionChange={props.onSectionChange}
      activeSection={props.activeSection}
    >
      {SETTINGS_SECTION_LABELS.map(({ labelKey, name }) => {
        const Component = SECTION_COMPONENTS[name];
        if (!Component) {
          return null;
        }

        return (
          <div key={name} label={variables.getMessage(labelKey)} name={name}>
            <Component />
          </div>
        );
      })}
    </Tabs>
  );
}

export default memo(Settings);
