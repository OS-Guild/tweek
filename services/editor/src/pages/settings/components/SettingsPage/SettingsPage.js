import React from 'react';
import { connect } from 'react-redux';
import './SettingsPage.css';
import { compose, lifecycle, withState, withHandlers } from 'recompose';
import Input from '../../../../components/common/Input/Input';
import { Link } from 'react-router-dom';
import * as actions from '../../../../store/ducks/schema';

const LinkMenuItem = ({ path, name }) =>
  <li key={path}>
    <Link to={`/settings/${path}`}>
      {name}
    </Link>
  </li>;

const AddIdentity = compose(
  connect(() => {}, actions),
  withState('state', 'setState', { isEditing: false, value: '' }),
  withHandlers({
    toggleEdit: ({ setState }) => () => setState(state => ({ ...state, isEditing: true })),
    change: ({ setState }) => value =>
      setState(state => ({ ...state, value: value.toLowerCase() })),
    reset: ({ setState }) => () => setState(state => ({ ...state, value: '', isEditing: false })),
  }),
)(({ state: { isEditing, value }, toggleEdit, change, reset, addNewIdentity }) =>
  <div data-comp="AddNewIdentity">
    {isEditing
      ? <Input
          value={value}
          onChange={change}
          placeholder="Identity name"
          onKeyUp={e => e.which === 27 && reset()}
          onEnterKeyPress={() => {
            reset();
            addNewIdentity(value);
          }}
        />
      : <button onClick={toggleEdit}>Add New Identity</button>}
  </div>,
);

export default compose(
  connect(state => ({}), { ...actions }),
  lifecycle({
    componentWillMount() {
      this.props.loadSchema();
    },
  }),
  connect(state => ({ schema: state.schema })),
)((props) => {
  const { schema, children } = props;
  return (
    <div className="schema-page-container">
      <ul className="side-menu" key="SideMenu">
        <li>
          <div data-comp="group">Identities</div>
          <ul>
            {Object.entries(schema)
              .filter(([_, { remote }]) => remote !== null)
              .map(([type, _]) => ({ path: `identities/${type}`, name: type }))
              .map(LinkMenuItem)}
            <li><AddIdentity /></li>
          </ul>
        </li>
      </ul>
      <div style={{ display: 'flex', flexGrow: 1 }} key="Page">
        {children}
      </div>
    </div>
  );
});
