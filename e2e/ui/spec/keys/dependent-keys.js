/* global describe, before, beforeEach, after, afterEach, it, browser */

import { expect } from 'chai';
import Key from '../../utils/Key';
import Rule from '../../utils/Rule';
import { dataComp } from '../../utils/selector-utils';
import { login } from '../../utils/auth-utils';

const timeout = 5000;

const errorNotification = '.notifications-br .notification-error .notification-title';

describe('dependent keys', () => {
  before(() => login());

  it('should save when no circular dependencies', () => {
    Key.open('behavior_tests/dependent_keys/pass/depends_on');
    Rule.add().setCondition('keys.behavior_tests/dependent_keys/pass/used_by', 'value');
    Key.commitChanges();
  });

  it('should not save circular dependencies', () => {
    Key.open('behavior_tests/dependent_keys/fail/third');
    Rule.add().setCondition('keys.behavior_tests/dependent_keys/fail/first', 'value');

    Key.clickSave();

    browser.waitForText(errorNotification, timeout);
    const errorText = browser.getText(errorNotification);
    expect(errorText).to.equal('Failed to save key');
  });

  it('should display dependency relations between keys', () => {
    const dependsOn = 'behavior_tests/dependent_keys/display/depends_on';
    const dependsOnAlias = 'behavior_tests/dependent_keys/display/depends_on_alias';
    const usedBy = 'behavior_tests/dependent_keys/display/used_by';

    // Verify depends on
    Key.open(dependsOn).toggle('depends-on');
    browser.waitForVisible(`${dataComp('depends-on')} a[href="/keys/${usedBy}"]`);

    // Verify used by
    Key.open(usedBy).toggle('used-by');
    browser.waitForVisible(`${dataComp('used-by')} a[href="/keys/${dependsOn}"]`);
    browser.waitForVisible(`${dataComp('used-by')} a[href="/keys/${dependsOnAlias}"]`);
  });
});
