import React from 'react';
import style from './styles.css';
import { WithContext as ReactTags } from 'react-tag-input';
import R from 'ramda';
import ComboBox from '../../../../../../components/common/ComboBox/ComboBox';

const TagsPropertyValue = ({ onUpdate, value }) => {
  let indexedTags = value.map(x => ({ id: x, text: x }));

  const handleAddtion = (newValue) => onUpdate([...value, newValue]);
  const handleDelete = (valueIndex) => onUpdate(R.remove(valueIndex, 1, value));

  return (
    <div>
      <label className={style['wrapping-bracet']}>[</label><ReactTags tags={ indexedTags }
        handleAddition={handleAddtion}
        handleDelete={handleDelete}
        placeholder="Add value"
        allowDeleteFromEmptyInput
        classNames={{
          tags: style['tags-container'],
          tagInput: style['tag-input'],
          tag: style['tag'],
          remove: style['tag-delete-button'],
          suggestions: style['tags-suggestion'],
        } }
      /><label className={style['wrapping-bracet']}>]</label>
    </div>
  );
};

const InputPropertyValue = ({ onUpdate, value }) => (
  <input className={style['value-input']}
    type="text"
    onChange={(e) => onUpdate(e.target.value) }
    value={value}
    placeholder="Value"
  />
);

function PropertyValueComponent({ onUpdate, meta, value, op }) {
  if (meta.allowedValues)
    return (
      <ComboBox
        options={ meta.allowedValues }
        placeholder="Value"
        wrapperThemeClass={style['property-value-combo-box']}
        onChange={(selectedValue) => {
          onUpdate(selectedValue.value);
        } }
        selected={[R.find(x => x.value === value)(meta.allowedValues)]}
      />
    );

  if (op === '$in')
    return (
      <TagsPropertyValue onUpdate={onUpdate}
        value={value}
      />
    );

  return (
    <InputPropertyValue onUpdate={onUpdate}
      value={value}
    />
  );
}

export default (props) => <div className={style['property-value-wrapper']}>
  <PropertyValueComponent {...props} />
</div>;
