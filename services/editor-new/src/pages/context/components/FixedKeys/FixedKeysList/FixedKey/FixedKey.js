import React from 'react';
import PropTypes from 'prop-types';
import { compose, mapPropsStream, pure } from 'recompose';
import Rx from 'rxjs';
import classNames from 'classnames';
import * as SearchService from '../../../../../../services/search-service';
import * as TypesService from '../../../../../../services/types-service';
import TypedInput from '../../../../../../components/common/Input/TypedInput';
import AutoSuggest from '../../../../../../components/common/ComboBox/AutoSuggest';
import './FixedKey.css';

const configShape = {
  key: PropTypes.string,
  value: PropTypes.any,
};

const RemovedKey = ({ config: { key, value } }) => (
  <div className={'removed-key-container'}>
    <div className={'removed-key'}>{key}</div>
    <div className={'removed-value'}>{value}</div>
  </div>
);

RemovedKey.propTypes = {
  config: PropTypes.shape(configShape).isRequired,
};

const mapValueTypeToProps = (props$) => {
  const propsStream = props$.map(({ keyPath, ...props }) => props);

  const valueTypeStream = props$
    .map(x => x.keyPath)
    .debounceTime(500)
    .distinctUntilChanged()
    .switchMap(keyPath =>
      Rx.Observable
        .fromPromise(TypesService.getValueTypeDefinition(keyPath))
        .map(x => x.name),
    )
    .map(valueType => ({ disabled: false, valueType }))
    .startWith({ disabled: true, valueType: 'unknown' });

  return propsStream.combineLatest(valueTypeStream, (props, valueType) => ({
    ...props,
    ...valueType,
  }));
};

const OverrideValueInput = compose(mapPropsStream(mapValueTypeToProps), pure)(TypedInput);

const EditableKey = ({ remote, local, onKeyChange, onValueChange }) => (
  <div className={classNames('editable-key-container', { 'new-item': !remote })}>
    <AutoSuggest
      className={'key-input'}
      placeholder="Key"
      value={local.key}
      getSuggestions={SearchService.suggestions}
      onChange={onKeyChange}
      disabled={!!remote}
    />
    <OverrideValueInput
      keyPath={local.key}
      className={classNames('value-input', {
        'has-changes': remote && remote.value !== local.value,
      })}
      placeholder="Value"
      value={local.value}
      onChange={onValueChange}
    />
    {remote && remote.value !== local.value
      ? <div className={'initial-value'}>{remote.value}</div>
      : null}
  </div>
);

EditableKey.propTypes = {
  remote: PropTypes.shape(configShape),
  local: PropTypes.shape(configShape).isRequired,
  onKeyChange: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
};

const FixedKey = ({ remote, local, isRemoved, onChange }) => (
  <div className={'fixed-key-container'} data-fixed-key={local.key}>
    <button
      onClick={() => onChange(!isRemoved, local)}
      className={'delete-button'}
      title="Remove key"
    />
    {isRemoved
      ? <RemovedKey config={remote} />
      : <EditableKey
        {...{ remote, local }}
        onKeyChange={key => onChange(isRemoved, { ...local, key })}
        onValueChange={value => onChange(isRemoved, { ...local, value })}
      />}
  </div>
);

FixedKey.propTypes = {
  onChange: PropTypes.func.isRequired,
  remote: PropTypes.shape(configShape),
  local: PropTypes.shape(configShape).isRequired,
  isRemoved: PropTypes.bool.isRequired,
};

export default FixedKey;
