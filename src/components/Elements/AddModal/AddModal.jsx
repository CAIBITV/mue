import variables from 'config/variables';

import { useState, memo, useEffect } from 'react';
import { TextareaAutosize } from '@mui/material';
import { MdAddLink, MdClose } from 'react-icons/md';
import { Tooltip } from 'components/Elements';
import { Button } from 'components/Elements';
import { getGroups } from 'utils/quicklinks/quicklinkGroups';
import { assignQuicklinkToGroup } from 'features/quicklinks/options/utils/quicklinksUtils';
import EventBus from 'utils/eventbus';

const QUICKLINKS_SECTION = 'modals.main.settings.sections.quicklinks';
const DEFAULT_GROUP_KEY = 'all';

function AddModal({
  urlError,
  iconError,
  addLink,
  closeModal,
  edit,
  editData,
  editLink,
  enableGroups = false,
}) {
  const [name, setName] = useState(edit ? editData.name : '');
  const [url, setUrl] = useState(edit ? editData.url : '');
  const [icon, setIcon] = useState(edit ? editData.icon : '');
  const shouldHandleGroups = enableGroups === true;
  const [groupOptions, setGroupOptions] = useState(() => (shouldHandleGroups ? getGroups() : []));
  const [selectedGroup, setSelectedGroup] = useState(() => {
    if (!shouldHandleGroups) return DEFAULT_GROUP_KEY;
    if (edit && editData?.group) return editData.group;
    const available = getGroups();
    return available[0]?.key || DEFAULT_GROUP_KEY;
  });

  useEffect(() => {
    if (!shouldHandleGroups) return;
    const handleRefresh = (data) => {
      if (data !== 'quicklinkGroups') return;
      const latestGroups = getGroups();
      setGroupOptions(latestGroups);
      if (!latestGroups.some((group) => group.key === selectedGroup)) {
        setSelectedGroup(latestGroups[0]?.key || DEFAULT_GROUP_KEY);
      }
    };
    EventBus.on('refresh', handleRefresh);
    return () => {
      EventBus.off('refresh', handleRefresh);
    };
  }, [shouldHandleGroups, selectedGroup]);

  const getGroupLabel = (key, fallback) => {
    const message = variables.getMessage(key);
    return message || fallback;
  };

  const resolveGroupKey = () => {
    if (!shouldHandleGroups) return undefined;
    if (selectedGroup && groupOptions.some((group) => group.key === selectedGroup)) {
      return selectedGroup;
    }
    return groupOptions[0]?.key || DEFAULT_GROUP_KEY;
  };

  const handleAddOrEdit = async () => {
    const groupKey = resolveGroupKey();
    if (edit) {
      const payload = shouldHandleGroups
        ? [editData, name, url, icon, groupKey]
        : [editData, name, url, icon];
      const updated = await editLink(...payload);
      if (shouldHandleGroups && updated?.key) {
        assignQuicklinkToGroup(updated.key, groupKey);
      }
      return;
    }

    const payload = shouldHandleGroups ? [name, url, icon, groupKey] : [name, url, icon];
    const created = await addLink(...payload);
    if (shouldHandleGroups && created?.key) {
      assignQuicklinkToGroup(created.key, groupKey);
    }
  };

  return (
    <div className="addLinkModal">
      <div className="shareHeader">
        <span className="title">
          {edit
            ? variables.getMessage('widgets.quicklinks.edit')
            : variables.getMessage('widgets.quicklinks.new')}
        </span>
        <Tooltip title={variables.getMessage('modals.welcome.buttons.close')}>
          <div className="close" onClick={() => closeModal()}>
            <MdClose />
          </div>
        </Tooltip>
      </div>
      <div className="quicklinkModalTextbox">
        <TextareaAutosize
          maxRows={1}
          placeholder={variables.getMessage('widgets.quicklinks.name')}
          value={name}
          onChange={(e) => setName(e.target.value.replace(/(\r\n|\n|\r)/gm, ''))}
          style={{ gridColumn: 'span 2' }}
        />
        <TextareaAutosize
          maxRows={10}
          placeholder={variables.getMessage('widgets.quicklinks.url')}
          value={url}
          onChange={(e) => setUrl(e.target.value.replace(/(\r\n|\n|\r)/gm, ''))}
        />
        <TextareaAutosize
          maxRows={10}
          maxLines={1}
          placeholder={variables.getMessage('widgets.quicklinks.icon')}
          value={icon}
          onChange={(e) => setIcon(e.target.value.replace(/(\r\n|\n|\r)/gm, ''))}
        />
        {shouldHandleGroups && (
          <div className="group-select-wrapper">
            <label htmlFor="quicklink-group-select">
              {getGroupLabel(`${QUICKLINKS_SECTION}.groups.dropdown`, '选择分组')}
            </label>
            <select
              id="quicklink-group-select"
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
            >
              {groupOptions.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="addFooter">
        <span className="dropdown-error">
          {iconError} {urlError}
        </span>
        {edit ? (
          <Button
            type="settings"
            onClick={handleAddOrEdit}
            icon={<MdAddLink />}
            label={variables.getMessage('modals.main.settings.sections.quicklinks.edit')}
          />
        ) : (
          <Button
            type="settings"
            onClick={handleAddOrEdit}
            icon={<MdAddLink />}
            label={variables.getMessage('widgets.quicklinks.add')}
          />
        )}
      </div>
    </div>
  );
}

const MemoizedAddModal = memo(AddModal);
export { MemoizedAddModal as default, MemoizedAddModal as AddModal };
