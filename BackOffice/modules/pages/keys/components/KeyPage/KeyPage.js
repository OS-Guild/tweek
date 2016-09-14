import React from 'react';
import ReactDOM from 'react-dom';
import { Component } from 'react';
import { connect } from 'react-redux';
import KeyRulesEditor from '../KeyRulesEditor/KeyRulesEditor';
import * as keysActions from '../../ducks/selectedKey';
import { deleteKey } from '../../ducks/keys';
import style from './KeyPage.css';
import { diff } from 'deep-diff';
import R from 'ramda';
import KeyTags from './KeyTags/KeyTags';
import EditableText from './EditableText/EditableText';
import EditableTextArea from './EditableTextArea/EditableTextArea';
import KeyModificationDetails from './KeyModificationDetails/KeyModificationDetails';
import { compose } from 'recompose';
import ComboBox from '../../../../components/common/ComboBox/ComboBox';

const getKeyPrefix = (path) => R.slice(0, -1, path.split('/')).join('/');
const getSugesstions = R.pipe(R.map(getKeyPrefix), R.uniq(), R.filter(x => x !== ''));

function getKeyNameSuggestions(keysList) {
  return getSugesstions(keysList).sort();
}

const NewKeyInput = compose(
  connect(state => ({ keysList: state.keys }))
)(({ keysList, onKeyNameChanged }) => {
  const suggestions = getKeyNameSuggestions(keysList).map(x => ({ label: x, value: x }));

  return (
    <div className={style['auto-suggest-wrapper']}>
    <ComboBox
      options={ suggestions }
      placeholder="Enter key full path"
      onInputChange={text => onKeyNameChanged(text) }
      showValueInOptions 
    />
    </div>
  );
});

export default connect((state, { params, route }) => (
  { selectedKey: state.selectedKey, configKey: route.isInAddMode ? '_blank' : params.splat, isInAddMode: route.isInAddMode }),
  { ...keysActions, deleteKey })(
  class KeyPage extends Component {

    static propTypes = {
      dispatch: React.PropTypes.func,
      configKey: React.PropTypes.string,
      selectedKey: React.PropTypes.object,
    }

    _onTagsChanged = (newTags) => {
      const newMeta = { ...this.props.selectedKey.local.meta, tags: newTags };
      this._onSelectedKeyMetaChanged(newMeta);
    }

    constructor(props) {
  super(props);
}

    componentDidMount() {
  const { openKey, configKey, selectedKey } = this.props;
  if (!configKey) return;
  if (selectedKey && selectedKey.key === configKey) return;
  openKey(configKey);
}

    componentWillReceiveProps({ configKey }) {
  const { openKey, selectedKey } = this.props;
  if (configKey !== this.props.configKey || !selectedKey) {
    openKey(configKey);
  }
}

    _onKeyNameChanged(newKeyName) {
  this.props.updateKeyName(newKeyName);
}

    _onDisplayNameChanged(newDisplayName) {
  const newMeta = { ...this.props.selectedKey.local.meta, displayName: newDisplayName };
  this._onSelectedKeyMetaChanged(newMeta);
}

    _onDescriptionChanged(newDescription) {
  const newMeta = { ...this.props.selectedKey.local.meta, description: newDescription };
  this._onSelectedKeyMetaChanged(newMeta);
}

    _onSelectedKeyMetaChanged(newMeta) {
  this.props.updateKeyMetaDef(newMeta);
}


    renderKeyActionButtons(isInAddMode) {
  const { local, remote, isSaving, isDeleting } = this.props.selectedKey;
  const changes = diff(local, remote);
  const hasChanges = (changes || []).length > 0;
  return (
    <div className={style['key-action-buttons-wrapper']}>
      {!isInAddMode ?
        <button disabled={isSaving}
          className={style['delete-key-button']}
          onClick={() => {
            if (confirm('Are you sure?')) {
              this.props.deleteKey(this.props.configKey);
            }
          } }
        >
          Delete key
        </button> : null}
      <button disabled={!hasChanges || isSaving }
        data-state-has-changes={hasChanges}
        data-state-is-saving={isSaving}
        className={style['save-changes-button']}
        onClick={() => this.props.saveKey(this.props.configKey) }
      >
        {isSaving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

    render() {
  const { configKey, selectedKey, isInAddMode } = this.props;
  if (!selectedKey) return <div className={style['loading-message']}>loading</div>;
  const { meta, keyDef, key = '' } = selectedKey.local;

  return (
    <div className={style['key-viewer-container']}>
      {this.renderKeyActionButtons(isInAddMode) }

      <div className={style['key-header']}>

        {keyDef.modificationData ?
          <KeyModificationDetails className={style['modification-data']} {...keyDef.modificationData} />
          : null
        }

        <div className={style['display-name-wrapper']}>
          {isInAddMode ?
            <NewKeyInput onKeyNameChanged={(name) => this._onKeyNameChanged(name) }/>
            :
            <EditableText onTextChanged={(text) => this:: this._onDisplayNameChanged(text) }
              placeHolder="Enter key display name"
              maxLength={80}
              value={meta.displayName}
              classNames={{
            container: style['display-name-container'],
            input: style['display-name-input'],
            text: style['display-name-text'],
            form: style['display-name-form'],
          }}
            />
          }
        </div>

        {!isInAddMode ?
          <div className={style['key-full-path']}>
            <label>Full path: </label>
            <label className={style['actual-path']}>{configKey}</label>
          </div>
          : null}

        <div className={style['key-description-and-tags-wrapper']}>

          <div className={style['key-description-wrapper']}>
            <EditableTextArea value={meta.description}
              onTextChanged={(text) => this._onDescriptionChanged(text) }
              placeHolder="Write key description"
              title="Click to edit description"
              classNames={{
                input: style['description-input'],
              }}
              maxLength={400}
            />
          </div>

          <div className={style['tags-wrapper']}>

            <KeyTags onTagsChanged={this._onTagsChanged}
              tags={ meta.tags }
            />

          </div>

        </div>

      </div>

      <KeyRulesEditor keyDef={keyDef}
        sourceTree={JSON.parse(keyDef.source) }
        onMutation={x => this.props.updateKeyDef({ source: JSON.stringify(x, null, 4) }) }
        className={style['key-rules-editor']}
      />

    </div >
  );
} });
