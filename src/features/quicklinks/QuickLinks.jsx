import { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Tooltip } from 'components/Elements';
import Modal from 'react-modal';
import {
  MdAdd,
  MdAddLink,
  MdClose,
  MdDelete,
  MdEdit,
  MdRefresh,
} from 'react-icons/md';
import variables from 'config/variables';

import EventBus from 'utils/eventbus';
import {
  addGroup,
  getGroups,
  getCurrentGroup,
  removeGroup,
  setCurrentGroup as persistCurrentGroup,
  getQuicklinksByGroup,
  getQuicklinksLayout,
  DEFAULT_QUICKLINKS_LAYOUT,
  updateGroup,
} from 'utils/quicklinks/quicklinkGroups';
import { getTitleFromUrl, isValidUrl } from 'utils/links';
import {
  createQuicklink,
  deleteQuicklink,
  getQuicklinkInitial,
  isValidQuicklinkUrl,
  normalizeQuicklinkIcon,
  normalizeQuicklinkUrl,
  refreshQuicklinkIcon,
  resolveQuicklinkIcon,
  updateQuicklink,
} from 'features/quicklinks/options/utils/quicklinksUtils';

import './quicklinks.scss';

const DEFAULT_GROUP_KEY = 'all';

const emptyLinkForm = {
  name: '',
  url: '',
  iconType: 'auto',
  iconValue: '',
  group: DEFAULT_GROUP_KEY,
};

const emptyGroupForm = {
  name: '',
  color: '#888888',
};

