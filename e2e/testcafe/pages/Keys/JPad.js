import { attributeSelector, dataComp, dataField } from '../../utils/selector-utils';
import { Selector } from 'testcafe';
import ObjectEditor from './ObjectEditor';
import NewRule from './Rules/NewRule';
import Rule from './Rules/Rule';
import TypedInput from './TypedInput';
import TagInput from './TypedInput/TagInput';

const tabHeader = attributeSelector('data-tab-header');

class PartitionGroup {
  constructor(values) {
    this.container = Selector(dataComp('partition-group')).withAttribute(
      'data-group',
      values.join(', ').toLowerCase(),
    );
    this.deleteButton = this.container.find(dataComp('delete-partition-group'));
  }
}

class NewPartition {
  container = Selector(dataComp('new-partition'));
  addButton = this.container.find(dataComp('add-partition'));

  propertyValue(property) {
    return this.container.find(dataField(property));
  }
}

export default class JPad {
  container = Selector(dataComp('key-rules-editor'));

  defaultValue = new TypedInput(this.container.find(dataComp('default-value')));
  partitions = new TagInput(this.container.find(dataComp('partition-selector')));

  sourceTab = this.container.find(tabHeader('source'));
  rulesTab = this.container.find(tabHeader('rules'));

  newPartition = new NewPartition();

  sourceEditor = new ObjectEditor();
  newRule = new NewRule();

  rule(i = 0) {
    return new Rule(i);
  }

  partitionGroup(values) {
    return new PartitionGroup(values);
  }

  rulesCount = Rule.ruleContainer.count;
}
