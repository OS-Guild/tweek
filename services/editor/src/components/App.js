import React from 'react';
import { Link } from 'react-router-dom';
import { Route } from 'react-router';
import Title from 'react-title-component';
import { Observable } from 'rxjs/Rx';
import { setObservableConfig } from 'recompose';
import classNames from 'classnames';
import * as TypesService from '../services/types-service';
import Alerts from './alerts/Alerts';
import Notifications from './alerts/Notifications';
import { withTypesService } from './common/Input/TypedInput';
import logoSrc from './resources/logo.svg';
import './App.css';

require('../styles/core/fonts/fonts.css');

setObservableConfig({
  fromESObservable: Observable.from,
});

const ListItemLink = ({ to, ...rest }) =>
  <Route
    path={to}
    children={({ match }) =>
      <li>
        <Link
          className={classNames('menu-item', {
            'selected-location-path': match,
          })}
          to={to}
          {...rest}
        />
      </li>}
  />;

export default withTypesService(TypesService)(({ children }) =>
  <div className={'app'}>
    <div className={'header'}>
      <Title render="Tweek" />
      <Link to="/" replace><img className={'logo'} src={logoSrc} /></Link>
      <ul className={'menu'}>
        <ListItemLink to="/keys">
          <img src={require('./resources/keys.svg')} />
          <span>Keys</span>
        </ListItemLink>
        <ListItemLink to="/context">
          <img src={require('./resources/keys.svg')} />
          <span>Context</span>
        </ListItemLink>
        <ListItemLink to="/settings">
          <img src={require('./resources/settings.svg')} />
          <span>Settings</span>
        </ListItemLink>
      </ul>
    </div>
    <div className={'page'}>
      {children}
      <Alerts />
      <Notifications />
    </div>
  </div>,
);
