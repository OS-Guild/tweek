/* global document window console */
import React from 'react';
import PropTypes from 'prop-types';
import gtmParts from 'react-google-tag-manager';
import { branch, compose, renderNothing } from 'recompose';
import { withTweekKeys } from '../contexts/Tweek';

class GoogleTagManagerContainer extends React.Component {
  componentDidMount() {
    const { dataLayerName, scriptId } = this.props;
    if (!window[dataLayerName]) {
      const gtmScriptNode = document.getElementById(scriptId);

      // eslint-disable-next-line no-eval
      eval(gtmScriptNode.textContent);
    }
  }

  render() {
    if (!this.props.gtmId) {
       console.warn("gtmId is missing, check @tweek/editor/google_tag_manager/id key") 
    }
    const gtm = gtmParts({
      id: this.props.gtmId,
      dataLayerName: this.props.dataLayerName,
      additionalEvents: this.props.additionalEvents,
      previewVariables: this.props.previewVariables,
    });

    return <div id={this.props.scriptId}>{gtm.scriptAsReact()}</div>;
  }

  static propTypes = {
    gtmId: PropTypes.string.isRequired,
    dataLayerName: PropTypes.string,
    additionalEvents: PropTypes.object,
    previewVariables: PropTypes.string,
    scriptId: PropTypes.string,
  };

  static defaultProps = {
    dataLayerName: 'dataLayer',
    additionalEvents: {},
    previewVariables: false,
    scriptId: 'react-google-tag-manager-gtm',
  };
}

const enhance = compose(
  withTweekKeys(
    {
      isEnabled: '@tweek/editor/google_tag_manager/enabled',
      gtmId: '@tweek/editor/google_tag_manager/id',
    },
    {
      defaultValues: { isEnabled: false, gtmId: null },
    },
  ),
  branch(({ isEnabled }) => !isEnabled, renderNothing),
);

export default enhance(GoogleTagManagerContainer);
