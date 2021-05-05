import styled from '@emotion/styled';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router';
import { Revision as RevisionProps } from 'tweek-client';
import { StoreState } from '../../../../../../store/ducks/types';

const RevisionHistorySelect = styled.select`
  align-self: flex-start;
`;

const formatDate = (date: number) =>
  `${moment(new Date(date)).calendar(null, { sameElse: 'DD/MM/YYYY [at] HH:mm' })}`;

const Revision = ({ sha, date, author }: RevisionProps) => (
  <option value={sha}>{`${formatDate(date)} : ${author}`}</option>
);

const EmptyRevisionHistory = styled.div`
  color: gray;
`;

export type RevisionHistoryProps = {
  revisionHistory: RevisionProps[];
  selectedKey: string;
  revision?: string;
};

const RevisionHistory = ({ revisionHistory, selectedKey, revision }: RevisionHistoryProps) => {
  const history = useHistory();

  const goToRevision = (sha: string) => {
    const params = new URLSearchParams();
    if (sha !== revisionHistory[0].sha) {
      params.set('revision', sha);
    }

    history.push({
      pathname: `/keys/${selectedKey}`,
      search: params.toString(),
    });
  };

  return revisionHistory.length === 0 ? (
    <EmptyRevisionHistory data-comp="revision-history" data-no-changes>
      No recent changes found
    </EmptyRevisionHistory>
  ) : (
    <RevisionHistorySelect
      data-comp="revision-history"
      value={revision || revisionHistory[0].sha}
      onChange={(e) => goToRevision(e.target.value)}
    >
      {revisionHistory.map((item) => (
        <Revision key={item.sha} {...item} />
      ))}
    </RevisionHistorySelect>
  );
};

const mapStateToProps = (state: StoreState) => ({ selectedKey: state.selectedKey!.key });

export default connect(mapStateToProps)(RevisionHistory);
