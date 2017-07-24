/* global describe, before, after, it, browser */

import KeysAsserts from '../../KeysAsserts';
import KeysPage, { BLANK_KEY_NAME } from '../../utils/KeysPage';
import keySelectors from '../../selectors/keySelectors';

describe('key-value-type', () => {
  before(() => {
    KeysPage.goToBase();
    browser.windowHandleMaximize();
    browser.click(keySelectors.ADD_KEY_BUTTON);
    KeysAsserts.assertKeyOpened(BLANK_KEY_NAME);
    browser.click(keySelectors.ADD_RULE_BUTTON);
    browser.waitForExist(keySelectors.ruleContainer(0));
    KeysPage.removeRuleCondition(1, 0);
  });

  let setKeyValueAndType = function (keyValueType, value) {
    browser.waitForEnabled(keySelectors.KEY_VALUE_TYPE_INPUT, 1000);
    browser.setValue(keySelectors.KEY_VALUE_TYPE_INPUT, keyValueType);

    KeysPage.acceptRodalIfRaised();

    const ruleValueInputSelector = keySelectors.ruleValueInput(0, keyValueType === "Boolean");
    browser.waitForEnabled(ruleValueInputSelector, 1000);
    browser.setValue(ruleValueInputSelector, value);
  };

  function assertKeySourceWithChanges(valueType, ruleValue) {
    let expectedResult = {
      "partitions": [],
      "valueType": valueType,
      "rules": [{
        "Id": "b74a6ea7-3ad6-58bd-9159-8460162b2e42",
        "Matcher": {},
        "Value": ruleValue,
        "Type": "SingleVariant"
      }]
    };

    KeysAsserts.assertKeySource(expectedResult);
  }

  it('Should convert the value type of the jpad according to the key value type', () => {
    setKeyValueAndType('String', 'someValue');
    assertKeySourceWithChanges("string", "someValue");

    setKeyValueAndType('Number', '5');
    assertKeySourceWithChanges("number", 5);

    setKeyValueAndType('Boolean', 'true');
    assertKeySourceWithChanges("boolean", true);

    setKeyValueAndType('Boolean', 'false');
    assertKeySourceWithChanges("boolean", false);

    setKeyValueAndType('Version', '1.1.1');
    assertKeySourceWithChanges("version", '1.1.1');
  });
});