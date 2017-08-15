/* global describe, before, after, it, browser */

import Key from '../../utils/Key';
import selectors from '../../selectors/keySelectors';
import Chance from 'chance';

const timeout = 5000;

describe('add tags', () => {
  const NUMBER_OF_TAGS_TO_ADD = 1;

  const tagsTestKeyName = 'tags_test';
  const tagsTestFolder = '@tags';
  const tagsTestKeyFullPath = `@behavior_tests/${tagsTestFolder}/${tagsTestKeyName}`;

  const chance = new Chance();

  before(() => {
    Key.open(tagsTestKeyFullPath);
  });

  function addTag(tagName) {
    browser.setValue(selectors.TAGS_INPUT, `${tagName}\n`);
  }

  function isTagExists(tag) {
    const partialTag = tag.slice(0, tag.length - 1);
    browser.setValue(selectors.TAGS_INPUT, partialTag);
    browser.waitForVisible(selectors.TAGS_SUGGESTION, 1000);

    const tagsSuggestions = browser.elements(selectors.TAGS_SUGGESTION);
    return tagsSuggestions.value.length === 1;
  }

  it('should save the tag as a suggestion on submiting it without saving the key', () => {
    // Arrange
    const tagsToAdd = [];
    for (let tagsIndex = 0; tagsIndex < NUMBER_OF_TAGS_TO_ADD; tagsIndex++)
      tagsToAdd.push(chance.guid());

    // Act
    tagsToAdd.forEach(x => addTag(x));
    browser.refresh();
    browser.alertAccept();

    browser.waitForVisible(selectors.TAGS_INPUT, timeout);

    // Assert
    tagsToAdd.forEach(x => browser.waitUntil(() => isTagExists(x), timeout));
  });
});
