import { handleActions } from 'redux-actions';
import R from 'ramda';
import { push } from 'react-router-redux';
import * as ContextService from '../../services/context-service';
import fetch from '../../utils/fetch';
import { withJsonData } from '../../utils/http';
import {
  createBlankJPadKey,
  createBlankKeyManifest,
  BLANK_KEY_NAME,
} from './ducks-utils/blankKeyDefinition';
import keyNameValidations from './ducks-utils/validations/key-name-validations';
import keyValueTypeValidations from './ducks-utils/validations/key-value-type-validations';
import { downloadTags } from './tags';
import { showError } from './notifications';
import { showConfirm } from './alerts';
import { addKeyToList, removeKeyFromList } from './keys';

const KEY_OPENED = 'KEY_OPENED';
const KEY_OPENING = 'KEY_OPENING';
const KEY_RULEDEF_UPDATED = 'KEY_RULEDEF_UPDATED';
const KEY_MANIFEST_UPDATED = 'KEY_MANIFEST_UPDATED';
const KEY_SAVED = 'KEY_SAVED';
const KEY_SAVING = 'KEY_SAVING';
const KEY_NAME_CHANGE = 'KEY_NAME_CHANGE';
const KEY_REVISION_HISTORY = 'KEY_REVISION_HISTORY';
const KEY_VALIDATION_CHANGE = 'KEY_VALIDATION_CHANGE';
const KEY_VALUE_TYPE_CHANGE = 'KEY_VALUE_TYPE_CHANGE';
const SHOW_KEY_VALIDATIONS = 'SHOW_KEY_VALIDATIONS';
const KEY_CLOSED = 'KEY_CLOSED';

function updateRevisionHistory(keyName, revisionHistory) {
  return async function (dispatch) {
    try {
      revisionHistory =
        revisionHistory || (await (await fetch(`/api/revision-history/${keyName}`)).json());
      dispatch({ type: KEY_REVISION_HISTORY, payload: { keyName, revisionHistory } });
    } catch (error) {
      dispatch(showError({ title: 'Failed to refresh revisionHistory', error }));
    }
  };
}

export function openKey(key, { revision } = {}) {
  return async function (dispatch) {
    dispatch(downloadTags());
    try {
      ContextService.refreshSchema();
    } catch (error) {
      dispatch(showError({ title: 'Failed to refresh schema', error }));
    }

    if (key === BLANK_KEY_NAME) {
      dispatch({ type: KEY_OPENED, payload: createBlankJPadKey() });
      return;
    }

    dispatch({ type: KEY_OPENING, payload: key });

    let keyData;
    const search = revision ? `?revision=${revision}` : '';
    try {
      keyData = await (await fetch(`/api/keys/${key}${search}`)).json();
    } catch (exp) {
      dispatch({ type: KEY_OPENED, payload: { key } });
      return;
    }

    const manifest = keyData.manifest || createBlankKeyManifest(key);
    const keyOpenedPayload = {
      key,
      keyDef: keyData.keyDef,
      manifest,
    };

    await dispatch({ type: KEY_OPENED, payload: keyOpenedPayload });
    dispatch(updateRevisionHistory(key));
  };
}

export function closeKey() {
  return { type: KEY_CLOSED };
}

export function updateKeyDef(keyDef) {
  return { type: KEY_RULEDEF_UPDATED, payload: keyDef };
}

export function updateKeyManifest(manifest) {
  return { type: KEY_MANIFEST_UPDATED, payload: manifest };
}

async function performSave(dispatch, keyName, data) {
  dispatch({ type: KEY_SAVING });

  let isSaveSucceeded;
  try {
    await fetch(`/api/keys/${keyName}`, {
      method: 'put',
      ...withJsonData(data),
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

export function archiveKey(archived) {
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
      dispatch(addKeyToList(key));
    }
    dispatch(updateRevisionHistory(key));
  };
}

function getAllRules({ jpad, rules = [jpad.rules], depth = jpad.partitions.length }) {
  return depth === 0
    ? R.flatten(rules)
    : getAllRules({ rules: R.flatten(rules.map(x => Object.values(x))), depth: depth - 1 });
}

const convertRuleValuesAlert = {
  title: 'Attention',
  message: 'Rule values will try to be converted to new type.\nDo you want to continue?',
};

export function updateKeyValueType(keyValueType) {
  return async function (dispatch, getState) {
    const jpad = JSON.parse(getState().selectedKey.local.keyDef.source);
    const allRules = getAllRules({ jpad });
    const shouldShowAlert = allRules.some(
      x =>
        x.Type !== 'SingleVariant' || (x.Value !== null && x.Value !== undefined && x.Value !== ''),
    );

    if (shouldShowAlert && !(await dispatch(showConfirm(convertRuleValuesAlert))).result) return;

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

export function updateKeyName(newKeyName) {
  return async function (dispatch, getState) {
    const keyNameValidation = keyNameValidations(newKeyName, getState().keys);
    keyNameValidation.isShowingHint = !keyNameValidation.isValid;

    dispatch({ type: KEY_NAME_CHANGE, payload: newKeyName });

    const currentValidationState = getState().selectedKey.validation;
    const newValidation = {
      ...currentValidationState,
      key: keyNameValidation,
    };

    dispatch({ type: KEY_VALIDATION_CHANGE, payload: newValidation });
  };
}

export function saveKey() {
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

    dispatch(updateRevisionHistory(savedKey));

    if (isNewKey) dispatch(addKeyToList(savedKey));
    const shouldOpenNewKey = isNewKey && getState().selectedKey.key === BLANK_KEY_NAME;

    if (shouldOpenNewKey) {
      dispatch(push(`/keys/${savedKey}`));
    }
  };
}

const deleteKeyAlert = key => ({
  title: 'Warning',
  message: `Are you sure you want to delete '${key}' key?`,
});

export function deleteKey() {
  return async function (dispatch, getState) {
    const { selectedKey: { key } } = getState();

    if (!(await dispatch(showConfirm(deleteKeyAlert(key)))).result) return;

    dispatch(push('/keys'));
    try {
      await fetch(`/api/keys/${key}`, {
        method: 'delete',
      });

      dispatch(removeKeyFromList(key));
    } catch (error) {
      dispatch(showError({ title: 'Failed to delete key!', error }));
    }
  };
}

const setValidationHintsVisibility = (validationState, isShown) => {
  Object.keys(validationState)
    .map(x => validationState[x])
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
  if (key !== BLANK_KEY_NAME) {
    validation = {
      isValid: true,
    };
  } else {
    validation = {
      key: keyNameValidations(key, []),
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
    keyDef: { ...state.local.keyDef, ...payload },
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
  Object.keys(validationState)
    .map(x => validationState[x])
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
  setValidationHintsVisibility(validation, true);
  return {
    ...state,
    validation,
  };
};

const handleKeyRevisionHistory = (state, { payload: { keyName, revisionHistory } }) => {
  if (state.key !== keyName) return state;
  return {
    ...state,
    revisionHistory,
  };
};

export default handleActions(
  {
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
    [KEY_CLOSED]: () => null,
  },
  null,
);
