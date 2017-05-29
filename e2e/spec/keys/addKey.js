/* global describe, before, after, it, browser */

import KeysAsserts from '../../KeysAsserts';
import KeysPageObject, { BLANK_KEY_NAME } from '../../utils/KeysPageObject';
import assert from 'assert';
import keySelectors from '../../selectors/keySelectors';
import globalSelectors from '../../selectors/globalSelectors';

describe('add key', () => {
  const keysPageObject = new KeysPageObject(browser);

  const keyToAdd = keysPageObject.generateTestKeyName('add_key_test');
  const testFolder = KeysPageObject.TEST_KEYS_FOLDER;
  const addKeyTestFolder = '@add_key';
  const keyToAddFullPath = `${testFolder}/${addKeyTestFolder}/${keyToAdd}`;

  const keysAsserts = new KeysAsserts(keysPageObject, browser);

  before(() => {
    keysPageObject.goToBase();
  });

  it('should succeed adding key', () => {
    browser.click(keySelectors.ADD_KEY_BUTTON);
    keysAsserts.assertKeyOpened(BLANK_KEY_NAME);
    browser.windowHandleMaximize();

    let isKeyPathSuggestionsExists = browser.isExisting(keySelectors.KEY_PATH_SUGGESTIONS);
    assert(!isKeyPathSuggestionsExists, 'should not show key name suggestions on start');

    keysAsserts.assertKeyHasNumberOfRules(0);

    browser.click(keySelectors.KEY_NAME_INPUT);
    isKeyPathSuggestionsExists = browser.isExisting(keySelectors.KEY_PATH_SUGGESTIONS);
    assert(isKeyPathSuggestionsExists, 'should show key name suggestions on input focus');

    browser.setValue(keySelectors.KEY_NAME_INPUT, keyToAddFullPath);
    browser.click(globalSelectors.BACKGROUND);

    browser.setValue(keySelectors.KEY_VALUE_TYPE_INPUT, 'String');

    assert(keysPageObject.hasChanges(), 'should have changes');

    browser.click(keySelectors.SAVE_CHANGES_BUTTON);
    assert(keysPageObject.isSaving(), 'should be in saving state');

    browser.waitUntil(() =>
      keysPageObject.isInKeyPage(keyToAddFullPath),
      KeysPageObject.GIT_TRANSACTION_TIMEOUT);

    browser.waitForVisible(keySelectors.DELETE_KEY_BUTTON, KeysPageObject.GIT_TRANSACTION_TIMEOUT);

    assert(browser.getText(keySelectors.KEY_DISPLAY_NAME),
      keyToAddFullPath,
      'should set the key name correctly');

    browser.waitUntil(() =>
      !keysPageObject.hasChanges(), 4000, 'new key should not be in with-changes state');
  });
});
