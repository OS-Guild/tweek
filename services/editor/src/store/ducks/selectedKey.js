/* global process */
import { handleActions } from 'redux-actions';
import * as R from 'ramda';
import { push } from 'react-router-redux';
import * as ContextService from '../../services/context-service';
import { tweekManagementClient } from '../../utils/tweekClients';
import {
  createBlankJPadKey,
  createBlankKeyManifest,
  BLANK_KEY_NAME,
} from './ducks-utils/blankKeyDefinition';
import keyValueTypeValidations from './ducks-utils/validations/key-value-type-validations';
import { continueGuard } from './ducks-utils/guards';
import { downloadTags } from './tags';
import { showError } from './notifications';
import { showConfirm } from './alerts';
import { addKeyToList, removeKeyFromList } from './keys';

const KEY_FORMAT_CHANGED = 'KEY_FORMAT_CHANGED';
const KEY_PATH_CHANGE = 'KEY_PATH_CHANGE';
const KEY_ADDING_DETAILS = 'KEY_ADDING_DETAILS';
const KEY_OPENED = 'KEY_OPENED';
const KEY_OPENING = 'KEY_OPENING';
const KEY_RULEDEF_UPDATED = 'KEY_RULEDEF_UPDATED';
const KEY_MANIFEST_UPDATED = 'KEY_MANIFEST_UPDATED';
const KEY_SAVED = 'KEY_SAVED';
const KEY_SAVING = 'KEY_SAVING';
const KEY_NAME_CHANGE = 'KEY_NAME_CHANGE';
const KEY_REVISION_HISTORY = 'KEY_REVISION_HISTORY';
const KEY_DEPENDENTS = 'KEY_DEPENDENTS';
const KEY_VALIDATION_CHANGE = 'KEY_VALIDATION_CHANGE';
const KEY_VALUE_TYPE_CHANGE = 'KEY_VALUE_TYPE_CHANGE';
const SHOW_KEY_VALIDATIONS = 'SHOW_KEY_VALIDATIONS';
const KEY_CLOSED = 'KEY_CLOSED';

function updateRevisionHistory(keyName, since) {
  return async function (dispatch) {
    try {
      const revisionHistory = await tweekManagementClient.getKeyRevisionHistory(
        keyName,
        since || '1 month ago',
      );
      dispatch({ type: KEY_REVISION_HISTORY, payload: { keyName, revisionHistory } });
    } catch (error) {
      dispatch(showError({ title: 'Failed to refresh revisionHistory', error }));
    }
  };
}

function updateKeyDependents(keyName) {
  return async function (dispatch) {
    let dependents = {};
    try {
      dependents = await tweekManagementClient.getKeyDependents(keyName);
    } catch (error) {
      dispatch(
        showError({
          title: `Failed to enumerate key dependents on ${keyName}`,
          error,
        }),
      );
    }
    dispatch({ type: KEY_DEPENDENTS, payload: { keyName, ...dependents } });
  };
}

function createImplementation({ manifest, implementation }) {
  if (manifest.implementation.type === 'file') {
    return {
      source: implementation,
      type: manifest.implementation.format,
    };
  }
  if (manifest.implementation.type === 'const') {
    return {
      source: manifest.implementation.value,
      type: 'const',
    };
  }
}

export function changeKeyFormat(newFormat) {
  return function (dispatch) {
    dispatch({ type: KEY_FORMAT_CHANGED, payload: newFormat });
  };
}

const confirmAddKeyAlert = {
  title: 'Adding New Key',
  message: 'Adding new key will discard all your changes.\nDo you want to continue?',
};

export const addKey = (shouldShowConfirmationScreen, keyPath) =>
  continueGuard(shouldShowConfirmationScreen, confirmAddKeyAlert, (dispatch) => {
    // update the state to empty key in order to skip on leave hook
    dispatch({ type: KEY_OPENED, payload: createBlankJPadKey() });
    // navigate and set defaults
    dispatch(push('/keys/_blank'));
    dispatch(changeKeyValueType('string'));

    const validation = { isValid: false, hint: '', isShowingHint: false };
    setImmediate(() => dispatch(updateKeyPath(keyPath, validation)));
  });

export function addKeyDetails() {
  return async function (dispatch, getState) {
    const currentState = getState();
    if (!currentState.selectedKey.validation.isValid) {
      dispatch({ type: SHOW_KEY_VALIDATIONS });
      return;
    }

    dispatch({ type: KEY_ADDING_DETAILS });
  };
}

