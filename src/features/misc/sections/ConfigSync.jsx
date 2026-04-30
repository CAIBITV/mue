import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import {
  MdCheck,
  MdClose,
  MdCloudDone,
  MdCloudOff,
  MdCloudSync,
  MdContentCopy,
  MdFileUpload,
  MdOpenInNew,
  MdSyncProblem,
} from 'react-icons/md';

import variables from 'config/variables';
import { Button, Tooltip } from 'components/Elements';
import { Text } from 'components/Form/Settings';
import { Action, Content, Row } from 'components/Layout/Settings';
import {
  CONFIG_SYNC_IMPORT_DECISION_EVENT,
  CONFIG_SYNC_STATUS_EVENT,
  connectConfigSync,
  continueWithLocalAfterImport,
  continueWithRemoteAfterImport,
  disconnectConfigSync,
  getConfigSyncStatus,
  useLocalConfigForConflict,
  useRemoteConfigForConflict,
} from 'utils/sync/configSyncService';
import { getDropboxAppKey, getDropboxRedirectUri, hasBundledDropboxAppKey } from 'utils/sync/dropboxAuth';

const SYNC_SECTION = 'modals.main.settings.sections.advanced.sync';
const DROPBOX_APP_CONSOLE_URL = 'https://www.dropbox.com/developers/apps';

const getInitialRedirectUri = () => {
  try {
    return getDropboxRedirectUri();
  } catch {
    return '';
  }
};

const getStatusKey = (status, configured) => {
  if (!configured) return 'not_configured';
  if (!status.connected) return 'disconnected';
  if (status.conflict) return 'conflict';
  if (status.pausedReason) return 'paused';
  return status.status || 'connected';
};

