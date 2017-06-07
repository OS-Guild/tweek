import moment from 'moment';
import PageObject from './PageObject';
import keySelectors from '../selectors/keySelectors';
import globalSelectors from '../selectors/globalSelectors';
import { getRelativeSelector } from '../selectors/selectorUtils';

export const BLANK_KEY_NAME = '_blank';

export default class KeysPageObject extends PageObject {

  static KEYS_PAGE_URL = 'keys';

  goToBase() {
    this.browser.url(PageObject.BASE_URL);
    this.browser.acceptAlertIfPresent();

    this.browser.waitForVisible(keySelectors.ADD_KEY_BUTTON, PageObject.GIT_TRANSACTION_TIMEOUT);
  }

  goToKeyUrl(keyName) {
    const goTo = `${PageObject.BASE_URL}${KeysPageObject.KEYS_PAGE_URL}/${keyName}`;

    this.browser.url(goTo);

    this.browser.acceptAlertIfPresent();

    this.waitForPageToLoad();
  }

  goToKey(keyName) {
    this.goToKeyUrl(keyName);

    const selectorToWaitFor = keyName.startsWith(BLANK_KEY_NAME) ?
      keySelectors.KEY_NAME_INPUT : keySelectors.KEY_DISPLAY_NAME;

    this.browser.waitForVisible(selectorToWaitFor, PageObject.GIT_TRANSACTION_TIMEOUT);
  }

  goToKeysList() {
    this.browser.url(`${PageObject.BASE_URL}keys`);
    this.browser.waitForVisible(keySelectors.KEY_LIST_FILTER, 10000);
  }

  getKeySource() {
    this.browser.waitForVisible(keySelectors.TAB_ITEM_HEADER, 2000);
    this.browser.click(keySelectors.SOURCE_TAB_ITEM);
    const keySourceCode = this.browser.getHTML(keySelectors.KEY_SOURCE_TEXT, false);
    this.browser.click(keySelectors.RULES_TAB_ITEM);
    return JSON.parse(keySourceCode);
  }

  getNumberOfRules() {
    return this.browser.elements(keySelectors.ruleContainer()).value.length;
  }

  addEmptyKey(keyName, keyValueType = 'String') {
    console.log('adding key', keyName);
    this.goToKey(BLANK_KEY_NAME);

    this.browser.waitForVisible(keySelectors.KEY_NAME_INPUT, 5000);
    this.browser.setValue(keySelectors.KEY_NAME_INPUT, keyName);
    browser.click(globalSelectors.BACKGROUND);

    this.browser.setValue(keySelectors.KEY_VALUE_TYPE_INPUT, keyValueType);

    this.browser.click(keySelectors.SAVE_CHANGES_BUTTON);
    this.browser.waitUntil(() =>
      this.isInKeyPage(keyName),
      PageObject.GIT_TRANSACTION_TIMEOUT);

    this.browser.waitForVisible(keySelectors.KEY_DISPLAY_NAME, PageObject.GIT_TRANSACTION_TIMEOUT);
  }

  isInKeyPage(keyName) {
    const location = this.getUrlLocation();
    return location === `${KeysPageObject.KEYS_PAGE_URL}/${keyName}`;
  }

  isSaving() {
    return this.browser.getAttribute(keySelectors.SAVE_CHANGES_BUTTON, 'data-state-is-saving') === 'true';
  }

  hasChanges() {
    return this.browser.getAttribute(keySelectors.SAVE_CHANGES_BUTTON, 'data-state-has-changes') === 'true';
  }

  isSaveButtonDisabled() {
    return this.browser.getAttribute(keySelectors.SAVE_CHANGES_BUTTON, 'disabled') === 'true';
  }

  clickOnFolder(folderName) {
    const folderSelector = keySelectors.folder(folderName);

    this.browser.waitForVisible(folderSelector, 2000);
    this.browser.click(folderSelector);
  }

  clickOnKeyLink(keyName) {
    const keyLinkSelector = keySelectors.keyLink(keyName);

    this.browser.waitForVisible(keyLinkSelector, 2000);
    this.browser.click(keyLinkSelector);
  }

  navigateToKey(keyFullPath) {
    const keyFolders = keyFullPath.split('/');
    const keyName = keyFolders.pop();

    let partialFolderPath = '';
    keyFolders.forEach(folder => {
      partialFolderPath += folder;
      this.clickOnFolder(partialFolderPath);
      partialFolderPath += '/';
    });

    this.clickOnKeyLink(partialFolderPath + keyName);
  }