export function openKey(key, { revision, historySince } = {}) {
  return async function (dispatch) {
    dispatch(downloadTags());
    try {
      await ContextService.refreshSchema();
    } catch (error) {
      dispatch(showError({ title: 'Failed to refresh schema', error }));
    }

    if (key === BLANK_KEY_NAME) {
      dispatch({ type: KEY_OPENED, payload: createBlankJPadKey() });
      // TODO: remove the code below
      dispatch(changeKeyValueType('string'));
      return;
    }

    dispatch({ type: KEY_OPENING, payload: key });

    let keyData;
    try {
      keyData = await tweekManagementClient.getKeyDefinition(key, revision);
    } catch (exp) {
      dispatch({ type: KEY_OPENED, payload: { key } });
      return;
    }

    const manifest = keyData.manifest || createBlankKeyManifest(key);
    if (manifest.implementation.type === 'alias') {
      dispatch(push(`/keys/${manifest.implementation.key}`));
      return;
    }

    const implementation = createImplementation(keyData);
    const keyOpenedPayload = {
      key,
      implementation,
      manifest,
    };

    await dispatch({ type: KEY_OPENED, payload: keyOpenedPayload });
    dispatch(updateRevisionHistory(key, historySince));
    dispatch(updateKeyDependents(key));
  };
}

export function closeKey() {
  return { type: KEY_CLOSED };
}

export function updateImplementation(implementation) {
  return { type: KEY_RULEDEF_UPDATED, payload: implementation };
}

export function updateKeyManifest(manifest) {
  return { type: KEY_MANIFEST_UPDATED, payload: manifest };
}

async function performSave(dispatch, keyName, { manifest, implementation }) {
  dispatch({ type: KEY_SAVING });

  let isSaveSucceeded;
  try {
    await tweekManagementClient.saveKeyDefinition(keyName, {
      manifest,
      implementation: manifest.implementation.type === 'file' ? implementation.source : undefined,
    });
    isSaveSucceeded = true;
  } catch (error) {
    isSaveSucceeded = false;
    dispatch(showError({ title: 'Failed to save key', error }));
  }

  await dispatch({ type: KEY_SAVED, payload: { keyName, isSaveSucceeded } });
  return isSaveSucceeded;
}

const confirmArchievAlert = {
  title: 'Archive',
  message: 'Archiving the key will discard all your changes.\nDo you want to continue?',
};

export function archiveKey(archived, historySince) {
  return async function (dispatch, getState) {
    const { selectedKey: { key, local, remote } } = getState();

    if (!R.equals(local, remote) && !(await dispatch(showConfirm(confirmArchievAlert))).result)
      return;

    const keyToSave = R.assocPath(['manifest', 'meta', 'archived'], archived, remote);
    if (!await performSave(dispatch, key, keyToSave)) return;

    dispatch({ type: KEY_OPENED, payload: { key, ...keyToSave } });
    if (archived) {
      dispatch(removeKeyFromList(key));
    } else {
      dispatch(addKeyToList(keyToSave.manifest));
    }
    dispatch(updateRevisionHistory(key, historySince));
    dispatch(updateKeyDependents(key));
  };
}

export function changeKeyValidationState(newValidationState) {
  return function (dispatch, getState) {
    const currentValidationState = getState().selectedKey.validation;
    if (R.path(['const', 'isValid'], currentValidationState) !== newValidationState) {
      const payload = R.assocPath(['const', 'isValid'], newValidationState, currentValidationState);
      dispatch({ type: KEY_VALIDATION_CHANGE, payload });
    }
  };
}

export function changeKeyValueType(keyValueType) {
  return async function (dispatch, getState) {
    const keyValueTypeValidation = keyValueTypeValidations(keyValueType);
    keyValueTypeValidation.isShowingHint = !keyValueTypeValidation.isValid;

    dispatch({ type: KEY_VALUE_TYPE_CHANGE, payload: keyValueType });

    const currentValidationState = getState().selectedKey.validation;
    const newValidation = {
      ...currentValidationState,
      manifest: {
        ...currentValidationState.manifest,
        valueType: keyValueTypeValidation,
      },
    };

    dispatch({ type: KEY_VALIDATION_CHANGE, payload: newValidation });
  };
}

