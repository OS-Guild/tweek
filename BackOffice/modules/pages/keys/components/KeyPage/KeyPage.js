import React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import getKey from '../../actions/getKey';
import saveKey from '../../actions/saveKey';
import KeyMetaEditor from '../KeyMetaEditor/KeyMetaEditor';
import KeyRulesEditor from '../KeyRulesEditor/KeyRulesEditor';
import style from './KeyPage.css';

export default connect((state, { params }) => ({ ...state, configKey: params.splat })
)(
  class KeyPage extends Component {

    static propTypes = {
      dispatch: React.PropTypes.func,
      configKey: React.PropTypes.string,
      selectedKey: React.PropTypes.object,
    }

    constructor(props) {
      super(props);
    }

    componentDidMount() {
      const { dispatch, configKey } = this.props;
      if (configKey) {
        dispatch(getKey(configKey));
      }
    }

    componentWillReceiveProps({ configKey }) {
      if (configKey !== this.props.configKey || !this.props.selectedKey) {
        this.props.dispatch(getKey(configKey));
      }
    }

    onSelectedKeyMetaChanged({ type, payload}) {
      // alert(type + payload);
      // return;
      // switch (type) {
      //   case actions.removeTags: {

      //   } break;
      //   case actions.addTags: {

      //   } break;
      //   case actions.changeDescription: {

      //   } break;
      //   case actions.changeDisplayName: {

      //   } break;
      // }
      // alert(changes);
    }

    render() {
      const { dispatch, configKey, selectedKey } = this.props;
      return (
        <div key={configKey}
          className={style['KeyPage']}>
          <h3>{configKey}</h3>
          <div>{selectedKey ?
            <div>

              <KeyMetaEditor meta={selectedKey.meta}
                onMetaChangedCallback={this::this.onSelectedKeyMetaChanged} />

              <button className={style['save-button']}
                onClick={() => dispatch(saveKey(configKey)) }>
                Save changes
              </button>

              <KeyRulesEditor ruleDef={selectedKey.ruleDef}
                sourceTree={JSON.parse(selectedKey.ruleDef.source) }
                onMutation={x => dispatch({ type: 'KEY_RULEDEF_UPDATED', payload: { source: JSON.stringify(x) } }) } />

            </div> :
            <div>loading...</div>
          }</div>
        </div >

      );
    }
  });
