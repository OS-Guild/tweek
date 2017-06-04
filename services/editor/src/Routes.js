import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { ConnectedRouter } from 'react-router-redux';
import App from './components/App';
import KeysPage from './pages/keys/components/KeysPage/KeysPage';
import KeyPage from './pages/keys/components/KeyPage/KeyPage';
import ContextPage from './pages/context/components/ContextPage/ContextPage';
import IdentityDetails from './pages/context/components/IdentityDetails/IdentityDetails';
import NoMatch from './components/NoMatch';
import browserHistory from './store/browserHistory';
import './styles/styles.css';

const SelectKeyMessage = () => <div className={'select-key-message'}>Select key...</div>;

export default props =>
  <ConnectedRouter history={browserHistory}>
    <App>
      <Switch>
        <Route path="/" exact render={() => <Redirect to="/keys" />} />
        <Route
          path="/keys"
          render={({ match: { path } }) =>
            <KeysPage>
              <Switch>
                <Route exact path={path} component={SelectKeyMessage} />
                <Route component={KeyPage} />
              </Switch>
            </KeysPage>}
        />
        <Route
          path="/context"
          render={({ match }) =>
            <ContextPage {...match}>
              <Route path={`${match.path}/:identityName/:identityId`} component={IdentityDetails} />
            </ContextPage>}
        />
        <Route component={NoMatch} />
      </Switch>
    </App>
  </ConnectedRouter>;
