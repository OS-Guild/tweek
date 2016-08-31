import { createStore, applyMiddleware, compose } from 'redux';
import { routerMiddleware } from 'react-router-redux';
import { browserHistory} from 'react-router';
import promiseMiddleware from 'redux-promise';
import thunk from 'redux-thunk';
import rootReducer from './rootReducer';

export default function configureStore(initialState) {
  return createStore(
    rootReducer,
    initialState,
    compose(
        applyMiddleware(thunk,promiseMiddleware),
        applyMiddleware(routerMiddleware(browserHistory)),
        typeof window === 'object' && typeof window.devToolsExtension !== 'undefined' ? window.devToolsExtension() : f => f
    )
  )
}