function ConfigSync() {
  const [status, setStatus] = useState({ status: 'loading' });
  const [importModal, setImportModal] = useState(false);
  const [appKey, setAppKey] = useState(getDropboxAppKey());
  const [redirectUri] = useState(getInitialRedirectUri);

  useEffect(() => {
    let mounted = true;

    getConfigSyncStatus().then((nextStatus) => {
      if (mounted) setStatus(nextStatus);
    });

    const handleStatus = (event) => setStatus(event.detail);
    const handleImportDecision = () => setImportModal(true);

    document.addEventListener(CONFIG_SYNC_STATUS_EVENT, handleStatus);
    document.addEventListener(CONFIG_SYNC_IMPORT_DECISION_EVENT, handleImportDecision);

    return () => {
      mounted = false;
      document.removeEventListener(CONFIG_SYNC_STATUS_EVENT, handleStatus);
      document.removeEventListener(CONFIG_SYNC_IMPORT_DECISION_EVENT, handleImportDecision);
    };
  }, []);

  const runAction = async (action) => {
    try {
      await action();
      setStatus(await getConfigSyncStatus());
    } catch (error) {
      toast(error.message || variables.getMessage('toasts.error'));
    }
  };

  const configured = Boolean(appKey);
  const statusKey = getStatusKey(status, configured);
  const title = variables.getMessage(`${SYNC_SECTION}.title`);
  const subtitle = variables.getMessage(`${SYNC_SECTION}.states.${statusKey}`);
  const copyRedirectUri = () => {
    if (!redirectUri) return;

    navigator.clipboard.writeText(redirectUri);
    toast(variables.getMessage(`${SYNC_SECTION}.redirect_uri.copied`));
  };

  const renderActions = () => {
    if (!configured) {
      return (
        <Button
          disabled={true}
          icon={<MdCloudOff />}
          label={variables.getMessage(`${SYNC_SECTION}.buttons.unavailable`)}
        />
      );
    }

    if (!status.connected) {
      return (
        <Button
          onClick={() => runAction(connectConfigSync)}
          icon={<MdCloudSync />}
          label={variables.getMessage(`${SYNC_SECTION}.buttons.connect`)}
        />
      );
    }

    if (status.conflict || status.pausedReason) {
      return (
        <div className="resetDataButtonsLayout">
          <Button
            onClick={() =>
              runAction(status.conflict ? useLocalConfigForConflict : continueWithLocalAfterImport)
            }
            icon={<MdFileUpload />}
            label={variables.getMessage(`${SYNC_SECTION}.buttons.use_local`)}
          />
          <Button
            onClick={() =>
              runAction(status.conflict ? useRemoteConfigForConflict : continueWithRemoteAfterImport)
            }
            icon={<MdCloudDone />}
            label={variables.getMessage(`${SYNC_SECTION}.buttons.use_remote`)}
          />
        </div>
      );
    }

    return (
      <div className="resetDataButtonsLayout">
        <Button
          onClick={() => runAction(disconnectConfigSync)}
          icon={<MdCloudOff />}
          label={variables.getMessage(`${SYNC_SECTION}.buttons.disconnect`)}
        />
      </div>
    );
  };

  return (
    <>
      {!hasBundledDropboxAppKey() && (
        <>
          <Row>
            <Content
              title={variables.getMessage(`${SYNC_SECTION}.app_key.title`)}
              subtitle={variables.getMessage(`${SYNC_SECTION}.app_key.subtitle`)}
            />
            <Action>
              <Text
                name="dropboxAppKey"
                title={variables.getMessage(`${SYNC_SECTION}.app_key.placeholder`)}
                category="dropbox-sync"
                onChange={setAppKey}
              />
            </Action>
          </Row>
          <Row>
            <Content
              title={variables.getMessage(`${SYNC_SECTION}.redirect_uri.title`)}
              subtitle={variables.getMessage(`${SYNC_SECTION}.redirect_uri.subtitle`)}
            />
            <Action>
              <div className="syncSetupActions">
                <code className="syncRedirectUri">
                  {redirectUri || variables.getMessage(`${SYNC_SECTION}.redirect_uri.unavailable`)}
                </code>
                <div className="resetDataButtonsLayout">
                  <Button
                    disabled={!redirectUri}
                    onClick={copyRedirectUri}
                    icon={<MdContentCopy />}
                    label={variables.getMessage(`${SYNC_SECTION}.buttons.copy_redirect_uri`)}
                  />
                  <Button
                    type="linkIconButton"
                    href={DROPBOX_APP_CONSOLE_URL}
                    tooltipTitle={variables.getMessage(`${SYNC_SECTION}.buttons.open_app_console`)}
                    icon={<MdOpenInNew />}
                    label={variables.getMessage(`${SYNC_SECTION}.buttons.open_app_console`)}
                  />
                </div>
              </div>
            </Action>
          </Row>
        </>
      )}
      <Row final={true}>
        <Content title={title} subtitle={subtitle} />
        <Action>
          <Tooltip title={variables.getMessage(`${SYNC_SECTION}.plain_json`)}>
            <span className="syncStatusIcon">
              {status.conflict || status.pausedReason ? <MdSyncProblem /> : <MdCheck />}
            </span>
          </Tooltip>
          {renderActions()}
        </Action>
      </Row>
      <Modal
        closeTimeoutMS={100}
        onRequestClose={() => setImportModal(false)}
        isOpen={importModal}
        className="Modal resetmodal mainModal"
        overlayClassName="Overlay resetoverlay"
        ariaHideApp={false}
      >
        <div className="smallModal">
          <div className="shareHeader">
            <span className="title">
              {variables.getMessage(`${SYNC_SECTION}.import_modal.title`)}
            </span>
            <Tooltip title={variables.getMessage('modals.main.settings.sections.advanced.reset_modal.cancel')}>
              <div className="close" onClick={() => setImportModal(false)}>
                <MdClose />
              </div>
            </Tooltip>
          </div>
          <span className="title">
            {variables.getMessage(`${SYNC_SECTION}.import_modal.question`)}
          </span>
          <span className="subtitle">
            {variables.getMessage(`${SYNC_SECTION}.import_modal.description`)}
          </span>
          <div className="resetFooter">
            <Button
              type="secondary"
              onClick={() => setImportModal(false)}
              icon={<MdClose />}
              label={variables.getMessage(`${SYNC_SECTION}.buttons.keep_remote`)}
            />
            <Button
              type="settings"
              onClick={() => {
                setImportModal(false);
                void runAction(continueWithLocalAfterImport);
              }}
              icon={<MdFileUpload />}
              label={variables.getMessage(`${SYNC_SECTION}.buttons.overwrite_remote`)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

export { ConfigSync as default, ConfigSync };
