/* global describe, before, beforeEach, after, afterEach, it, browser */

import chai, { expect } from 'chai';
import chaiString from 'chai-string';
import KeysAsserts from '../../KeysAsserts';
import PageAsserts from '../../PageAsserts';
import KeysPageObject from '../../utils/KeysPageObject';
import keySelectors from '../../selectors/keySelectors';
import globalSelectors from '../../selectors/globalSelectors';

chai.use(chaiString);

describe('delete key', () => {
  const keysPageObject = new KeysPageObject(browser);

  const testFolder = KeysPageObject.TEST_KEYS_FOLDER;
  const deleteKeyTestFolder = '@delete_key';
  let keyToDeleteFullPath;

  const pageAsserts = new PageAsserts(keysPageObject);
  const keysAsserts = new KeysAsserts(keysPageObject, browser);

  beforeEach(() => {
    keysPageObject.goToBase();
    const keyToDelete = keysPageObject.generateTestKeyName('delete_key_test');
    keyToDeleteFullPath = `${testFolder}/${deleteKeyTestFolder}/${keyToDelete}`;
    keysPageObject.addEmptyKey(keyToDeleteFullPath);
    keysPageObject.goToKey(keyToDeleteFullPath);
  });

  describe('archive', () => {
    it('should archive key', () => {
      browser.click(keySelectors.ARCHIVE_KEY_BUTTON);
      keysPageObject.waitForSaved();

      expect(browser.isVisible(keySelectors.READONLY_KEY_MESSAGE), 'should show key is readonly message').to.be.true;
      const displayText = browser.getText(keySelectors.KEY_DISPLAY_NAME);
      expect(displayText).to.startsWith('ARCHIVED: ');
      expect(browser.isVisible(keySelectors.ARCHIVE_KEY_BUTTON), 'should not show archive key button').to.be.false;
      expect(browser.isVisible(keySelectors.DELETE_KEY_BUTTON), 'should show delete key button').to.be.true;
      expect(browser.isVisible(keySelectors.RESTORE_KEY_BUTTON), 'should show restore key button').to.be.true;
    });
  });

  describe('restore', () => {
    beforeEach(() => {
      browser.click(keySelectors.ARCHIVE_KEY_BUTTON);
      keysPageObject.waitForSaved();
    });

    it('should restore key', () => {
      browser.click(keySelectors.RESTORE_KEY_BUTTON);
      keysPageObject.waitForSaved();

      expect(browser.isVisible(keySelectors.READONLY_KEY_MESSAGE), 'should not show key is readonly message').to.be.false;
      const displayText = browser.getText(keySelectors.KEY_DISPLAY_NAME);
      expect(displayText).to.not.startsWith('ARCHIVED: ');

      expect(browser.isVisible(keySelectors.ARCHIVE_KEY_BUTTON), 'should show archive key button').to.be.true;
      expect(browser.isVisible(keySelectors.DELETE_KEY_BUTTON), 'should not show delete key button').to.be.false;
      expect(browser.isVisible(keySelectors.RESTORE_KEY_BUTTON), 'should not show restore key button').to.be.false;
    })
  });

  describe('delete', () => {
    beforeEach(() => {
      browser.click(keySelectors.ARCHIVE_KEY_BUTTON);
      keysPageObject.waitForSaved();
    });

    it('should not delete key if alert was not accepted', () => {
      browser.click(keySelectors.DELETE_KEY_BUTTON);
      browser.waitForVisible(keySelectors.ALERT_CANCEL_BUTTON, 1000);
      browser.leftClick(globalSelectors.ALERT_BACKGROUND, -200, -200);

      pageAsserts.assertIsInPage(`${KeysPageObject.KEYS_PAGE_URL}/${keyToDeleteFullPath}`, 'should still be in key page');
      keysAsserts.assertIsKeyExistsAfterTransaction(keyToDeleteFullPath, true, 'key should exist after cancel delete');
    });

    it('should not delete key if alert was canceled', () => {
      browser.click(keySelectors.DELETE_KEY_BUTTON);
      browser.waitForVisible(keySelectors.ALERT_CANCEL_BUTTON, 1000);
      browser.click(keySelectors.ALERT_CANCEL_BUTTON);

      pageAsserts.assertIsInPage(`${KeysPageObject.KEYS_PAGE_URL}/${keyToDeleteFullPath}`, 'should still be in key page');
      keysAsserts.assertIsKeyExistsAfterTransaction(keyToDeleteFullPath, true, 'key should exist after cancel delete');
    });

    it('should succeed deleting key', () => {
      browser.click(keySelectors.DELETE_KEY_BUTTON);
      browser.waitForVisible(keySelectors.ALERT_CANCEL_BUTTON, 1000);
      keysPageObject.acceptRodalIfRaised();

      pageAsserts.assertIsInPage(KeysPageObject.KEYS_PAGE_URL, 'should moves to keys page url');
      keysAsserts.assertIsKeyExistsAfterTransaction(keyToDeleteFullPath, false, 'key should not exist after delete');
    });
  });
});

