import React from 'react';
import R from 'ramda';
import { Accordion, AccordionItem } from 'react-sanfona';
import { mapProps } from 'recompose';
import RulesList from '../RulesList/RulesList';
import PropertyValue from '../Matcher/Properties/PropertyValue';
import * as ContextService from '../../../../services/context-service';
import { equal } from '../../../../services/operators-provider';
import { InputValue } from '../RuleValue/RuleValue';
import './PartitionsList.css';
import '../../../../styles/core/core.css';

const extractPartitionToObject = (mutate, partitions) => {
  if (partitions.length === 0) {
    return [{ mutate }];
  }

  return R.flatten(
    Object.keys(mutate.getValue()).map((partitionValue) => {
      const innerResults = extractPartitionToObject(mutate.in(partitionValue), partitions.slice(1));
      return innerResults.map(innerResult => ({
        [partitions[0]]: partitionValue,
        ...innerResult,
      }));
    }),
  );
};

const NewPartitionPropertyValue = mapProps(({ value, onUpdate, name, identity, id: property }) => ({
  value,
  onUpdate,
  placeholder: `${name} (${identity})`,
  propertyTypeDetails: ContextService.getPropertyTypeDetails(property),
  selectedOperator: equal.operatorValue,
}))(PropertyValue);

class AddPartition extends React.Component {
  state = { partition: {}, defaultValue: '' };

  replaceState(state) {
    this.state = state;
    this.setState(state);
  }

  addPartition() {
    const { handlePartitionAddition } = this.props;
    if (handlePartitionAddition) handlePartitionAddition(this.state);
    this.replaceState({ partition: {}, defaultValue: '' });
  }

  render() {
    const { partitions, valueType } = this.props;
    const allProperties = ContextService.getProperties();
    const indexedPartitions = partitions.map(
      partition =>
        allProperties.find(property => property.id === partition) || {
          id: partition,
          name: partition,
        },
    );
    return (
      <div className={'new-partition-container'}>
        {indexedPartitions.map(partition => (
          <div className={'new-partition-item-container'} key={partition.id}>
            <NewPartitionPropertyValue
              {...partition}
              value={this.state.partition[partition.id] || ''}
              onUpdate={value =>
                this.setState({ partition: { ...this.state.partition, [partition.id]: value } })}
            />
          </div>
        ))}
        <InputValue
          value={this.state.defaultValue}
          valueType={valueType}
          onChange={defaultValue => this.setState({ defaultValue })}
          placeholder="Partition's default value"
        />
        <button className={'add-partition-button'} onClick={this.addPartition.bind(this)} />
      </div>
    );
  }
}

const deletePartitionGroupAlert = {
  title: 'Are you sure?',
  message: 'This operation will delete the partition group along with all the rules inside it.\nDo you want to continue?',
};

export default class PartitionsList extends React.Component {
  state = {
    activeItems: [],
  };

  render() {
    const { partitions, mutate, valueType, alerter } = this.props;

    const rulesByPartitions = mutate.getValue();
    if (!rulesByPartitions) return <div />;

    let partitionsData = extractPartitionToObject(mutate, partitions);
    partitionsData = partitionsData.map((x, i) => ({
      ...x,
      valueType,
      id: i,
      partitionsValues: partitions.map(partitionName => x[partitionName]),
    }));

    const hasDefaultValue = Object.keys(rulesByPartitions).includes('*');

    return (
      <div className={'partitions-list-container'}>

        {!hasDefaultValue
          ? <button
            className={'add-default-partition-button'}
            onClick={() => this.addPartition({})}
          >
              Add default partition
            </button>
          : null}

        <AddPartition
          partitions={partitions}
          handlePartitionAddition={this.addPartition.bind(this)}
          valueType={valueType}
        />

        <Accordion
          className={'partitions-accordion-container'}
          allowMultiple
          activeItems={this.state.activeItems || []}
          onChange={({ activeItems }) => this.setState({ activeItems })}
        >
          {partitionsData.map((partitionData) => {
            const rules = partitionData.mutate.getValue();
            const isOnlyDefault =
              rules.length === 1 &&
              Object.keys(rules[0].Matcher).length === 0 &&
              rules[0].Type === 'SingleVariant';

            const partitionGroupName = partitionData.partitionsValues
              .map(x => (x === '*' ? 'Default' : x))
              .join(', ');
            return (
              <AccordionItem
                title={
                  <div className={'partitions-accordion-container-item-title'}>
                    <div className={'expander-icon'}></div>
                    <h3>{partitionGroupName}</h3>
                    <div className={'partitions-accordion-container-item-title-details'}>
                      {isOnlyDefault ? `value: ${rules[0].Value}` : `rules: ${rules.length}`}
                    </div>
                    <div className={'partitions-accordion-container-item-title-actions'}>
                      <button
                        className={'gray-circle-button'}
                        onClick={(e) => {
                          this.deletePartition(partitionData.partitionsValues);
                          e.stopPropagation();
                        }}
                      >
                        x
                      </button>
                    </div>
                  </div>
                }
                key={partitionGroupName}
                className={'partitions-accordion-container-item'}
                titleClassName={'partitions-accordion-container-item-title'}
                expandedClassName={'partitions-accordion-container-item-expanded'}
              >
                <RulesList {...{ valueType, alerter }} mutate={partitionData.mutate} />
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  }

  addPartition({ partition: newPartition, defaultValue }) {
    console.log({ newPartition, defaultValue });
    const { mutate, partitions } = this.props;
    const partitionDefaultValue = defaultValue === ''
      ? []
      : [{ Type: 'SingleVariant', Matcher: {}, Value: defaultValue }];
    mutate.apply((m) => {
      partitions.forEach((partition, i) => {
        const partitionValue = newPartition[partition] || '*';
        if (!m.getValue()[partitionValue]) {
          m.insert(partitionValue, i === partitions.length - 1 ? partitionDefaultValue : {});
        }
        m = m.in(partitionValue);
      });

      return m;
    });
  }

  async deletePartition(partitionGroup) {
    const { mutate, alerter } = this.props;

    if ((await alerter.showConfirm(deletePartitionGroupAlert)).result) {
      mutate.apply((partitionMutate) => {
        for (const partition of partitionGroup) {
          partitionMutate = partitionMutate.in(partition);
        }

        let i = partitionGroup.length;
        do {
          partitionMutate.delete();
          partitionMutate = partitionMutate.up();
        } while (--i && Object.keys(partitionMutate.getValue()).length === 0);

        return partitionMutate;
      });
    }
  }
}
