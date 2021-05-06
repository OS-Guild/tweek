import React, { ReactElement, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
// @ts-ignore
import { VelocityTransitionGroup } from 'velocity-react';
import { addKey } from '../../../../../store/ducks/selectedKey';
import { KeyActions, StoreState } from '../../../../../store/ducks/types';
import hasUnsavedChanges from '../../utils/hasUnsavedChanges';
import closedFolderIconSrc from '../resources/Folder-icon-closed.svg';
import openedFolderIconSrc from '../resources/Folder-icon-opened.svg';

type Actions = Pick<KeyActions, 'addKey'>;

const enhance = connect(null, { addKey });

export type TreeDirectoryProps = Actions & {
  fullPath: string;
  name: string;
  depth: number;
  children: ReactElement[];
  descendantsCount: number;
  selected: boolean;
  expandByDefault: boolean;
};

const TreeDirectory = ({
  fullPath,
  name,
  depth,
  children,
  descendantsCount,
  selected,
  expandByDefault,
  addKey,
}: TreeDirectoryProps) => {
  const [isCollapsed, setIsCollapsed] = useState(!selected && !expandByDefault);

  useEffect(() => {
    if (selected) {
      setIsCollapsed(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setIsCollapsed(!expandByDefault);
    }
  }, [expandByDefault]); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="key-folder">
      <div
        style={{ paddingLeft: (depth + 1) * 10 }}
        className="key-folder-name"
        onClick={() => setIsCollapsed((c) => !c)}
        data-folder-name={fullPath}
        data-is-collapsed={isCollapsed}
      >
        <img
          className="key-folder-icon"
          src={isCollapsed ? closedFolderIconSrc : openedFolderIconSrc}
          alt={''}
        />
        {name}
        <label className="number-of-folder-keys">{descendantsCount}</label>
        <button
          data-comp="add"
          className="add-key"
          data-tip={'Add key in folder'}
          data-for={fullPath}
          data-delay-hide={100}
          data-delay-show={500}
          data-effect="solid"
          data-place="top"
          onClick={(event) => {
            event.stopPropagation();
            addKey(hasUnsavedChanges, `${fullPath}/`);
          }}
        />
        <ReactTooltip id={fullPath} />
      </div>

      <VelocityTransitionGroup enter={{ animation: 'slideDown' }} leave={{ animation: 'slideUp' }}>
        {isCollapsed ? undefined : (
          <ul className="folder-items">
            {children.map((child, i) => (
              <li className="sub-tree" key={i}>
                {child}
              </li>
            ))}
          </ul>
        )}
      </VelocityTransitionGroup>
    </div>
  );
};

export default enhance(TreeDirectory);
