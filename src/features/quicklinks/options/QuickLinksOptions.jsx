import variables from 'config/variables';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MdAddLink, MdLinkOff, MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { arrayMove } from '@dnd-kit/sortable';
import { Header, Row, Content, Action, PreferencesWrapper } from 'components/Layout/Settings';
import { Checkbox, Dropdown, Slider } from 'components/Form/Settings';
import { Button, Tooltip } from 'components/Elements';
import Modal from 'react-modal';

import { AddModal } from 'components/Elements/AddModal';
import { SortableList } from './components';
import {
  createQuicklink,
  deleteQuicklink,
  isValidQuicklinkUrl,
  normalizeQuicklinkIcon,
  normalizeQuicklinkUrl,
  readQuicklinks,
  updateQuicklink,
} from './utils/quicklinksUtils';
import {
  getGroups,
  addGroup,
  updateGroup,
  removeGroup,
  getQuicklinksLayout,
  setQuicklinksLayout,
  DEFAULT_QUICKLINKS_LAYOUT,
} from 'utils/quicklinks/quicklinkGroups';

import EventBus from 'utils/eventbus';
import { getTitleFromUrl, isValidUrl } from 'utils/links';

const QuickLinksOptions = () => {
  const [items, setItems] = useState(readQuicklinks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [iconError, setIconError] = useState('');
  const [edit, setEdit] = useState(false);
  const [editData, setEditData] = useState('');
  const [enabled, setEnabled] = useState(localStorage.getItem('quicklinksenabled') !== 'false');
  const [groups, setGroups] = useState(() => getGroups());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', color: '#888888' });
  const [activeGroup, setActiveGroup] = useState(null);
  const [layoutConfig, setLayoutConfig] = useState(() => getQuicklinksLayout());

  const quicklinksContainer = useRef();
  const silenceEventRef = useRef(false);
  const DEFAULT_GROUP_KEY = 'all';
  const updateLayoutConfig = useCallback((updater) => {
    setLayoutConfig((prev) => {
      const nextState =
        typeof updater === 'function' ? updater(prev || DEFAULT_QUICKLINKS_LAYOUT) : { ...prev, ...updater };
      return setQuicklinksLayout(nextState);
    });
  }, []);

  const getGroupMessage = (key, fallback) => {
    const value = variables.getMessage(key);
    return value || fallback;
  };

  const setContainerDisplay = (enabled) => {
    if (!quicklinksContainer || !quicklinksContainer.current) return;
    const el = quicklinksContainer.current;
    el.classList.toggle('disabled', !enabled);
    if (!enabled) {
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.removeAttribute('aria-hidden');
    }
  };

  const deleteLink = (key, event) => {
    event.preventDefault();

    const data = deleteQuicklink(key);
    silenceEventRef.current = true;
    setItems(data);
    variables.stats.postEvent('feature', 'Quicklink delete');
    setTimeout(() => {
      silenceEventRef.current = false;
    }, 0);
  };

  const addLink = async (name, url, icon, groupKey = DEFAULT_GROUP_KEY) => {
    const data = readQuicklinks();
    const nextUrl = normalizeQuicklinkUrl(url);
    const nextIcon = normalizeQuicklinkIcon(icon);

    if (nextUrl.length <= 0 || isValidQuicklinkUrl(nextUrl) === false) {
      setUrlError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    if (
      nextIcon.type === 'url' &&
      nextIcon.value.length > 0 &&
      isValidUrl(nextIcon.value) === false
    ) {
      setIconError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    const nextGroup =
      typeof groupKey === 'string' && groupKey.trim().length > 0 ? groupKey : DEFAULT_GROUP_KEY;

    const createdQuicklink = createQuicklink({
      name: name || (await getTitleFromUrl(nextUrl)),
      url: nextUrl,
      icon: nextIcon,
      group: nextGroup,
    });

    silenceEventRef.current = true;
    setItems([...data, createdQuicklink]);
    setShowAddModal(false);
    setUrlError('');
    setIconError('');
    variables.stats.postEvent('feature', 'Quicklink add');
    setTimeout(() => {
      silenceEventRef.current = false;
    }, 0);

    return createdQuicklink;
  };

  const startEditLink = (data) => {
    setEdit(true);
    setEditData(data);
    setShowAddModal(true);
  };

  const editLink = async (og, name, url, icon, groupKey = og?.group || DEFAULT_GROUP_KEY) => {
    const data = readQuicklinks();
    const exists = data.some((item) => item.key === og.key);
    if (!exists) return;

    const nextUrl = normalizeQuicklinkUrl(url);
    const nextIcon = normalizeQuicklinkIcon(icon);

    if (nextUrl.length <= 0 || isValidQuicklinkUrl(nextUrl) === false) {
      setUrlError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    if (
      nextIcon.type === 'url' &&
      nextIcon.value.length > 0 &&
      isValidUrl(nextIcon.value) === false
    ) {
      setIconError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    const nextGroup =
      typeof groupKey === 'string' && groupKey.trim().length > 0 ? groupKey : og.group || DEFAULT_GROUP_KEY;

    const updatedQuicklink = updateQuicklink(og.key, {
      name: name || (await getTitleFromUrl(nextUrl)),
      url: nextUrl,
      icon: nextIcon,
      group: nextGroup,
    });

    if (!updatedQuicklink) return;

    silenceEventRef.current = true;
    setItems(data.map((item) => (item.key === og.key ? updatedQuicklink : item)));
    setShowAddModal(false);
    setEdit(false);
    setTimeout(() => {
      silenceEventRef.current = false;
    }, 0);

    return updatedQuicklink;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || !enabled) return;
    if (active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.key === active.id);
    const newIndex = items.findIndex((item) => item.key === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(items, oldIndex, newIndex);

    silenceEventRef.current = true;
    setItems(newItems);
    localStorage.setItem('quicklinks', JSON.stringify(newItems));
    EventBus.emit('refresh', 'quicklinks');
    setTimeout(() => {
      silenceEventRef.current = false;
    }, 0);
  };

  useEffect(() => {
    setContainerDisplay(enabled);
  }, [enabled]);

  useEffect(() => {
    const handleGroupRefresh = (data) => {
      if (data !== 'quicklinkGroups') return;
      setGroups(getGroups());
    };

    EventBus.on('refresh', handleGroupRefresh);
    return () => {
      EventBus.off('refresh', handleGroupRefresh);
    };
  }, []);

  useEffect(() => {
    const handleLayoutRefresh = (data) => {
      if (data !== 'quicklinksLayout') return;
      setLayoutConfig(getQuicklinksLayout());
    };

    EventBus.on('refresh', handleLayoutRefresh);
    return () => {
      EventBus.off('refresh', handleLayoutRefresh);
    };
  }, []);

  useEffect(() => {
    setContainerDisplay(enabled);

    const handleRefresh = (data) => {
      if (data !== 'quicklinks') return;
      if (silenceEventRef.current) return;

      const newEnabled = localStorage.getItem('quicklinksenabled') !== 'false';
      const newItems = readQuicklinks();
      const oldItems = items || [];

      const itemsEqual = JSON.stringify(oldItems) === JSON.stringify(newItems);

      if (newEnabled !== enabled || !itemsEqual) {
        setContainerDisplay(newEnabled);
        setItems(newItems);
        setEnabled(newEnabled);
      }
    };

    EventBus.on('refresh', handleRefresh);
    return () => {
      EventBus.off('refresh', handleRefresh);
    };
  }, [enabled, items]);

  const QUICKLINKS_SECTION = 'modals.main.settings.sections.quicklinks';
  const groupModalTitleKey = `${QUICKLINKS_SECTION}.groups`;

  const AdditionalSettings = () => (
    <Row>
      <Content
        title={variables.getMessage('modals.main.settings.additional_settings')}
        subtitle={variables.getMessage(`${QUICKLINKS_SECTION}.additional`)}
      />
      <Action>
        <Checkbox
          name="quicklinksnewtab"
          text={variables.getMessage(`${QUICKLINKS_SECTION}.open_new`)}
          category="quicklinks"
        />
        <Checkbox
          name="quicklinkstooltip"
          text={variables.getMessage(`${QUICKLINKS_SECTION}.tooltip`)}
          category="quicklinks"
        />
      </Action>
    </Row>
  );

  const StylingOptions = () => (
    <Row>
      <Content
        title={variables.getMessage(`${QUICKLINKS_SECTION}.styling`)}
        subtitle={variables.getMessage(
          'modals.main.settings.sections.quicklinks.styling_description',
        )}
      />
      <Action>
        <Dropdown
          label={variables.getMessage(`${QUICKLINKS_SECTION}.style`)}
          name="quickLinksStyle"
          category="quicklinks"
          items={[
            { value: 'icon', text: variables.getMessage(`${QUICKLINKS_SECTION}.options.icon`) },
            {
              value: 'text_only',
              text: variables.getMessage(`${QUICKLINKS_SECTION}.options.text_only`),
            },
            { value: 'metro', text: variables.getMessage(`${QUICKLINKS_SECTION}.options.metro`) },
          ]}
        />
      </Action>
    </Row>
  );

  const LayoutSettings = () => {
    const rowOptions = [1, 2, 3, 4].map((value) => ({
      value,
      text: `${value} 行`,
    }));
    const colOptions = [2, 3, 4, 5, 6, 7, 8].map((value) => ({
      value,
      text: `${value} 列`,
    }));
    const shapeOptions = [
      { value: 'square', text: '方形' },
      { value: 'circle', text: '圆形' },
    ];
    const maxItemsPerPage = layoutConfig.rows * layoutConfig.cols;

    const handleRowChange = (value) => {
      const parsed = Number(value);
      updateLayoutConfig((prev) => {
        const nextState = { ...(prev || DEFAULT_QUICKLINKS_LAYOUT), rows: parsed };
        nextState.itemsPerPage = parsed * (nextState.cols || DEFAULT_QUICKLINKS_LAYOUT.cols);
        return nextState;
      });
    };

    const handleColChange = (value) => {
      const parsed = Number(value);
      updateLayoutConfig((prev) => {
        const nextState = { ...(prev || DEFAULT_QUICKLINKS_LAYOUT), cols: parsed };
        nextState.itemsPerPage = (nextState.rows || DEFAULT_QUICKLINKS_LAYOUT.rows) * parsed;
        return nextState;
      });
    };

    return (
      <Row>
        <Content title="布局设置" subtitle="自定义快捷方式分页、网格与图标样式" />
        <Action>
          <div className="quicklinks-layout-settings">
            <Dropdown
              label="行数"
              name="quicklinks-layout-rows"
              category="quicklinksLayoutControls"
              items={rowOptions}
              value={layoutConfig.rows}
              noSetting={true}
              onChange={handleRowChange}
            />
            <Dropdown
              label="列数"
              name="quicklinks-layout-cols"
              category="quicklinksLayoutControls"
              items={colOptions}
              value={layoutConfig.cols}
              noSetting={true}
              onChange={handleColChange}
            />
            <Dropdown
              label="图标形状"
              name="quicklinks-layout-shape"
              category="quicklinksLayoutControls"
              items={shapeOptions}
              value={layoutConfig.shape}
              noSetting={true}
              onChange={(value) => updateLayoutConfig({ shape: value })}
            />
            <Slider
              title="每页显示数量"
              name="quicklinks-layout-items"
              value={layoutConfig.itemsPerPage}
              default={layoutConfig.rows * layoutConfig.cols}
              min={1}
              max={maxItemsPerPage}
              persistValue={false}
              onChange={(value) => updateLayoutConfig({ itemsPerPage: Number(value) })}
            />
            <Slider
              title="图标间距 (px)"
              name="quicklinks-layout-gap"
              value={layoutConfig.gap}
              default={DEFAULT_QUICKLINKS_LAYOUT.gap}
              min={8}
              max={24}
              persistValue={false}
              onChange={(value) => updateLayoutConfig({ gap: Number(value) })}
            />
            <Slider
              title="图标大小 (%)"
              name="quicklinks-layout-icon-scale"
              value={layoutConfig.iconScale}
              default={DEFAULT_QUICKLINKS_LAYOUT.iconScale}
              min={50}
              max={100}
              persistValue={false}
              onChange={(value) => updateLayoutConfig({ iconScale: Number(value) })}
            />
          </div>
        </Action>
      </Row>
    );
  };

  const AddLink = () => (
    <Row final={true}>
      <Content title={variables.getMessage(`${QUICKLINKS_SECTION}.title`)} />
      <Action>
        <Button
          type="settings"
          onClick={() => enabled && setShowAddModal(true)}
          icon={<MdAddLink />}
          label={variables.getMessage(`${QUICKLINKS_SECTION}.add_link`)}
          disabled={!enabled}
        />
      </Action>
    </Row>
  );

  const openGroupModal = (group = null) => {
    if (group && group.key === DEFAULT_GROUP_KEY) return;
    setActiveGroup(group);
    setGroupForm({
      name: group?.name || '',
      color: group?.color || '#888888',
    });
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setActiveGroup(null);
    setGroupForm({ name: '', color: '#888888' });
  };

  const handleGroupSave = (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const formName = groupForm.name;
    const formColor = groupForm.color;
    const nextGroups = activeGroup
      ? updateGroup(activeGroup.key, formName, formColor)
      : addGroup(formName, formColor);

    setGroups(nextGroups);
    closeGroupModal();
  };

  const handleGroupDelete = (group) => {
    if (group.key === DEFAULT_GROUP_KEY) return;
    const nextGroups = removeGroup(group.key);
    setGroups(nextGroups);
  };

  const GroupManagement = () => (
    <Row>
      <Content
        title={getGroupMessage(`${groupModalTitleKey}.title`, 'Group management')}
        subtitle={getGroupMessage(`${groupModalTitleKey}.subtitle`, '创建、编辑和管理快捷方式分组')}
      />
      <Action>
        <div className="group-management">
          <div className="group-list">
            {groups.map((group) => (
              <div className="group-item" key={group.key}>
                <div className="group-details">
                  <span
                    className="color-indicator"
                    style={{ backgroundColor: group.color }}
                    aria-label={group.name}
                  />
                  <span className="group-name">{group.name}</span>
                </div>
                {group.key !== DEFAULT_GROUP_KEY && (
                  <div className="group-actions">
                    <Button
                      type="icon"
                      icon={<MdEdit />}
                      tooltipTitle={variables.getMessage(`${QUICKLINKS_SECTION}.edit`)}
                      onClick={() => openGroupModal(group)}
                    />
                    <Button
                      type="icon"
                      icon={<MdDelete />}
                      tooltipTitle={variables.getMessage('modals.main.marketplace.product.buttons.remove')}
                      onClick={() => handleGroupDelete(group)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button
            type="settings"
            icon={<MdAdd />}
            label={getGroupMessage(`${groupModalTitleKey}.new`, '新建分组')}
            onClick={() => openGroupModal()}
          />
        </div>
      </Action>
    </Row>
  );

  return (
    <>
      <Header
        title={variables.getMessage(`${QUICKLINKS_SECTION}.title`)}
        setting="quicklinksenabled"
        category="quicklinks"
        element=".quicklinks-container"
        zoomSetting="zoomQuicklinks"
        visibilityToggle={true}
      />

      <PreferencesWrapper
        setting="quicklinksenabled"
        category="quicklinks"
        visibilityToggle={true}
        zoomSetting="zoomQuicklinks"
      >
        <AdditionalSettings />
        <StylingOptions />
        <LayoutSettings />
        <GroupManagement />
        <AddLink />

        {items.length === 0 && (
          <div className="photosEmpty">
            <div className="emptyNewMessage">
              <MdLinkOff />
              <span className="title">
                {variables.getMessage(`${QUICKLINKS_SECTION}.no_quicklinks`)}
              </span>
              <span className="subtitle">
                {variables.getMessage('modals.main.settings.sections.message.add_some')}
              </span>
              <Button
                type="settings"
                onClick={() => setShowAddModal(true)}
                icon={<MdAddLink />}
                label={variables.getMessage(`${QUICKLINKS_SECTION}.add_link`)}
              />
            </div>
          </div>
        )}
      </PreferencesWrapper>
      <div
        className={`quicklinks-container ${!enabled ? 'disabled' : ''}`}
        ref={quicklinksContainer}
        aria-hidden={!enabled}
      >
        <div className={`messagesContainer ${!enabled ? 'disabled' : ''}`}>
          <SortableList
            items={items}
            enabled={enabled}
            onDragEnd={handleDragEnd}
            startEditLink={(data) => startEditLink(data)}
            deleteLink={(key, e) => deleteLink(key, e)}
          />
        </div>
      </div>

      <Modal
        closeTimeoutMS={100}
        onRequestClose={() => {
          setShowAddModal(false);
          setUrlError('');
          setIconError('');
        }}
        isOpen={showAddModal}
        className="Modal resetmodal mainModal"
        overlayClassName="Overlay resetoverlay"
        ariaHideApp={false}
      >
        <AddModal
          key={edit ? editData?.key || 'edit' : 'add'}
          urlError={urlError}
          iconError={iconError}
          addLink={(name, url, icon, groupKey) => addLink(name, url, icon, groupKey)}
          editLink={(og, name, url, icon, groupKey) => editLink(og, name, url, icon, groupKey)}
          edit={edit}
          editData={editData}
          closeModal={() => {
            setShowAddModal(false);
            setUrlError('');
            setIconError('');
            setEdit(false);
          }}
          enableGroups={true}
        />
      </Modal>
      <Modal
        closeTimeoutMS={100}
        onRequestClose={() => closeGroupModal()}
        isOpen={showGroupModal}
        className="Modal resetmodal mainModal"
        overlayClassName="Overlay resetoverlay"
        ariaHideApp={false}
      >
        <div className="addLinkModal groupModal">
          <div className="shareHeader">
            <span className="title">
              {activeGroup
                ? getGroupMessage(`${groupModalTitleKey}.edit_title`, '编辑分组')
                : getGroupMessage(`${groupModalTitleKey}.create_title`, '创建分组')}
            </span>
            <Tooltip title={variables.getMessage('modals.welcome.buttons.close')}>
              <div className="close" onClick={() => closeGroupModal()}>
                <MdClose />
              </div>
            </Tooltip>
          </div>
          <div className="group-form">
            <label className="group-form-field">
              <span>
                {getGroupMessage(`${groupModalTitleKey}.name`, '分组名称')}
              </span>
              <input
                type="text"
                value={groupForm.name}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={getGroupMessage(`${groupModalTitleKey}.name_placeholder`, '输入名称')}
              />
            </label>
            <label className="group-form-field">
              <span>{getGroupMessage(`${groupModalTitleKey}.color`, '分组颜色')}</span>
              <input
                type="color"
                value={groupForm.color}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, color: event.target.value }))}
              />
            </label>
            <div className="group-form-actions">
              <Button
                type="settings"
                label={
                  activeGroup
                    ? getGroupMessage(`${groupModalTitleKey}.save`, '保存修改')
                    : getGroupMessage(`${groupModalTitleKey}.create`, '创建分组')
                }
                icon={<MdAddLink />}
                onClick={handleGroupSave}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export { QuickLinksOptions as default, QuickLinksOptions };
