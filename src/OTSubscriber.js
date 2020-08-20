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
<<<<<<< HEAD

  subscribeToEventHandlers = (eventHandlers) => {
    if (this._currentEventHandlers) {
      removeNativeEvents(this._currentEventHandlers);
      this._currentEventHandlers = null;
=======
  initComponent = () => {
    const { eventHandlers } = this.props;
    const { sessionId } = this.context;
    if (sessionId) {
      this.streamCreated = nativeEvents.addListener(`${sessionId}:${this.componentEvents.streamCreated}`,
        stream => this.streamCreatedHandler(stream));
      this.streamDestroyed = nativeEvents.addListener(`${sessionId}:${this.componentEvents.streamDestroyed}`,
        stream => this.streamDestroyedHandler(stream));
      const subscriberEvents = sanitizeSubscriberEvents(eventHandlers);
      OT.setJSComponentEvents(this.componentEventsArray);
      setNativeEvents(subscriberEvents);
    }
  }
  componentDidUpdate() {
    const { streamProperties } = this.props;
    if (!isEqual(this.state.streamProperties, streamProperties)) {
      each(streamProperties, (individualStreamProperties, streamId) => {
        const { subscribeToAudio, subscribeToVideo } = individualStreamProperties;
        OT.subscribeToAudio(streamId, subscribeToAudio);
        OT.subscribeToVideo(streamId, subscribeToVideo);
      });
      this.setState({ streamProperties });
    }
  }
  componentWillUnmount() {
    this.streamCreated.remove();
    this.streamDestroyed.remove();
    OT.removeJSComponentEvents(this.componentEventsArray);
    const events = sanitizeSubscriberEvents(this.props.eventHandlers);
    removeNativeEvents(events);
  }
  streamCreatedHandler = (stream) => {
    const { subscribeToSelf } = this.state;
    const { streamProperties, properties } = this.props;
    const { sessionId, sessionInfo } = this.context;
    const subscriberProperties = isNull(streamProperties[stream.streamId]) ?
                                  sanitizeProperties(properties) : sanitizeProperties(streamProperties[stream.streamId]);
    // Subscribe to streams. If subscribeToSelf is true, subscribe also to his own stream
    const sessionInfoConnectionId = sessionInfo && sessionInfo.connection ? sessionInfo.connection.connectionId : null;
    if (subscribeToSelf || (sessionInfoConnectionId !== stream.connectionId)){
      OT.subscribeToStream(stream.streamId, sessionId, subscriberProperties, (error) => {
        if (error) {
          this.otrnEventHandler(error);
        } else {
          this.setState({
            streams: [...this.state.streams, stream.streamId],
          });
        }
      });
>>>>>>> 1baf9895876974c14892ceff525c2fe4d2920ef5
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
