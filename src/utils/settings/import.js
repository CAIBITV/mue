import { toast } from 'react-toastify';
import variables from 'config/variables';
import { shouldImportSettingKey } from 'utils/sync/configSyncKeys';
import {
  beginSettingsImportTransaction,
  finishSettingsImportTransaction,
} from 'utils/sync/configSyncService';

/**
 * It takes a JSON file of Mue settings, parses it, and then sets the localStorage values to the values in the
 * file.
 * @param e - The JSON settings string to import
 */
export function importSettings(e, initial = false) {
  beginSettingsImportTransaction();

  try {
    const content = JSON.parse(e);

    Object.keys(content).forEach((key) => {
      if (!shouldImportSettingKey(key)) return;
      localStorage.setItem(key, content[key]);
    });

    toast(variables.getMessage('toasts.imported'));
    // don't show achievements on welcome
    if (!initial) {
      variables.stats.postEvent('tab', 'Settings imported');
    }

    finishSettingsImportTransaction({ initial });
  } catch (error) {
    finishSettingsImportTransaction({ initial, failed: true });
    throw error;
  }
}