export function updateKeyPath(newKeyPath, validation) {
  return async function (dispatch, getState) {
    const currentValidationState = getState().selectedKey.validation;
    const newValidation = {
      ...currentValidationState,
      key: validation,
    };

    dispatch({ type: KEY_VALIDATION_CHANGE, payload: newValidation });
    dispatch({ type: KEY_PATH_CHANGE, payload: newKeyPath });
    dispatch(updateKeyName(newKeyPath));
  };
}

export function updateKeyName(newKeyName) {
  return { type: KEY_NAME_CHANGE, payload: newKeyName };
}

export function saveKey(historySince) {
  return async function (dispatch, getState) {
    const currentState = getState();
    const { selectedKey: { local, key } } = currentState;
    const isNewKey = !!local.key;
    const savedKey = local.key || key;

    if (!currentState.selectedKey.validation.isValid) {
      dispatch({ type: SHOW_KEY_VALIDATIONS });
      return;
    }

    if (!await performSave(dispatch, savedKey, local)) return;

    dispatch(updateRevisionHistory(savedKey, historySince));
    dispatch(updateKeyDependents(savedKey));

    if (isNewKey) {
      dispatch(addKeyToList(local.manifest));
      dispatch(push(`/keys/${savedKey}`));
    }
  };
}

const deleteKeyAlert = (key, aliases = []) => ({
  title: 'Warning',
  message: `Are you sure you want to delete '${key}'?${
    aliases.length ? `\nAll aliases will also be deleted:\n${aliases.join('\n')}` : ''
  }`,
});

export function deleteKey() {
  return async function (dispatch, getState) {
    const { selectedKey: { key, aliases } } = getState();

    if (!(await dispatch(showConfirm(deleteKeyAlert(key, aliases)))).result) return;

    dispatch(push('/keys'));
    try {
      await tweekManagementClient.deleteKey(key, aliases);

      dispatch(removeKeyFromList(key));
      aliases.forEach(alias => dispatch(removeKeyFromList(alias)));
    } catch (error) {
      dispatch(showError({ title: 'Failed to delete key!', error }));
    }
  };
}

export function addAlias(alias) {
  return async function (dispatch, getState) {
    const { selectedKey: { key } } = getState();

    const manifest = createBlankKeyManifest(alias, { type: 'alias', key });

    try {
      await tweekManagementClient.saveKeyDefinition(alias, { manifest });
    } catch (error) {
      dispatch(showError({ title: 'Failed to add alias', error }));
      return;
    }

    dispatch(addKeyToList(manifest));

    const { selectedKey: { usedBy, aliases } } = getState();
    dispatch({
      type: KEY_DEPENDENTS,
      payload: { keyName: key, usedBy, aliases: aliases.concat(alias) },
    });
  };
}

export function deleteAlias(alias) {
  return async function (dispatch, getState) {
    if (!(await dispatch(showConfirm(deleteKeyAlert(alias)))).result) return;

    try {
      await tweekManagementClient.deleteKey(alias);

      dispatch(removeKeyFromList(alias));
      const { selectedKey: { key, usedBy, aliases } } = getState();
      const aliasIndex = aliases.indexOf(alias);
      if (aliasIndex >= 0) {
        dispatch({
          type: KEY_DEPENDENTS,
          payload: { keyName: key, usedBy, aliases: R.remove(aliasIndex, 1, aliases) },
        });
      }
    } catch (error) {
      dispatch(showError({ title: 'Failed to delete alias!', error }));
    }
  };
}

const setValidationHintsVisibility = (validationState, isShown) => {
  Object.values(validationState)
    .filter(x => typeof x === 'object')
    .map((x) => {
      setValidationHintsVisibility(x, isShown);
      return x;
    })
    .filter(x => x.isValid === false)
    .forEach((x) => {
      x.isShowingHint = isShown;
      setValidationHintsVisibility(x, isShown);
    });
};

const handleKeyOpened = (state, { payload: { key, ...keyData } }) => {
  let validation;
  let detailsAdded = false;
  if (key !== BLANK_KEY_NAME) {
    validation = {
      isValid: true,
    };
    detailsAdded = true;
  } else {
    validation = {
      manifest: {
        valueType: keyValueTypeValidations(keyData.manifest.valueType),
      },
      isValid: false,
    };
  }

  setValidationHintsVisibility(validation, false);

  return {
    local: R.clone(keyData),
    remote: R.clone(keyData),
    revisionHistory: state && state.key === key ? state.revisionHistory : undefined,
    key,
    isLoaded: true,
    validation,
    detailsAdded,
  };
};

const handleKeyOpening = (state, { payload: { key } }) => ({
  key,
  isLoaded: false,
});

