import { useEffect, useState } from 'react';
import variables from 'config/variables';
import { MdOutlineWarning, MdAdd, MdDelete, MdClose } from 'react-icons/md';
import Modal from 'react-modal';

import { Header, Row, Content, Action, PreferencesWrapper } from 'components/Layout/Settings';
import { Checkbox } from 'components/Form/Settings';
import { Button } from 'components/Elements';

import { getSearchEngines, addCustomEngine, removeEngine } from 'utils/search/searchUtils';

const SearchOptions = () => {
  const SEARCH_SECTION = 'modals.main.settings.sections.search';
  const getSearchMessage = (key, fallback) => {
    const message = variables.getMessage(key);
    return message || fallback;
  };

  const ChromePolicyWarning = () => {
    return (
      <div className="itemWarning" style={{ marginBottom: '20px' }}>
        <MdOutlineWarning />
        <div className="text">
          <span className="header">Search Engine Selection Removed</span>
          <span>{variables.getMessage(`${SEARCH_SECTION}.chrome_policy_warning`)}</span>
        </div>
      </div>
    );
  };

  const AdditionalOptions = () => {
    return (
      <Row final={true}>
        <Content
          title={variables.getMessage('modals.main.settings.additional_settings')}
          subtitle={variables.getMessage(`${SEARCH_SECTION}.additional`)}
        />
        <Action>
          {/* not supported on firefox */}
          {navigator.userAgent.includes('Chrome') && typeof InstallTrigger === 'undefined' ? (
            <Checkbox
              name="voiceSearch"
              text={variables.getMessage(`${SEARCH_SECTION}.voice_search`)}
              category="search"
            />
          ) : null}
          <Checkbox
            name="searchFocus"
            text={variables.getMessage(`${SEARCH_SECTION}.focus`)}
            category="search"
            element=".other"
          />
        </Action>
      </Row>
    );
  };

  const SearchEngineManagement = () => {
    const [engines, setEngines] = useState(() => getSearchEngines());
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({ name: '', url: '', icon: '' });
    const [formErrors, setFormErrors] = useState({ name: '', url: '' });

    useEffect(() => {
      if (typeof window === 'undefined') {
        return undefined;
      }

      const handleUpdate = () => {
        setEngines(getSearchEngines());
      };

      window.addEventListener('searchEnginesUpdated', handleUpdate);
      return () => {
        window.removeEventListener('searchEnginesUpdated', handleUpdate);
      };
    }, []);

    const isBuiltinEngine = (engine) => engine?.key?.startsWith('builtin_');

    const openModal = () => {
      setFormData({ name: '', url: '', icon: '' });
      setFormErrors({ name: '', url: '' });
      setModalVisible(true);
    };

    const closeModal = () => {
      setModalVisible(false);
      setFormErrors({ name: '', url: '' });
    };

    const handleFieldChange = (field, value) => {
      setFormData((previous) => ({ ...previous, [field]: value }));
      setFormErrors((previous) => ({ ...previous, [field]: '' }));
    };

    const handleRemove = (engine) => {
      if (!engine || isBuiltinEngine(engine)) {
        return;
      }

      removeEngine(engine.key);
      setEngines(getSearchEngines());
    };

    const handleSubmit = (event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }

      const trimmedName = formData.name.trim();
      const trimmedUrl = formData.url.trim();
      const trimmedIcon = formData.icon.trim();
      const errors = { name: '', url: '' };

      if (!trimmedName) {
        errors.name = '请输入搜索引擎名称';
      }

      if (!trimmedUrl) {
        errors.url = '请输入搜索 URL';
      } else if (!trimmedUrl.includes('{query}')) {
        errors.url = 'URL 需要包含 {query} 占位符';
      }

      if (errors.name || errors.url) {
        setFormErrors(errors);
        return;
      }

      addCustomEngine(trimmedName, trimmedUrl, trimmedIcon);
      setEngines(getSearchEngines());
      setFormData({ name: '', url: '', icon: '' });
      setFormErrors({ name: '', url: '' });
      setModalVisible(false);
    };

    const renderIcon = (engine) => {
      if (engine?.icon) {
        return <img src={engine.icon} alt={engine.name} className="engine-icon" />;
      }

      return (
        <div className="engine-icon placeholder" aria-hidden="true">
          {engine?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      );
    };

    const managementTitle = getSearchMessage(
      `${SEARCH_SECTION}.engine_management.title`,
      '搜索引擎管理',
    );
    const managementSubtitle = getSearchMessage(
      `${SEARCH_SECTION}.engine_management.subtitle`,
      '查看当前搜索引擎列表并添加自定义引擎',
    );
    const addButtonLabel = getSearchMessage(
      `${SEARCH_SECTION}.engine_management.add`,
      '添加自定义搜索引擎',
    );

    return (
      <>
        <Row>
          <Content title={managementTitle} subtitle={managementSubtitle} />
          <Action>
            <div className="search-engines-list">
              {engines.map((engine) => (
                <div className="search-engine-item" key={engine.key}>
                  {renderIcon(engine)}
                  <div className="engine-info">
                    <span className="engine-name">{engine.name}</span>
                    <span className="engine-url">{engine.url}</span>
                  </div>
                  {isBuiltinEngine(engine) ? (
                    <span className="engine-badge">
                      {getSearchMessage(`${SEARCH_SECTION}.engine_management.builtin`, '内置')}
                    </span>
                  ) : (
                    <Button
                      type="icon"
                      icon={<MdDelete />}
                      tooltipTitle={getSearchMessage(
                        `${SEARCH_SECTION}.engine_management.remove`,
                        '删除搜索引擎',
                      )}
                      onClick={() => handleRemove(engine)}
                    />
                  )}
                </div>
              ))}
              {engines.length === 0 && (
                <div className="search-engine-empty">
                  {getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.empty`,
                    '暂无可用搜索引擎，请先添加自定义搜索引擎。',
                  )}
                </div>
              )}
            </div>
            <Button type="settings" icon={<MdAdd />} label={addButtonLabel} onClick={openModal} />
          </Action>
        </Row>
        <Modal
          closeTimeoutMS={100}
          onRequestClose={closeModal}
          isOpen={modalVisible}
          className="Modal resetmodal mainModal"
          overlayClassName="Overlay resetoverlay"
          ariaHideApp={false}
        >
          <div className="addLinkModal search-engine-modal">
            <div className="shareHeader">
              <span className="title">
                {getSearchMessage(
                  `${SEARCH_SECTION}.engine_management.add_modal_title`,
                  '添加自定义搜索引擎',
                )}
              </span>
              <div className="close" onClick={closeModal} aria-label="关闭">
                <MdClose />
              </div>
            </div>
            <form className="search-engine-form" onSubmit={handleSubmit}>
              <label className="search-engine-field">
                <span>
                  {getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.fields.name`,
                    '搜索引擎名称',
                  )}
                </span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => handleFieldChange('name', event.target.value)}
                  placeholder={getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.fields.name_placeholder`,
                    '例如：My Search',
                  )}
                />
                {formErrors.name && <span className="dropdown-error">{formErrors.name}</span>}
              </label>
              <label className="search-engine-field">
                <span>
                  {getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.fields.url`,
                    '搜索 URL',
                  )}
                </span>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(event) => handleFieldChange('url', event.target.value)}
                  placeholder="https://example.com/search?q={query}"
                />
                <span className="field-hint">
                  {getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.fields.url_hint`,
                    '请使用 {query} 作为关键词占位符，例如：https://example.com?q={query}',
                  )}
                </span>
                {formErrors.url && <span className="dropdown-error">{formErrors.url}</span>}
              </label>
              <label className="search-engine-field">
                <span>
                  {getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.fields.icon`,
                    '图标 URL（可选）',
                  )}
                </span>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(event) => handleFieldChange('icon', event.target.value)}
                  placeholder="https://example.com/favicon.ico"
                />
              </label>
              <div className="search-engine-form-actions">
                <Button
                  type="settings"
                  icon={<MdAdd />}
                  label={getSearchMessage(
                    `${SEARCH_SECTION}.engine_management.save`,
                    '保存搜索引擎',
                  )}
                  onClick={handleSubmit}
                />
              </div>
            </form>
          </div>
        </Modal>
      </>
    );
  };

  return (
    <>
      <Header
        title={variables.getMessage(`${SEARCH_SECTION}.title`)}
        setting="searchBar"
        category="widgets"
        visibilityToggle={true}
      />
      <PreferencesWrapper setting="searchBar" category="widgets" visibilityToggle={true}>
        <ChromePolicyWarning />
        <SearchEngineManagement />
        <AdditionalOptions />
      </PreferencesWrapper>
    </>
  );
};

export { SearchOptions as default, SearchOptions };
