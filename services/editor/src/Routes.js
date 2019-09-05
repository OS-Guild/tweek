import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';
import App from './components/App';
import PrivateRoute from './PrivateRoute';
import LoginPage from './pages/login/components/LoginPage';
import LoggedInPage from './pages/login/components/LoggedInPage';
import AzureLoggedInPage from './pages/login/components/AzureLoggedInPage';
import BasicAuthLoggedInPage from './pages/login/components/BasicAuthLoggedInPage';
import SilentLoggedInPage from './pages/login/components/SilentLoggedInPage';
import KeysPage from './pages/keys/components/KeysPage/KeysPage';
import KeyPage from './pages/keys/components/KeyPage/KeyPage';
import ContextPage from './pages/context/components/ContextPage/ContextPage';
import IdentityDetails from './pages/context/components/IdentityDetails/IdentityDetails';
import SettingsPage from './pages/settings/components/SettingsPage/SettingsPage';
import IdentityPage from './pages/settings/components/IdentityPage/IdentityPage';
import NoMatch from './components/NoMatch';
import browserHistory from './store/browserHistory';
import './styles/styles.css';
import { signOut } from './services/auth-service';
import PoliciesPage from './pages/settings/components/PoliciesPage/PoliciesPage';
import HooksPage from './pages/settings/components/HooksPage/HooksPage';
import EditHookPage from './pages/settings/components/HooksPage/EditHookPage';

const SelectKeyMessage = () => <div className={'select-key-message'}>Select key...</div>;

const renderKeyRoutes = ({ match: { path } }) => (
  <KeysPage>
    <Switch>
      <PrivateRoute exact path={path} component={SelectKeyMessage} />
      <PrivateRoute component={KeyPage} />
    </Switch>
  </KeysPage>
);

const renderContextRoutes = ({ match }) => (
  <ContextPage {...match}>
    <PrivateRoute path={`${match.path}/:identityType/:identityId`} component={IdentityDetails} />
  </ContextPage>
);

const renderSettingsRoutes = ({ match }) => (
  <SettingsPage {...match}>
    <PrivateRoute path={`${match.path}/identities/:identityType`} component={IdentityPage} />
    <PrivateRoute path={`${match.path}/policies`} component={PoliciesPage} />
    <PrivateRoute exact path={`${match.path}/hooks`} component={HooksPage} />
    <PrivateRoute path={`${match.path}/hooks/edit`} component={EditHookPage} />
  </SettingsPage>
);

const renderAppRoutes = () => (
  <App>
    <Switch>
      <Route path="/" exact render={() => <Redirect to="/keys" />} />
      <PrivateRoute path="/keys" render={renderKeyRoutes} />
      <PrivateRoute path="/context" render={renderContextRoutes} />
      <PrivateRoute path="/settings" render={renderSettingsRoutes} />
      <Route
        path="/logout"
        exact
        render={() => {
          signOut();
          return <Redirect to="/login" />;
        }}
      />
    </Switch>
  </App>
);

export default () => (
  <ConnectedRouter history={browserHistory}>
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/auth-result/oidc" component={LoggedInPage} />
      <Route path="/auth-result/azure" component={AzureLoggedInPage} />
      <Route path="/auth-result/basic" component={BasicAuthLoggedInPage} />
      <Route path="/auth-result/silent" component={SilentLoggedInPage} />
      <PrivateRoute path="/" render={renderAppRoutes} />
      <Route component={NoMatch} />
    </Switch>
  </ConnectedRouter>
);
