import cogoToast from 'cogo-toast';
import { equals } from 'ramda';
import { useCallback } from 'react';
import { useHistory } from 'react-router';
import { KeyManifest } from 'tweek-client/src/TweekManagementClient/types';
import { createBlankKeyManifest } from '../../store/ducks/ducks-utils/blankKeyDefinition';
import { showError, tweekManagementClient, useHistorySince } from '../../utils';
import { useAlerter } from '../Alerts';
import { useKeysActions } from '../AllKeys';
import { useSelectedKeyContext } from './SelectedKey';

const deleteKeyAlert = (key: string, aliases: string[] = []) => ({
  title: 'Warning',
  message: `Are you sure you want to delete '${key}'?${
    aliases.length ? `\nAll aliases will also be deleted:\n${aliases.join('\n')}` : ''
  }`,
});

const confirmArchievAlert = {
  title: 'Archive',
  message: 'Archiving the key will discard all your changes.\nDo you want to continue?',
};

/* eslint-disable react-hooks/exhaustive-deps */

export const useDeleteAlias = () => {
  const key$ = useSelectedKeyContext();
  const { deleteKey } = useKeysActions();
  const alerter = useAlerter();

  return useCallback(
    async (alias: string) => {
      if (!(await alerter.showConfirm(deleteKeyAlert(alias))).result) {
        return;
      }

      const { hide } = cogoToast.loading('Deleting alias...', { hideAfter: 0 });

      try {
        await deleteKey(alias);
      } catch (err) {
        showError(err, 'Failed to delete alias');
        return;
      } finally {
        hide!();
      }

      const { aliases, ...key } = key$.value;
      key$.next({ ...key, aliases: aliases?.filter((a) => a !== alias) });
      cogoToast.success('Alias deleted successfully');
    },
    [key$, deleteKey],
  );
};

export const useKeyActions = () => {
  const key$ = useSelectedKeyContext();
  const { deleteKey: deleteRemoteKey, saveKey: saveRemoteKey } = useKeysActions();
  const alerter = useAlerter();
  const history = useHistory();
  const historySince = useHistorySince();

  const addAlias = useCallback(
    async (alias: string) => {
      if (key$.value.isSaving) {
        return;
      }

      const keyPath = key$.value.manifest?.key_path;
      if (!keyPath) {
        cogoToast.error('Failed to add alias');
        return;
      }

      const { hide } = cogoToast.loading('Saving alias...', { hideAfter: 0 });
      const manifest = createBlankKeyManifest(alias, {
        type: 'alias',
        key: keyPath,
      } as any) as KeyManifest;

      try {
        await saveRemoteKey({ manifest });
      } catch (error) {
        showError(error, 'Failed to add alias');
        return;
      } finally {
        hide!();
      }

      const { aliases = [], ...key } = key$.value;
      key$.next({ ...key, aliases: aliases.concat(alias) });
      cogoToast.success('Alias added successfully');
    },
    [key$, saveRemoteKey],
  );

  const archiveKey = useCallback(
    async (archived: boolean) => {
      const { remote, manifest, implementation, isSaving } = key$.value;

      if (isSaving) {
        return;
      }

      if (!manifest) {
        cogoToast.error('Failed to archive key');
        return;
      }

      const hasChanges =
        !equals(remote?.manifest, manifest) || !equals(remote?.implementation, implementation);

      if (hasChanges && !(await alerter.showConfirm(confirmArchievAlert)).result) {
        return;
      }

      key$.next({ ...key$.value, isSaving: true });
      const { hide } = cogoToast.loading(`${archived ? 'Archiving' : 'Restoring'} key`, {
        hideAfter: 0,
      });

      const local = {
        manifest: { ...manifest, meta: { ...manifest.meta, archived } },
        implementation,
      };

      try {
        await saveRemoteKey(local);
      } catch (err) {
        showError(err, `Failed to ${archived ? 'archive' : 'restore'} key`);
        key$.next({ ...key$.value, isSaving: false });
        return;
      } finally {
        hide!();
      }

      key$.next({ ...key$.value, remote: local, ...local, isSaving: false });

      tweekManagementClient
        .getKeyRevisionHistory(manifest.key_path, historySince)
        .then((revision) => key$.next({ ...key$.value, revisionHistory: revision }))
        .catch((err) => showError(err, 'Failed to load revision history'));

      cogoToast.success(`Key ${archived ? 'archived' : 'restored'} successfully`);
    },
    [key$, saveRemoteKey],
  );

  const deleteKey = useCallback(async () => {
    const { aliases, manifest, isSaving } = key$.value;

    if (isSaving) {
      return;
    }

    if (!manifest) {
      cogoToast.error('Failed to delete key');
      return;
    }

    const key = manifest.key_path;
    if (!(await alerter.showConfirm(deleteKeyAlert(key, aliases))).result) {
      return;
    }

    const { hide } = cogoToast.loading('Deleting key...', { hideAfter: 0 });
    history.push('/keys');

    try {
      await deleteRemoteKey(key, aliases);
      cogoToast.success('Key deleted successfully');
    } catch (err) {
      showError(err, 'Failed to delete key');
    } finally {
      hide!();
    }
  }, [key$, deleteRemoteKey]);

  const saveKey = useCallback(async () => {
    const { manifest, implementation, isSaving } = key$.value;

    if (isSaving) {
      return;
    }

    if (!manifest) {
      cogoToast.error('Failed to save key');
      return;
    }

    const { hide } = cogoToast.loading('Saving key...', { hideAfter: 0 });
    key$.next({ ...key$.value, isSaving: true });

    const definition = { manifest, implementation };

    try {
      await saveRemoteKey(definition);
    } catch (err) {
      showError(err, 'Failed to save key');
      key$.next({ ...key$.value, isSaving: false });
    } finally {
      hide!();
    }

    if (key$.value.remote) {
      tweekManagementClient
        .getKeyRevisionHistory(manifest.key_path, historySince)
        .then((revision) => key$.next({ ...key$.value, revisionHistory: revision }))
        .catch((err) => showError(err, 'Failed to load revision history'));
    }

    key$.next({ ...key$.value, remote: definition, isSaving: false });

    cogoToast.success('Key saved successfully');
  }, [key$, saveRemoteKey]);

  return { addAlias, archiveKey, deleteKey, saveKey };
};
