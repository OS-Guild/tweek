import React from 'react';
import { compose, withState, lifecycle } from 'recompose';
import styled from 'react-emotion';
import { configureOidc, signinRequest, azureSignin } from '../../../services/auth-service';
import { tweekManagementClient } from '../../../utils/tweekClients';
import logoSrc from '../../../components/resources/logo.svg';
import BasicAuthLoginButton from './BasicAuthLoginButton';

const MainComponent = styled('div')`
  display: flex;
  flex-direction: row;
  flex: 1;

  position: absolute;
  top: 0px;
  bottom: 0px;
  left: 0px;
  right: 0px;
`;

const LeftPane = styled('div')`
  flex: 35;
  background-color: #00aeef;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RightPane = styled('div')`
  flex: 65;
  background-color: #eee;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WelcomeMessageSpan = styled('span')`
  font-family: Roboto;
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;
  margin-top: 250px;
  margin-bottom: 90px;
`;

const TweekLogo = styled('img')`
  width: 65%;
`;

const LoginMessageSpan = styled('span')`
  ֿ: Roboto;
  font-size: 20px;
  font-weight: bold;
  color: #696969;
  margin-bottom: 20px;
  margin-top: 250px;
`;

const LoginButton = styled('div')`
  padding-top: 14px;
  padding-bottom: 17px;
  margin: 15px;
  width: 40%;
  background-color: #00aeef;
  border-radius: 25px;
  cursor: pointer;

  color: #ffffff;
  font-family: Roboto;
  font-size: 14.4px;
  font-weight: bold;

  text-align: center;
  text-decoration: none;
`;

const LoginPage = ({ authProviders, location: { state = {} } }) => (
  <MainComponent>
    <LeftPane>
      <WelcomeMessageSpan>Welcome to:</WelcomeMessageSpan>
      <TweekLogo data-comp="tweek-logo" src={logoSrc} />
    </LeftPane>
    <RightPane>
      <LoginMessageSpan>Log into Tweek using:</LoginMessageSpan>
      {authProviders.map(ap => (
        <LoginButton key={ap.id} onClick={() => ap.action({ state })} data-comp={ap.id}>
          {ap.name}
        </LoginButton>
      ))}
      <BasicAuthLoginButton state={state} />
    </RightPane>
  </MainComponent>
);

const enhancer = compose(
  withState('authProviders', 'setAuthProviders', []),
  lifecycle({
    async componentWillMount() {
      const res = await tweekManagementClient.getAuthProviders();
      const providers = Object.keys(res).map(key => ({
        id: key,
        name: res[key].name,
        action: (state) => {
          if (res[key].login_info.login_type === 'azure') {
            // need to figure out what to do with the state here.
            const params = res[key].login_info.additional_info;
            return azureSignin(params.resource, params.tenant, res[key].client_id, state);
          }
          if (res[key].login_info.login_type === 'oidc') {
            return signinRequest(
              configureOidc(res[key].authority, res[key].client_id, res[key].login_info.scope),
              state,
            );
          }
        },
      }));
      this.props.setAuthProviders(providers);
    },
  }),
);

export default enhancer(LoginPage);