const handleKeyRuleDefUpdated = (state, { payload }) => ({
  ...state,
  local: {
    ...state.local,
    implementation: { ...state.local.implementation, ...payload },
  },
});

const handleKeyManifestUpdated = (state, { payload }) => ({
  ...state,
  local: {
    ...state.local,
    manifest: payload,
  },
});

const handleKeySaved = (
  { local, remote, ...state },
  { payload: { keyName, isSaveSucceeded, revisionHistory } },
) => {
  if (state.key !== BLANK_KEY_NAME && state.key !== keyName) return state;
  return {
    ...state,
    isSaving: false,
    local,
    remote: isSaveSucceeded ? R.clone(local) : remote,
    revisionHistory: isSaveSucceeded && revisionHistory ? revisionHistory : state.revisionHistory,
  };
};

const handleKeySaving = ({ ...state }) => ({
  ...state,
  isSaving: true,
});

const handleKeyNameChange = ({ local: { key, ...localData }, ...otherState }, { payload }) => ({
  ...otherState,
  local: {
    ...localData,
    manifest: { ...localData.manifest, meta: { ...localData.manifest.meta, name: payload } },
    ...(payload === '' ? {} : { key: payload }),
  },
});

const isStateInvalid = validationState =>
  Object.values(validationState)
    .filter(x => typeof x === 'object')
    .some(x => x.isValid === false || isStateInvalid(x));

const handleKeyValidationChange = ({ ...state }, { payload }) => {
  const isKeyInvalid = isStateInvalid(payload);
  return {
    ...state,
    validation: {
      ...payload,
      isValid: !isKeyInvalid,
    },
  };
};

const handleKeyValueTypeChange = (
  { local: { manifest, ...restOfLocal }, ...state },
  { payload },
) => ({
  ...state,
  local: {
    ...restOfLocal,
    manifest: {
      ...manifest,
      valueType: payload,
    },
  },
});

const handleShowKeyValidations = ({ validation, ...state }) => {
  const newValidation = R.clone(validation);
  setValidationHintsVisibility(newValidation, true);
  return {
    ...state,
    validation: newValidation,
  };
};

const handleKeyRevisionHistory = (state, { payload: { keyName, revisionHistory } }) => {
  if (state.key !== keyName) return state;
  return {
    ...state,
    revisionHistory,
  };
};

const handleKeyDependents = (state, { payload: { keyName, usedBy, aliases } }) => {
  if (state.key !== keyName) return state;
  return {
    ...state,
    usedBy,
    aliases,
  };
};

const handleKeyAddingDetails = (state) => {
  const implementation = {
    type: state.local.manifest.implementation.type,
    source: JSON.stringify(
      {
        partitions: [],
        valueType: state.local.manifest.valueType,
        rules: [],
      },
      null,
      4,
    ),
  };
  const oldLocal = state.local;

  return {
    ...state,
    local: {
      ...oldLocal,
      implementation,
    },
    detailsAdded: true,
  };
};

const handleKeyPathChange = (state, { payload }) =>
  R.pipe(R.assoc('key', payload), R.assocPath(['local', 'manifest', 'key_path'], payload))(state);

const handleKeyFormatChange = (state, { payload }) =>
  R.assocPath(['local', 'manifest', 'implementation'], payload, state);

export default handleActions(
  {
    [KEY_FORMAT_CHANGED]: handleKeyFormatChange,
    [KEY_PATH_CHANGE]: handleKeyPathChange,
    [KEY_ADDING_DETAILS]: handleKeyAddingDetails,
    [KEY_OPENED]: handleKeyOpened,
    [KEY_OPENING]: handleKeyOpening,
    [KEY_RULEDEF_UPDATED]: handleKeyRuleDefUpdated,
    [KEY_MANIFEST_UPDATED]: handleKeyManifestUpdated,
    [KEY_SAVED]: handleKeySaved,
    [KEY_SAVING]: handleKeySaving,
    [KEY_NAME_CHANGE]: handleKeyNameChange,
    [KEY_VALIDATION_CHANGE]: handleKeyValidationChange,
    [KEY_VALUE_TYPE_CHANGE]: handleKeyValueTypeChange,
    [KEY_REVISION_HISTORY]: handleKeyRevisionHistory,
    [SHOW_KEY_VALIDATIONS]: handleShowKeyValidations,
    [KEY_DEPENDENTS]: handleKeyDependents,
    [KEY_CLOSED]: () => null,
  },
  null,
);
