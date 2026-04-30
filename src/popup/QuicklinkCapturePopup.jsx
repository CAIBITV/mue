import { useEffect, useMemo, useState } from 'react';
import variables from 'config/variables';
import { createQuicklink } from 'features/quicklinks/options/utils/quicklinksUtils';
import { getGroups } from 'utils/quicklinks/quicklinkGroups';
import { isValidUrl } from 'utils/links';
import { uploadCurrentConfig } from 'utils/sync/configSyncService';

const DEFAULT_GROUP_KEY = 'all';
const extensionApi = globalThis.browser || globalThis.chrome;
const previewSearchParams = new URLSearchParams(window.location.search);
const isPreviewMode = previewSearchParams.get('preview') === '1';

const buildPreviewIcon = (label, background) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="18" fill="${background}" />
      <text
        x="50%"
        y="54%"
        font-size="28"
        text-anchor="middle"
        fill="white"
        font-family="Arial, sans-serif"
        font-weight="700"
      >
        ${label}
      </text>
    </svg>
  `)}`;

const queryActiveTab = async () => {
  if (!extensionApi?.tabs?.query) return null;

  const maybePromise = extensionApi.tabs.query({ active: true, currentWindow: true });
  if (maybePromise?.then) {
    const tabs = await maybePromise;
    return tabs?.[0] || null;
  }

  return await new Promise((resolve, reject) => {
    extensionApi.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const runtimeError = extensionApi.runtime?.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      resolve(tabs?.[0] || null);
    });
  });
};

const getInitialName = (tab) => {
  if (typeof tab?.title === 'string' && tab.title.trim().length > 0) {
    return tab.title.trim();
  }

  try {
    return new URL(tab?.url).hostname;
  } catch {
    return '';
  }
};

const getInitialIcon = (tab) => {
  if (typeof tab?.favIconUrl !== 'string' || tab.favIconUrl.trim().length === 0) {
    return '';
  }

  return isValidUrl(tab.favIconUrl) ? tab.favIconUrl : '';
};

const getUrlPreview = (rawUrl) => {
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl);
    const previewPath = `${parsed.pathname}${parsed.search}`.replace(/\/$/, '');
    return `${parsed.hostname}${previewPath}`.slice(0, 64);
  } catch {
    return rawUrl.slice(0, 64);
  }
};

const getInitials = (value = '') => {
  const cleaned = value.trim();
  if (!cleaned) return '+';
  return cleaned.slice(0, 1).toUpperCase();
};

