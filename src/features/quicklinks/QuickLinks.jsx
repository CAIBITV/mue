import { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Tooltip } from 'components/Elements';

import EventBus from 'utils/eventbus';
import {
  getGroups,
  getCurrentGroup,
  setCurrentGroup as persistCurrentGroup,
  getQuicklinksByGroup,
  getQuicklinksLayout,
  DEFAULT_QUICKLINKS_LAYOUT,
} from 'utils/quicklinks/quicklinkGroups';

import './quicklinks.scss';

const QuickLinks = memo(() => {
  const [groups, setGroups] = useState(() => getGroups());
  const [currentGroup, setCurrentGroupState] = useState(() => getCurrentGroup());
  const [items, setItems] = useState(() => getQuicklinksByGroup(getCurrentGroup()));
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force complete re-render
  const [layoutConfig, setLayoutConfig] = useState(() => getQuicklinksLayout());
  const [currentPage, setCurrentPage] = useState(1);
  const quicklinksWrapper = useRef(null);
  const quicklinksContainer = useRef(null);
  const wheelCooldownRef = useRef(false);
  const wheelTimeoutRef = useRef(null);
  const quickLinksStyle = localStorage.getItem('quickLinksStyle') || 'icon';
  const isGridLayoutActive = quickLinksStyle !== 'text' && quickLinksStyle !== 'metro';
  const layoutRows = layoutConfig?.rows ?? DEFAULT_QUICKLINKS_LAYOUT.rows;
  const layoutCols = layoutConfig?.cols ?? DEFAULT_QUICKLINKS_LAYOUT.cols;
  const layoutGap = layoutConfig?.gap ?? DEFAULT_QUICKLINKS_LAYOUT.gap;
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

    if (localStorage.getItem('quickLinksStyle') !== 'text') {
      for (const img of element.getElementsByTagName('img')) {
        img.style.height = `${30 * Number(zoom / 100)}px`;
      }
    }
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
        
        applyGroup(currentGroup);
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
          ? Math.min(totalPages, safeCurrentPage + 1)
          : Math.max(1, safeCurrentPage - 1);

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

  let target, rel = null;
  if (localStorage.getItem('quicklinksnewtab') === 'true') {
    target = '_blank';
    rel = 'noopener noreferrer';
  }

  const tooltipEnabled = localStorage.getItem('quicklinkstooltip');

  const quickLink = (item, index) => {
    if (quickLinksStyle === 'text') {
      return (
        <a
          className="quicklinkstext"
          key={`quicklink-${item.key}-${index}`}
          href={item.url}
          target={target}
          rel={rel}
          draggable={false}
        >
          {item.name}
        </a>
      );
    }

    const img =
      item.icon ||
      'https://icon.horse/icon/' + item.url.replace('https://', '').replace('http://', '');

    if (quickLinksStyle === 'metro') {
      return (
        <a
          className="quickLinksMetro"
          key={`quicklink-${item.key}-${index}`}
          href={item.url}
          target={target}
          rel={rel}
          draggable={false}
        >
          <img src={img} alt={item.name} draggable={false} />
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
      >
        <img src={img} alt={item.name} draggable={false} />
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
            style={{ '--quicklinks-group-color': group.color }}
            role="tab"
            aria-selected={group.key === currentGroup}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div
        className={`quicklinkscontainer${isGridLayoutActive ? ' quicklinks-grid' : ''}`}
        ref={quicklinksContainer}
        style={gridStyle}
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
    </div>
  );
});

QuickLinks.displayName = 'QuickLinks';

export { QuickLinks as default, QuickLinks };
