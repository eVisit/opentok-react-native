import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Platform } from 'react-native';
import { isNull } from 'underscore';
import { checkAndroidPermissions, OT, removeNativeEvents, nativeEvents, setNativeEvents } from './OT';
import { sanitizeProperties, sanitizePublisherEvents } from './helpers/OTPublisherHelper';
import OTPublisherView from './views/OTPublisherView';
import { getOtrnErrorEventHandler } from './helpers/OTHelper';
import { isConnected } from './helpers/OTSessionHelper';
import OTContext from './contexts/OTContext';

const uuid = require('uuid/v4');

class OTPublisher extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      initError: null,
      publisher: null,
      publisherId: uuid(),
    };

    this._currentEventHandlers = null;

    this.initComponent();
  }

  getSessionID = () => {
    return (this.props.session) ? this.props.session.sessionId : this.context.sessionId;
  }

  subscribeToEventHandlers = (eventHandlers) => {
    if (this._currentEventHandlers) {
      removeNativeEvents(this._currentEventHandlers);
      this._currentEventHandlers = null;
    }

    if (!eventHandlers)
      return;

    var subscriberEvents = this._currentEventHandlers = sanitizePublisherEvents(this.state.publisherId, eventHandlers);
    setNativeEvents(subscriberEvents);
  }

  initComponent = () => {
    var sessionId = this.getSessionID();

    this.componentEvents = {
      sessionConnected: Platform.OS === 'android' ? 'session:onConnected' : 'session:sessionDidConnect',
    };

    this.componentEventsArray = Object.values(this.componentEvents);
    this.otrnEventHandler = getOtrnErrorEventHandler(this.props.eventHandlers);

    this.subscribeToEventHandlers(this.props.eventHandlers);

    OT.setJSComponentEvents(this.componentEventsArray);

    if (sessionId)
      this.sessionConnected = nativeEvents.addListener(`${sessionId}:${this.componentEvents.sessionConnected}`, () => this.sessionConnectedHandler());
  }

  componentDidMount = () => {
    this.createPublisher();
  }

  componentDidUpdate = (previousProps) => {
    const useDefault = (value, defaultValue) => ((value === undefined) ? defaultValue : value);

    const shouldUpdate = (key, defaultValue) => {
      var previous = useDefault(previousProps.properties[key], defaultValue);
      var current = useDefault(this.props.properties[key], defaultValue);

      return (previous !== current);
    };

    const updatePublisherProperty = (key, defaultValue) => {
      if (shouldUpdate(key, defaultValue)) {
        var value = useDefault(this.props.properties[key], defaultValue);
        if (key === 'cameraPosition')
          OT.changeCameraPosition(this.state.publisherId, value);
        else
          OT[key](this.state.publisherId, value);
      }
    };

    if (prevProps.eventHandlers !== this.props.eventHandlers)
      this.subscribeToEventHandlers(this.props.eventHandlers);

    updatePublisherProperty('publishAudio', true);
    updatePublisherProperty('publishVideo', true);
    updatePublisherProperty('cameraPosition', 'front');
  }

  componentWillUnmount = () => {
    OT.destroyPublisher(this.state.publisherId, (error) => {
      if (error) {
        this.otrnEventHandler(error);
      } else {
        this.sessionConnected.remove();

        OT.removeJSComponentEvents(this.componentEventsArray);

        if (this._currentEventHandlers)
          removeNativeEvents(this._currentEventHandlers);
      }
    });
  }

  sessionConnectedHandler = () => {
    if (isNull(this.state.publisher) && isNull(this.state.initError))
      this.publish();
  }

  createPublisher = () => {
    if (Platform.OS === 'android') {
      checkAndroidPermissions()
        .then(() => {
          this.initPublisher();
        })
        .catch((error) => {
          this.otrnEventHandler(error);
        });
    } else {
      this.initPublisher();
    }
  }

  initPublisher = () => {
    var sessionId = this.getSessionID();
    if (!sessionId)
      return;

    var publisherProperties = sanitizeProperties(this.props.properties);

    OT.initPublisher(this.state.publisherId, publisherProperties, (initError) => {
      if (initError) {
        this.setState({ initError });
        this.otrnEventHandler(initError);
      } else {
        OT.getSessionInfo(sessionId, (session) => {
          if (!isNull(session) && isNull(this.state.publisher) && isConnected(session.connectionStatus))
            this.publish();
        });
      }
    });
  }

  publish = () => {
    var sessionId = this.getSessionID();

    OT.publish(sessionId, this.state.publisherId, (publishError) => {
      if (publishError)
        this.otrnEventHandler(publishError);
      else
        this.setState({ publisher: true });
    });
  }

  render = () => {
    var { publisher, publisherId } = this.state,
        sessionId = this.getSessionID();

    if (!publisher || !publisherId || !sessionId)
      return null;

    return (<OTPublisherView className={this.props.className} style={this.props.style} publisherId={publisherId} sessionId={sessionId} />);
  }
}
const viewPropTypes = View.propTypes;
OTPublisher.propTypes = {
  ...viewPropTypes,
  properties: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  eventHandlers: PropTypes.object, // eslint-disable-line react/forbid-prop-types,
  session: PropTypes.object // eslint-disable-line react/forbid-prop-types
};
OTPublisher.defaultProps = {
  properties: {},
  eventHandlers: {},
};
OTPublisher.contextType = OTContext;
export default OTPublisher;