export default function QuicklinkCapturePopup() {
  const [groups] = useState(() => getGroups());
  const [activeTab, setActiveTab] = useState(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(
    () => getGroups()[0]?.key || DEFAULT_GROUP_KEY,
  );
  const [selectedScenario, setSelectedScenario] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const previewScenarios = useMemo(
    () => [
      {
        key: 'default',
        label: variables.getMessage('widgets.quicklinks.capture.preview_scenarios.default'),
        tab: {
          title: 'OpenAI API Docs',
          url: 'https://platform.openai.com/docs/overview',
          favIconUrl: buildPreviewIcon('O', '#111827'),
        },
      },
      {
        key: 'long',
        label: variables.getMessage('widgets.quicklinks.capture.preview_scenarios.long'),
        tab: {
          title:
            'Designing Elegant Browser Extension Popups for Fast Quicklink Capture and Better Daily Workflows',
          url: 'https://example.com/articles/designing-elegant-browser-extension-popups-for-fast-quicklink-capture',
          favIconUrl: buildPreviewIcon('D', '#d96b2b'),
        },
      },
      {
        key: 'no-icon',
        label: variables.getMessage('widgets.quicklinks.capture.preview_scenarios.no_icon'),
        tab: {
          title: 'Internal Dashboard',
          url: 'https://workspace.example.com/dashboard',
          favIconUrl: '',
        },
      },
      {
        key: 'unsupported',
        label: variables.getMessage('widgets.quicklinks.capture.preview_scenarios.unsupported'),
        error: variables.getMessage('widgets.quicklinks.capture.page_unavailable'),
      },
    ],
    [],
  );

  useEffect(() => {
    if (isPreviewMode) {
      const scenario =
        previewScenarios.find((item) => item.key === selectedScenario) || previewScenarios[0];

      setIsLoading(false);
      setIsSaving(false);
      setIsSaved(false);
      setSelectedGroup(getGroups()[0]?.key || DEFAULT_GROUP_KEY);

      if (scenario?.error) {
        setActiveTab(null);
        setName('');
        setUrl('');
        setIcon('');
        setError(scenario.error);
        return;
      }

      setActiveTab(scenario.tab);
      setName(getInitialName(scenario.tab));
      setUrl(scenario.tab.url);
      setIcon(getInitialIcon(scenario.tab));
      setError('');
      return;
    }

    const loadActiveTab = async () => {
      try {
        const tab = await queryActiveTab();

        if (!tab?.url || !isValidUrl(tab.url)) {
          setError(variables.getMessage('widgets.quicklinks.capture.page_unavailable'));
          return;
        }

        setActiveTab(tab);
        setName(getInitialName(tab));
        setUrl(tab.url);
        setIcon(getInitialIcon(tab));
      } catch {
        setError(variables.getMessage('widgets.quicklinks.capture.page_unavailable'));
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveTab();
  }, [previewScenarios, selectedScenario]);

  const sourceLabel = useMemo(() => {
    if (!activeTab?.url) return '';

    try {
      return new URL(activeTab.url).hostname;
    } catch {
      return activeTab.url;
    }
  }, [activeTab]);

  const urlPreview = useMemo(() => getUrlPreview(url || activeTab?.url), [activeTab, url]);
  const iconPreview = icon.trim();

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const trimmedIcon = icon.trim();

    if (!trimmedName) {
      setError(variables.getMessage('widgets.quicklinks.name_error'));
      return;
    }

    if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
      setError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    if (trimmedIcon.length > 0 && !isValidUrl(trimmedIcon)) {
      setError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    setIsSaving(true);
    setError('');

    if (isPreviewMode) {
      setTimeout(() => {
        setIsSaving(false);
        setIsSaved(true);
      }, 180);
      return;
    }

    createQuicklink({
      name: trimmedName,
      url: trimmedUrl,
      icon: trimmedIcon,
      group: selectedGroup,
    });

    try {
      await uploadCurrentConfig();
    } catch (syncError) {
      console.warn('Failed to upload quicklink config from popup.', syncError);
    }

    variables.stats.postEvent('feature', 'Quicklink add from popup');
    setIsSaved(true);
    setTimeout(() => window.close(), 450);
  };

  return (
    <main className="quicklinkCapturePopup">
      <section className="quicklinkCaptureCard">
        {isPreviewMode && (
          <div className="quicklinkCapturePreviewBar">
            <div className="quicklinkCapturePreviewMeta">
              <span className="badge">
                {variables.getMessage('widgets.quicklinks.capture.preview_mode')}
              </span>
              <span className="notice">
                {variables.getMessage('widgets.quicklinks.capture.preview_notice')}
              </span>
            </div>
            <div className="quicklinkCaptureScenario">
              <span>{variables.getMessage('widgets.quicklinks.capture.preview_scenario')}</span>
              <div className="quicklinkCaptureScenarioGrid">
                {previewScenarios.map((scenario) => (
                  <button
                    key={scenario.key}
                    type="button"
                    className={selectedScenario === scenario.key ? 'active' : ''}
                    onClick={() => setSelectedScenario(scenario.key)}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <header className="quicklinkCaptureHeader">
          <div className="quicklinkCaptureTitleBlock">
            <h1>{variables.getMessage('widgets.quicklinks.capture.title')}</h1>
            <p>{variables.getMessage('widgets.quicklinks.capture.description')}</p>
          </div>
        </header>

        {isLoading ? (
          <div className="quicklinkCaptureState">
            {variables.getMessage('modals.main.loading')}
          </div>
        ) : error && !activeTab ? (
          <div className="quicklinkCaptureState quicklinkCaptureStateError">{error}</div>
        ) : (
          <>
            <div className="quicklinkCaptureSnapshot">
              <div className="quicklinkCaptureFavicon">
                {iconPreview ? (
                  <img src={iconPreview} alt={sourceLabel || variables.getMessage('widgets.quicklinks.name')} />
                ) : (
                  <span>{getInitials(name || sourceLabel)}</span>
                )}
              </div>
              <div className="quicklinkCaptureSnapshotBody">
                <span className="quicklinkCaptureSnapshotDomain">{sourceLabel}</span>
                <strong>{name || variables.getMessage('widgets.quicklinks.capture.title')}</strong>
                <span className="quicklinkCaptureSnapshotUrl">{urlPreview}</span>
              </div>
            </div>
            <div className="quicklinkCaptureForm">
              <label className="quicklinkCaptureField">
                <span>{variables.getMessage('widgets.quicklinks.name')}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="quicklinkCaptureField">
                <span>{variables.getMessage('widgets.quicklinks.url')}</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} />
              </label>
              <div className="quicklinkCaptureFieldGrid">
                <label className="quicklinkCaptureField">
                  <span>{variables.getMessage('widgets.quicklinks.icon')}</span>
                  <input value={icon} onChange={(event) => setIcon(event.target.value)} />
                </label>
                <label className="quicklinkCaptureField">
                  <span>{variables.getMessage('widgets.quicklinks.capture.group')}</span>
                  <select
                    value={selectedGroup}
                    onChange={(event) => setSelectedGroup(event.target.value)}
                  >
                    {groups.map((group) => (
                      <option key={group.key} value={group.key}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {error ? <div className="quicklinkCaptureError">{error}</div> : null}
            <div className="quicklinkCaptureActions">
              <button
                type="button"
                className="secondary"
                onClick={() => window.close()}
                disabled={isSaving}
              >
                {variables.getMessage('modals.welcome.buttons.close')}
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving || isSaved}>
                {isSaved
                  ? variables.getMessage('widgets.quicklinks.capture.saved')
                  : variables.getMessage('widgets.quicklinks.add')}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
