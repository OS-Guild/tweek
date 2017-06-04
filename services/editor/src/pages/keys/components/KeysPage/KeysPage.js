import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import * as actions from '../../../../store/ducks/keys';
import KeysList from '../KeysList/KeysList';
import withLoading from '../../../../hoc/with-loading';
import { refreshTypes } from '../../../../services/types-service';
import { refreshSchema } from '../../../../services/context-service';
import { refreshIndex } from '../../../../services/search-service';
import './KeysPage.css';

export default compose(
  connect(state => state, { ...actions }),
  withLoading(() => null, Promise.all([refreshTypes(), refreshSchema(), refreshIndex()])),
)(
  class KeysPage extends Component {
    componentDidMount() {
      if (!this.props.keys || this.props.keys.length === 0) {
        this.props.getKeys();
      }
    }

    render() {
      const { keys, addKey, children } = this.props;
      return (
        <div className={'keys-page-container'}>
          <div key="KeysList" className={'keys-list'}>
            <div className={'keys-list-wrapper'}>
              <KeysList keys={keys} />
            </div>
            <div className={'add-button-wrapper'}>
              <button className={'add-key-button'} onClick={() => addKey()}>Add key</button>
            </div>
          </div>
          <div key="Page" className={'key-page'}>
            {children}
          </div>
        </div>
      );
    }
  },
);
