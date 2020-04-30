import React, { Component } from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { OT, setNativeEvents, removeNativeEvents } from './OT';
import OTSubscriberView from './views/OTSubscriberView';
import { sanitizeSubscriberEvents, sanitizeProperties } from './helpers/OTSubscriberHelper';
import { getOtrnErrorEventHandler } from './helpers/OTHelper';
import OTContext from './contexts/OTContext';

export default class OTSubscriber extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {};
    this._currentEventHandlers = null;

    this.otrnEventHandler = getOtrnErrorEventHandler(this.props.eventHandlers);

    this.initComponent();
  }

  subscribeToEventHandlers = (eventHandlers) => {
    if (this._currentEventHandlers) {
      removeNativeEvents(this._currentEventHandlers);
      this._currentEventHandlers = null;
    }

    if (!eventHandlers)
      return;

    var subscriberEvents = this._currentEventHandlers = sanitizeSubscriberEvents(eventHandlers);
    setNativeEvents(subscriberEvents);
  }

  unsubscribeFromStream = (stream) => {
    OT.removeSubscriber(stream.streamId, (error) => {
      if (error)
        this.otrnEventHandler(error);
    });
  }

  subscribeToStream = (stream) => {
    OT.subscribeToStream(stream.streamId, sanitizeProperties(this.props.properties), (error) => {
      if (error)
        this.otrnEventHandler(error);
    });
  }

  resubscribe = (prevProps = {}) => {
    if (prevProps.eventHandlers !== this.props.eventHandlers)
      this.subscribeToEventHandlers(this.props.eventHandlers);

    if (prevProps.stream !== this.props.stream) {
      if (prevProps.stream)
        this.unsubscribeFromStream(prevProps.stream);

      if (this.props.stream)
        this.subscribeToStream(this.props.stream);
    }

    if (prevProps.properties !== this.props.properties) {
      if (!this.props.properties)
        return;

      var { subscribeToAudio, subscribeToVideo } = this.props.properties,
          stream = this.props.stream,
          streamId = (stream) ? stream.streamId : null;

      if (!streamId)
        return;

      OT.subscribeToAudio(streamId, subscribeToAudio);
      OT.subscribeToVideo(streamId, subscribeToVideo);
    }
  }

  initComponent = () => {
    this.resubscribe();
  }

  componentWillUnmount = () => {
    if (this._currentEventHandlers)
      removeNativeEvents(this._currentEventHandlers);

    if (this.props.stream)
      this.unsubscribeFromStream(this.props.stream);
  }

  componentDidUpdate = (prevProps) => {
    this.resubscribe(prevProps);
  }

  render = () => {
    var stream    = this.props.stream,
        streamId  = (stream) ? stream.streamId : null;

    if (!streamId)
      return null;

    return (<OTSubscriberView className={this.props.className} style={this.props.style} streamId={streamId} />);
  }
}

const viewPropTypes = View.propTypes;
OTSubscriber.propTypes = {
  ...viewPropTypes,
  children: PropTypes.func,
  properties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  eventHandlers: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  stream: PropTypes.object, // eslint-disable-line react/forbid-prop-types,
  session: PropTypes.object // eslint-disable-line react/forbid-prop-types
};

OTSubscriber.defaultProps = {
  properties: {},
  eventHandlers: {}
};

OTSubscriber.contextType = OTContext;