const QuickLinks = memo(() => {
  const [groups, setGroups] = useState(() => getGroups());
  const [currentGroup, setCurrentGroupState] = useState(() => getCurrentGroup());
  const [items, setItems] = useState(() => getQuicklinksByGroup(getCurrentGroup()));
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force complete re-render
  const [layoutConfig, setLayoutConfig] = useState(() => getQuicklinksLayout());
  const [currentPage, setCurrentPage] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [linkEditor, setLinkEditor] = useState({ open: false, mode: 'add', item: null });
  const [groupEditor, setGroupEditor] = useState({ open: false, mode: 'add', group: null });
  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [formError, setFormError] = useState('');
  const [failedIcons, setFailedIcons] = useState({});
  const quicklinksWrapper = useRef(null);
  const quicklinksContainer = useRef(null);
  const wheelCooldownRef = useRef(false);
  const wheelTimeoutRef = useRef(null);
  const quickLinksStyle = localStorage.getItem('quickLinksStyle') || 'icon';
  const isTextLayoutActive = quickLinksStyle === 'text' || quickLinksStyle === 'text_only';
  const isGridLayoutActive = !isTextLayoutActive && quickLinksStyle !== 'metro';
  const layoutRows = layoutConfig?.rows ?? DEFAULT_QUICKLINKS_LAYOUT.rows;
  const layoutCols = layoutConfig?.cols ?? DEFAULT_QUICKLINKS_LAYOUT.cols;
  const layoutGap = layoutConfig?.gap ?? DEFAULT_QUICKLINKS_LAYOUT.gap;
  const layoutIconScale = layoutConfig?.iconScale ?? DEFAULT_QUICKLINKS_LAYOUT.iconScale;
  const shapeClassName = layoutConfig?.shape === 'circle' ? 'quicklink-circle' : 'quicklink-square';

  const normalizedItemsPerPage = useMemo(() => {
    const raw = Number(layoutConfig?.itemsPerPage);
    if (!Number.isFinite(raw) || raw < 1) {
      return DEFAULT_QUICKLINKS_LAYOUT.itemsPerPage;
    }
    return raw;
  }, [layoutConfig]);

  // widget zoom
  const setZoom = useCallback((element) => {
    if (!element) return;
    
    const zoom = localStorage.getItem('zoomQuicklinks') || 100;
    for (const link of element.getElementsByTagName('span')) {
      link.style.fontSize = `${14 * Number(zoom / 100)}px`;
    }

    element.style.setProperty('--quicklinks-label-scale', String(Number(zoom / 100)));
  }, []);

  const ensureGroupKey = useCallback(
    (requestedKey, latestGroups = groups) => {
      const source = Array.isArray(latestGroups) && latestGroups.length > 0 ? latestGroups : groups;
      if (source.some((group) => group.key === requestedKey)) {
        return requestedKey;
      }
      return source[0]?.key || 'all';
    },
    [groups],
  );

  const applyGroup = useCallback(
    (requestedKey, latestGroups) => {
      const nextKey = ensureGroupKey(requestedKey, latestGroups);
      setCurrentGroupState(nextKey);
      setItems(getQuicklinksByGroup(nextKey));
       setCurrentPage(1);
      setForceUpdate(Date.now());
      return nextKey;
    },
    [ensureGroupKey],
  );

  const handleGroupSelect = useCallback(
    (key) => {
      const nextKey = applyGroup(key);
      persistCurrentGroup(nextKey);
    },
    [applyGroup],
  );

  useEffect(() => {
    const handleRefresh = (data) => {
      if (data === 'quicklinks') {
        if (localStorage.getItem('quicklinksenabled') === 'false') {
          if (quicklinksWrapper.current) {
            quicklinksWrapper.current.style.display = 'none';
          }
          return;
        }

        if (quicklinksWrapper.current) {
          quicklinksWrapper.current.style.display = 'flex';
        }
        
        const latestGroups = getGroups();
        setGroups(latestGroups);
        applyGroup(getCurrentGroup(), latestGroups);
        return;
      }

      if (data === 'quicklinkGroups') {
        const latestGroups = getGroups();
        setGroups(latestGroups);
        applyGroup(getCurrentGroup(), latestGroups);
        return;
      }

      if (data === 'currentQuicklinkGroup') {
        applyGroup(getCurrentGroup());
        return;
      }

      if (data === 'quicklinksLayout') {
        setLayoutConfig(getQuicklinksLayout());
        setCurrentPage(1);
      }
    };

    EventBus.on('refresh', handleRefresh);

    setZoom(quicklinksContainer.current);

    return () => {
      EventBus.off('refresh', handleRefresh);
    };
  }, [applyGroup, currentGroup, setZoom]);

  useEffect(() => {
    setZoom(quicklinksContainer.current);
  }, [items, forceUpdate, setZoom, currentPage, layoutConfig]);

  useEffect(() => {
    const container = quicklinksContainer.current;
    if (!container || typeof globalThis.ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new globalThis.ResizeObserver((entries) => {
      if (!entries || entries.length === 0) {
        return;
      }

      const { width, height } = entries[0].contentRect;
      setContainerSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(((Array.isArray(items) ? items.length : 0) || 0) / normalizedItemsPerPage),
      ),
    [items, normalizedItemsPerPage],
  );

  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    const startIndex = (safeCurrentPage - 1) * normalizedItemsPerPage;
    const endIndex = startIndex + normalizedItemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, safeCurrentPage, normalizedItemsPerPage]);

  const gridStyle = useMemo(() => {
    if (!isGridLayoutActive) return undefined;
    return {
      '--quicklinks-grid-gap': `${layoutGap}px`,
      '--quicklinks-grid-columns': `repeat(${layoutCols}, minmax(0, 1fr))`,
      '--quicklinks-grid-rows': `repeat(${layoutRows}, minmax(0, 1fr))`,
    };
  }, [isGridLayoutActive, layoutGap, layoutCols, layoutRows]);

  const iconSize = useMemo(() => {
    const cols = Number(layoutCols) || DEFAULT_QUICKLINKS_LAYOUT.cols;
    const rows = Number(layoutRows) || DEFAULT_QUICKLINKS_LAYOUT.rows;
    const normalizedGap = Number(layoutGap);
    const gap = Number.isFinite(normalizedGap) ? normalizedGap : DEFAULT_QUICKLINKS_LAYOUT.gap;

    if (containerSize.width === 0 || containerSize.height === 0) {
      return 64;
    }

    const availableWidth = Math.max(containerSize.width, 0);
    const availableHeight = Math.max(containerSize.height, 0);
    const cellWidth = (availableWidth - gap * (cols - 1)) / cols;
    const cellHeight = (availableHeight - gap * (rows - 1)) / rows;
    const cellSize = Math.max(0, Math.min(cellWidth, cellHeight));
    const calculatedSize = Math.round(cellSize * 0.92);

    return Math.max(48, Math.min(150, calculatedSize));
  }, [layoutCols, layoutRows, layoutGap, containerSize]);

  const containerStyle = useMemo(() => {
    const iconImageSize = Math.round(iconSize * (Number(layoutIconScale) / 100));
    const style = {
      '--quicklink-icon-size': `${iconSize}px`,
      '--quicklink-image-size': `${iconImageSize}px`,
    };
    return gridStyle ? { ...gridStyle, ...style } : style;
  }, [gridStyle, iconSize, layoutIconScale]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  const handlePageSelect = useCallback(
    (pageNumber) => {
      setCurrentPage(() => {
        const safePage = Math.max(1, Math.min(pageNumber, totalPages));
        return safePage;
      });
    },
    [totalPages],
  );

  const handleWheelNavigation = useCallback(
    (event) => {
      if (!event || wheelCooldownRef.current) return;

      const direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
      if (direction === 0) return;

      const nextPage =
        direction > 0
          ? safeCurrentPage === totalPages ? 1 : safeCurrentPage + 1
          : safeCurrentPage === 1 ? totalPages : safeCurrentPage - 1;

      if (nextPage === safeCurrentPage) return;

      event.preventDefault();
      wheelCooldownRef.current = true;
      clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        wheelCooldownRef.current = false;
      }, 400);
      setCurrentPage(nextPage);
    },
    [safeCurrentPage, totalPages],
  );

  useEffect(() => {
    const container = quicklinksContainer.current;
    if (!container) return undefined;

    const wheelListener = (event) => {
      handleWheelNavigation(event);
    };

    container.addEventListener('wheel', wheelListener, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelListener);
    };
  }, [handleWheelNavigation]);

  useEffect(
    () => () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!contextMenu) return undefined;

    const closeMenu = () => setContextMenu(null);
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  const refreshCurrentItems = useCallback(
    (targetGroup = currentGroup) => {
      setGroups(getGroups());
      setItems(getQuicklinksByGroup(targetGroup));
      setForceUpdate(Date.now());
    },
    [currentGroup],
  );

  const openContextMenu = useCallback((event, payload) => {
    if (event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      ...payload,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const openLinkEditor = useCallback(
    (mode, item = null) => {
      const icon = normalizeQuicklinkIcon(item?.icon);
      setLinkEditor({ open: true, mode, item });
      setLinkForm({
        name: item?.name || '',
        url: item?.url || '',
        iconType: icon.type,
        iconValue: icon.value,
        group: item?.group || currentGroup || DEFAULT_GROUP_KEY,
      });
      setFormError('');
      setContextMenu(null);
    },
    [currentGroup],
  );

  const closeLinkEditor = useCallback(() => {
    setLinkEditor({ open: false, mode: 'add', item: null });
    setLinkForm(emptyLinkForm);
    setFormError('');
  }, []);

  const openGroupEditor = useCallback((mode, group = null) => {
    setGroupEditor({ open: true, mode, group });
    setGroupForm({
      name: group?.name || '',
      color: group?.color || '#888888',
    });
    setFormError('');
    setContextMenu(null);
  }, []);

  const closeGroupEditor = useCallback(() => {
    setGroupEditor({ open: false, mode: 'add', group: null });
    setGroupForm(emptyGroupForm);
    setFormError('');
  }, []);

  const handleIconFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLinkForm((prev) => ({
        ...prev,
        iconType: 'file',
        iconValue: typeof reader.result === 'string' ? reader.result : '',
      }));
      setFormError('');
    };
    reader.onerror = () => setFormError('图标文件读取失败');
    reader.readAsDataURL(file);
  }, []);

  const saveLink = useCallback(async () => {
    const nextUrl = normalizeQuicklinkUrl(linkForm.url);
    if (!nextUrl || !isValidQuicklinkUrl(nextUrl)) {
      setFormError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    const icon = normalizeQuicklinkIcon({
      type: linkForm.iconType,
      value: linkForm.iconType === 'auto' ? '' : linkForm.iconValue,
    });

    if (icon.type === 'url' && icon.value && !isValidUrl(icon.value)) {
      setFormError(variables.getMessage('widgets.quicklinks.url_error'));
      return;
    }

    const nextName = linkForm.name.trim() || (await getTitleFromUrl(nextUrl));
    const nextGroup = groups.some((group) => group.key === linkForm.group)
      ? linkForm.group
      : DEFAULT_GROUP_KEY;

    if (linkEditor.mode === 'edit' && linkEditor.item?.key) {
      updateQuicklink(linkEditor.item.key, {
        name: nextName,
        url: nextUrl,
        icon,
        group: nextGroup,
      });
    } else {
      createQuicklink({
        name: nextName,
        url: nextUrl,
        icon,
        group: nextGroup,
      });
      variables.stats.postEvent('feature', 'Quicklink add');
    }

    closeLinkEditor();
    refreshCurrentItems(currentGroup);
  }, [closeLinkEditor, currentGroup, groups, linkEditor, linkForm, refreshCurrentItems]);

  const saveGroup = useCallback(() => {
    const name = groupForm.name.trim();
    if (!name) {
      setFormError('请输入分组名称');
      return;
    }

    let nextGroups;
    if (groupEditor.mode === 'edit' && groupEditor.group?.key) {
      nextGroups = updateGroup(groupEditor.group.key, name, groupForm.color);
    } else {
      nextGroups = addGroup(name, groupForm.color);
    }

    setGroups(nextGroups);
    closeGroupEditor();
  }, [closeGroupEditor, groupEditor, groupForm]);

  const handleDeleteLink = useCallback(
    (item) => {
      if (!item?.key) return;
      deleteQuicklink(item.key);
      setContextMenu(null);
      refreshCurrentItems(currentGroup);
    },
    [currentGroup, refreshCurrentItems],
  );

  const handleRefreshIcon = useCallback(
    (item) => {
      if (!item?.key) return;
      refreshQuicklinkIcon(item.key);
      setFailedIcons((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
      setContextMenu(null);
      refreshCurrentItems(currentGroup);
    },
    [currentGroup, refreshCurrentItems],
  );

  const handleDeleteGroup = useCallback(
    (group) => {
      if (!group?.key || group.key === DEFAULT_GROUP_KEY) return;
      const nextGroups = removeGroup(group.key);
      setGroups(nextGroups);
      setContextMenu(null);
      applyGroup(getCurrentGroup(), nextGroups);
    },
    [applyGroup],
  );

  let target, rel = null;
  if (localStorage.getItem('quicklinksnewtab') === 'true') {
    target = '_blank';
    rel = 'noopener noreferrer';
  }

  const tooltipEnabled = localStorage.getItem('quicklinkstooltip');

  const quickLink = (item, index) => {
    const contextHandlers = {
      onContextMenu: (event) => openContextMenu(event, { type: 'link', item }),
      onKeyDown: (event) => {
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          openContextMenu(event, { type: 'link', item });
        }
      },
    };

    if (isTextLayoutActive) {
      return (
        <a
          className="quicklinkstext"
          key={`quicklink-${item.key}-${index}`}
          href={item.url}
          target={target}
          rel={rel}
          draggable={false}
          {...contextHandlers}
        >
          {item.name}
        </a>
      );
    }

    const img = resolveQuicklinkIcon(item);
    const iconFailed = failedIcons[item.key] || !img;
    const iconNode = iconFailed ? (
      <span className="quicklink-icon-placeholder">{getQuicklinkInitial(item)}</span>
    ) : (
      <img
        src={img}
        alt={item.name}
        draggable={false}
        onError={() => setFailedIcons((prev) => ({ ...prev, [item.key]: true }))}
      />
    );

    if (quickLinksStyle === 'metro') {
      return (
        <a
          className="quickLinksMetro"
          key={`quicklink-${item.key}-${index}`}
          href={item.url}
          target={target}
          rel={rel}
          draggable={false}
          {...contextHandlers}
        >
          {iconNode}
          <span className="subtitle">{item.name}</span>
        </a>
      );
    }

    const link = (
      <a
        key={`quicklink-${item.key}-${index}`}
        href={item.url}
        target={target}
        rel={rel}
        draggable={false}
        className={`quicklink-shape ${shapeClassName}`}
        {...contextHandlers}
      >
        {iconNode}
      </a>
    );

    return tooltipEnabled === 'true' ? (
      <Tooltip title={item.name} placement="bottom" key={`quicklink-${item.key}-${index}`}>
        {link}
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <div className="quicklinks-widget" ref={quicklinksWrapper}>
      <div className="quicklinks-groups-container" role="tablist">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            className={`quicklinks-group-tab ${group.key === currentGroup ? 'active' : ''}`}
            onClick={() => handleGroupSelect(group.key)}
            onContextMenu={(event) => openContextMenu(event, { type: 'group', group })}
            style={{ '--quicklinks-group-color': group.color }}
            role="tab"
            aria-selected={group.key === currentGroup}
          >
            {group.name}
          </button>
        ))}
        <button
          type="button"
          className="quicklinks-group-tab quicklinks-group-add"
          onClick={() => openGroupEditor('add')}
          onContextMenu={(event) => openContextMenu(event, { type: 'blank' })}
          aria-label="新建快捷方式分组"
        >
          <MdAdd />
        </button>
      </div>
      <div
        className={`quicklinkscontainer${isGridLayoutActive ? ' quicklinks-grid' : ''}`}
        ref={quicklinksContainer}
        style={containerStyle}
        onContextMenu={(event) => {
          if (event.defaultPrevented) return;
          openContextMenu(event, { type: 'blank' });
        }}
      >
        {paginatedItems && paginatedItems.map((item, index) => quickLink(item, index))}
      </div>
      {totalPages > 1 && (
        <div className="quicklinks-pagination" role="navigation" aria-label="快捷方式分页指示器">
          {pageNumbers.map((pageNumber) => (
            <button
              type="button"
              key={`quicklinks-page-${pageNumber}`}
              className={`quicklinks-page-dot ${pageNumber === safeCurrentPage ? 'active' : ''}`}
              onClick={() => handlePageSelect(pageNumber)}
              aria-label={`跳转到第 ${pageNumber} 页`}
            />
          ))}
        </div>
      )}
      {contextMenu && (
        <div
          className="quicklinks-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.type === 'link' && (
            <>
              <button type="button" onClick={() => openLinkEditor('edit', contextMenu.item)}>
                <MdEdit />
                <span>编辑快捷方式</span>
              </button>
              <button type="button" onClick={() => handleRefreshIcon(contextMenu.item)}>
                <MdRefresh />
                <span>刷新图标</span>
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => handleDeleteLink(contextMenu.item)}
              >
                <MdDelete />
                <span>删除快捷方式</span>
              </button>
            </>
          )}
          {contextMenu.type === 'group' && (
            <>
              <button type="button" onClick={() => openLinkEditor('add')}>
                <MdAddLink />
                <span>添加快捷方式</span>
              </button>
              <button type="button" onClick={() => openGroupEditor('add')}>
                <MdAdd />
                <span>新建分组</span>
              </button>
              {contextMenu.group?.key !== DEFAULT_GROUP_KEY && (
                <>
                  <button
                    type="button"
                    onClick={() => openGroupEditor('edit', contextMenu.group)}
                  >
                    <MdEdit />
                    <span>编辑分组</span>
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDeleteGroup(contextMenu.group)}
                  >
                    <MdDelete />
                    <span>删除分组</span>
                  </button>
                </>
              )}
            </>
          )}
          {contextMenu.type === 'blank' && (
            <>
              <button type="button" onClick={() => openLinkEditor('add')}>
                <MdAddLink />
                <span>添加快捷方式</span>
              </button>
              <button type="button" onClick={() => openGroupEditor('add')}>
                <MdAdd />
                <span>新建分组</span>
              </button>
            </>
          )}
        </div>
      )}
      <Modal
        closeTimeoutMS={100}
        onRequestClose={closeLinkEditor}
        isOpen={linkEditor.open}
        className="quicklinks-home-modal"
        overlayClassName="quicklinks-home-overlay"
        ariaHideApp={false}
      >
        <div className="quicklinks-home-form">
          <div className="shareHeader">
            <span className="title">
              {linkEditor.mode === 'edit' ? '编辑快捷方式' : '添加快捷方式'}
            </span>
            <button type="button" className="close" onClick={closeLinkEditor}>
              <MdClose />
            </button>
          </div>
          <label>
            <span>名称</span>
            <input
              value={linkForm.name}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="留空时自动尝试读取标题"
            />
          </label>
          <label>
            <span>网址</span>
            <input
              value={linkForm.url}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://example.com"
            />
          </label>
          <label>
            <span>分组</span>
            <select
              value={linkForm.group}
              onChange={(event) => setLinkForm((prev) => ({ ...prev, group: event.target.value }))}
            >
              {groups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <div className="quicklinks-home-icon-row">
            <label>
              <span>图标模式</span>
              <select
                value={linkForm.iconType}
                onChange={(event) =>
                  setLinkForm((prev) => ({
                    ...prev,
                    iconType: event.target.value,
                    iconValue: event.target.value === 'auto' ? '' : prev.iconValue,
                  }))
                }
              >
                <option value="auto">自动获取</option>
                <option value="url">图片 URL</option>
                <option value="file">本地图片</option>
              </select>
            </label>
            {linkForm.iconType === 'url' && (
              <label>
                <span>图片 URL</span>
                <input
                  value={linkForm.iconValue}
                  onChange={(event) =>
                    setLinkForm((prev) => ({ ...prev, iconValue: event.target.value }))
                  }
                  placeholder="https://example.com/icon.png"
                />
              </label>
            )}
            {linkForm.iconType === 'file' && (
              <label>
                <span>本地图片</span>
                <input type="file" accept="image/*" onChange={handleIconFileChange} />
              </label>
            )}
          </div>
          {linkForm.iconType === 'file' && linkForm.iconValue && (
            <div className="quicklinks-home-icon-preview">
              <img src={linkForm.iconValue} alt="快捷方式图标预览" />
              <span>本地图标已准备保存</span>
            </div>
          )}
          {formError && <div className="quicklinks-home-error">{formError}</div>}
          <div className="quicklinks-home-actions">
            <button type="button" onClick={closeLinkEditor}>取消</button>
            <button type="button" onClick={saveLink}>保存</button>
          </div>
        </div>
      </Modal>
      <Modal
        closeTimeoutMS={100}
        onRequestClose={closeGroupEditor}
        isOpen={groupEditor.open}
        className="quicklinks-home-modal"
        overlayClassName="quicklinks-home-overlay"
        ariaHideApp={false}
      >
        <div className="quicklinks-home-form">
          <div className="shareHeader">
            <span className="title">
              {groupEditor.mode === 'edit' ? '编辑分组' : '新建分组'}
            </span>
            <button type="button" className="close" onClick={closeGroupEditor}>
              <MdClose />
            </button>
          </div>
          <label>
            <span>分组名称</span>
            <input
              value={groupForm.name}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="例如：工作"
            />
          </label>
          <label>
            <span>分组颜色</span>
            <input
              type="color"
              value={groupForm.color}
              onChange={(event) =>
                setGroupForm((prev) => ({ ...prev, color: event.target.value }))
              }
            />
          </label>
          {formError && <div className="quicklinks-home-error">{formError}</div>}
          <div className="quicklinks-home-actions">
            <button type="button" onClick={closeGroupEditor}>取消</button>
            <button type="button" onClick={saveGroup}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

QuickLinks.displayName = 'QuickLinks';

export { QuickLinks as default, QuickLinks };
