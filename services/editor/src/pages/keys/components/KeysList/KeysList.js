import React from 'react';
import * as R from 'ramda';
import fetch from '../../../../utils/fetch';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Observable } from 'rxjs';
import { componentFromStream, createEventHandler, withState } from 'recompose';
import * as SearchService from '../../../../services/search-service';
import DirectoryTreeView from './DirectoryTreeView';
import CardView from './CardView';
import './KeysList.css';
import { relative } from 'path';

const KeysFilter = withState('filter', 'setFilter', '')(({ onFilterChange, setFilter, filter }) => (
  <div className="search-input-wrapper">
    <div style={{ position: 'relative' }}>
      <input
        data-comp="search-key-input"
        type="text"
        className="search-input"
        placeholder="Search..."
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          onFilterChange(e.target.value);
        }}
      />
      {filter !== '' && (
        <button
          className="clear"
          onClick={(e) => {
            setFilter('');
            onFilterChange('');
          }}
        >
          X
        </button>
      )}
    </div>
  </div>
));

const supportCardView = async () => {
  try {
    const response = await fetch(
      `/api/editor-configuration/experimental/keys_search/enable_cards_view`,
    );
    return await response.json();
  } catch (err) {
    console.warn('failed to retrieve configuration for enable_cards_view', err);
    return false;
  }
};

const KeyItem = ({ name, fullPath, depth, selected }) => (
  <div className="key-link-wrapper" data-comp="key-link">
    <Link
      className={classNames('key-link', { selected })}
      style={{ paddingLeft: (depth + 1) * 14 }}
      to={`/keys/${fullPath}`}
    >
      {name}
    </Link>
  </div>
);

const CardItem = ({ key_path, meta: { name, tags, description }, valueType, selected }) => (
  <div className={classNames('key-card', { selected })} data-comp="key-card">
    <Link title={key_path} className="key-link" to={`/keys/${key_path}`}>
      <div>
        <div className="title">{name}</div>
        <div>{(tags || []).map(x => <span className="tag">{x}</span>)}</div>
      </div>
      <div className="path">{key_path}</div>
      <div className="description">{description}</div>
    </Link>
  </div>
);

const KeysList = connect((state, props) => ({
  selectedKey: state.selectedKey && state.selectedKey.key,
}))(
  componentFromStream((prop$) => {
    const supportMultiResultsView$ = Observable.defer(supportCardView);

    const keyList$ = prop$
      .map(x => x.keys)
      .distinctUntilChanged()
      .switchMap(async (allKeys) => {
        const unarchivedKeys = R.filter(key => !key.meta.archived, allKeys);
        return {
          keys: allKeys,
          visibleKeys: await SearchService.filterInternalKeys(unarchivedKeys),
        };
      });

    const { handler: setFilter, stream: filter$ } = createEventHandler();
    const { handler: setResultsView, stream: resultsView$ } = createEventHandler();

    const filteredKeys$ = filter$
      .map(x => x.trim())
      .distinctUntilChanged()
      .debounceTime(500)
      .startWith('')
      .switchMap(async filter => (filter === '' ? undefined : SearchService.search(filter)));

    return Observable.combineLatest(
      prop$.map(x => x.selectedKey).distinctUntilChanged(),

      filteredKeys$,
      keyList$,
      supportMultiResultsView$,
      resultsView$.startWith('cards'),
    ).map(
      (
        [selectedKey, filteredKeys, { visibleKeys, keys }, supportMultiResultsView, resultsView],
      ) => (
        <div className="keys-list-container">
          <KeysFilter onFilterChange={setFilter} />
          {filteredKeys &&
            supportMultiResultsView && (
              <div class="view-selector">
                <button onClick={() => setResultsView('cards')}>List</button>
                <button onClick={() => setResultsView('tree')}>Tree</button>
              </div>
            )}
          <div class="keys-nav">
            <div class="search-results">
              {filteredKeys && supportMultiResultsView && resultsView === 'cards' ? (
                <CardView
                  itemSelector={x => x && x.key_path}
                  selectedItem={selectedKey}
                  items={filteredKeys.map(x => keys[x]).filter(x => x)}
                  renderItem={CardItem}
                />
              ) : (
                <DirectoryTreeView
                  selectedPath={selectedKey}
                  paths={filteredKeys || Object.keys(visibleKeys)}
                  expandByDefault={!!filteredKeys}
                  renderItem={KeyItem}
                />
              )}
            </div>
          </div>
        </div>
      ),
    );
  }),
);

KeysList.displayName = 'KeysList';

export default KeysList;
