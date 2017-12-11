/* global describe, before, beforeEach, after, afterEach, it, browser */

import { expect } from 'chai';
import Key from '../../utils/Key';
import { dataComp, attributeSelector } from '../../utils/selector-utils';

const timeout = 5000;

describe('key aliases', () => {
  const originalKeyPath = 'behavior_tests/key_aliases/regular_key';
  const aliasKeyPath = 'behavior_tests/key_aliases/alias_key';

  it('should redirect to original key and show aliases', () => {
    Key.open().navigate(aliasKeyPath);

    browser.waitUntil(() => Key.isCurrent(originalKeyPath), timeout);

    browser.clickWhenVisible(dataComp('aliases-toggle'), timeout);
    browser.waitForVisible(
      `${dataComp('aliases')} ${attributeSelector('data-dependency', aliasKeyPath)}`,
    );
  });
});