  enterFilterInKeysList(filter) {
    const keyListFilterSelector = keySelectors.KEY_LIST_FILTER;

    this.browser.waitForVisible(keyListFilterSelector, 1000);
    this.browser.click(keyListFilterSelector);
    this.browser.setValue(keyListFilterSelector, filter);
  }

  waitForKeyToBeDeleted(keyName) {
    const checkIsKeyWasDeleted = (keyName) => {
      this.goToKeyUrl(keyName);
      return this.browser.isExisting(keySelectors.NONE_EXISTING_KEY);
    };

    this.browser.waitUntil(() => checkIsKeyWasDeleted(keyName), PageObject.GIT_TRANSACTION_TIMEOUT);
  }

  waitForPageToLoad() {
    this.browser.waitForVisible(keySelectors.KEY_PAGE, PageObject.GIT_TRANSACTION_TIMEOUT);
  }

  waitForKeyToLoad(timeout = 10000) {
    this.browser.waitForVisible(keySelectors.DELETE_KEY_BUTTON, timeout);
  }

  generateTestKeyName(prefix) {
    const currentDate = new Date();
    return `${prefix}_${moment(currentDate).format('DD_MM_YYYY_HH_mm_ss')}`;
  }

  acceptRodalIfRaised() {
    this.browser.clickIfVisible(keySelectors.ALERT_OK_BUTTON, 500);
  }

  setConditionPropertyFromSuggestion(ruleNumber, conditionNumber, suggestionIndex) {
    const conditionPropertyInputSelector = keySelectors.conditionPropertyName(ruleNumber, conditionNumber);
    const suggestionSelector = globalSelectors.typeaheadSuggestionByIndex(suggestionIndex);

    this.browser.click(globalSelectors.BACKGROUND);
    this.browser.click(conditionPropertyInputSelector);
    this.browser.waitForVisible(suggestionSelector, 5000);
    this.browser.click(suggestionSelector);
  }

  setConditionPropertyFromSuggestionValuePrefix(ruleNumber, conditionNumber, valuePrefix) {
    const conditionPropertyInputSelector = keySelectors.conditionPropertyName(ruleNumber, conditionNumber);
    this.browser.setValue(conditionPropertyInputSelector, valuePrefix);
    const suggestionSelector = globalSelectors.typeaheadSuggestionByIndex(0);
    this.browser.waitForVisible(suggestionSelector, 5000);
    this.browser.click(suggestionSelector);
  }

  setConditionValue(ruleNumber, conditionNumber, value) {
    const conditionValueInputSelector = keySelectors.conditionValue(ruleNumber, conditionNumber);
    this.browser.setValue(conditionValueInputSelector, value);
  }

  addRuleCondition(ruleNumber) {
    const ruleSelector = keySelectors.ruleContainer(ruleNumber);
    const addConditionButtonSelector = getRelativeSelector([ruleSelector, keySelectors.ADD_CONDITION_BUTTON]);
    this.browser.click(addConditionButtonSelector);
    this.browser.click(globalSelectors.BACKGROUND);
  }

  removeRuleCondition(ruleNumber, conditionNumber) {
    const conditionDeleteButtonSelector = keySelectors.conditionDeleteButton(ruleNumber, conditionNumber);
    this.browser.click(conditionDeleteButtonSelector);
  }

  setRuleValue(ruleNumber, value, keyValueType) {
    const ruleValueInputSelector = keySelectors.ruleValueInput(ruleNumber, keyValueType == "Boolean");
    this.browser.setValue(ruleValueInputSelector, value);
  }

  addPartitionFromProperty(property) {
    this.browser.setValue(keySelectors.ADD_PARTITION_INPUT, property);
    this.browser.keys('\uE007');
  }

  setKeySource(source, timeout = 5000) {
    this.browser.waitForVisible('.monaco-editor', timeout);
    this.browser.execute(function (source) {
      window.monaco.editor.getModels()[0].setValue(source);
    }, source);
  }

  saveChanges() {
    this.browser.click(keySelectors.SAVE_CHANGES_BUTTON);
    this.browser.waitUntil(() => !this.hasChanges() && !this.isSaving(), PageObject.GIT_TRANSACTION_TIMEOUT, "changes were not saved");
  }
}