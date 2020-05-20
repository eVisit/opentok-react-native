import React, { Component, Children, cloneElement } from 'react';
import { View, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';
import { pick, isNull } from 'underscore';
import { setNativeEvents, removeNativeEvents,  OT } from './OT';
import {
  sanitizeSessionEvents,
  sanitizeSessionOptions,
  sanitizeSignalData,
  sanitizeCredentials,
  getConnectionStatus
} from './helpers/OTSessionHelper';
import { handleError } from './OTError';
import { logOT, getOtrnErrorEventHandler } from './helpers/OTHelper';
import OTContext from './contexts/OTContext';

export default class OTSession extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sessionInfo: null,
    };

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

    var credentials = pick(this.props, [ 'apiKey', 'sessionId', 'token' ]);

    this.sanitizedCredentials = sanitizeCredentials(credentials);

    if (Object.keys(this.sanitizedCredentials).length === 3) {
      var sessionEvents = this._currentEventHandlers = sanitizeSessionEvents(this.sanitizedCredentials.sessionId, eventHandlers);
      setNativeEvents(sessionEvents);
    }
  }

  initComponent = () => {
    this.subscribeToEventHandlers(this.props.eventHandlers);
  }

  componentDidMount = () => {
    this.connectSession();
  }

  componentDidUpdate = (prevProps) => {
    const useDefault = (value, defaultValue) => (value === undefined ? defaultValue : value);
    const shouldUpdate = (key, defaultValue) => {
      const previous = useDefault(prevProps[key], defaultValue);
      const current = useDefault(this.props[key], defaultValue);
      return previous !== current;
    };

    const updateSessionProperty = (key, defaultValue) => {
      if (shouldUpdate(key, defaultValue)) {
        const value = useDefault(this.props[key], defaultValue);
        this.signal(value);
      }
    };

    if (prevProps.eventHandlers !== this.props.eventHandlers)
      this.subscribeToEventHandlers(this.props.eventHandlers);

    updateSessionProperty('signal', {});

    var credentials = pick(this.props, [ 'apiKey', 'sessionId', 'token' ]),
        newCredentials = sanitizeCredentials(credentials);

    if (this.sanitizedCredentials && (newCredentials.apiKey !== this.sanitizedCredentials.apiKey || newCredentials.sessionId !== this.sanitizedCredentials.sessionId || newCredentials.token !== this.sanitizedCredentials.token)) {
      this.sanitizedCredentials = newCredentials;

      this.disconnectSession((error) => {
        if (error)
          return;

        this.connectSession();
      });
    }
  }

  componentWillUnmount = () => {
    this.disconnectSession();
  }

  createSession = (credentials, sessionOptions) => {
    var { signal } = this.props,
        { apiKey, sessionId, token } = credentials;

    OT.initSession(apiKey, sessionId, sessionOptions);

    OT.connect(sessionId, token, (error) => {
      if (error) {
        this.otrnEventHandler(error);
      } else {
        OT.getSessionInfo(sessionId, (session) => {
          if (isNull(session))
            return;

          const sessionInfo = { ...session, connectionStatus: getConnectionStatus(session.connectionStatus)};
          this.setState({ sessionInfo });

          logOT({ apiKey, sessionId, action: 'rn_on_connect', proxyUrl: sessionOptions.proxyUrl, connectionId: session.connection.connectionId });

          if (Object.keys(signal).length > 0)
            this.signal(signal);
        });
      }
    });
  }

  connectSession() {
    var sessionOptions = sanitizeSessionOptions(this.props.options),
        { apiKey, sessionId, token } = (this.sanitizedCredentials || {});

    if (apiKey && sessionId && token) {
      this.createSession(this.sanitizedCredentials, sessionOptions);
      logOT(this.sanitizedCredentials.apiKey, this.sanitizedCredentials.sessionId, 'rn_initialize');
    } else {
      handleError('Please check your OpenTok credentials.');
    }
  }

  disconnectSession = (callback) => {
    OT.disconnectSession(this.props.sessionId, (disconnectError) => {
      if (disconnectError) {
        this.otrnEventHandler(disconnectError);
        callback && callback(disconnectError);
      } else {
        if (this._currentEventHandlers)
          removeNativeEvents(this._currentEventHandlers);

        callback && callback(null);
      }
    });
  }

  getSessionInfo = () => {
    return this.state.sessionInfo;
  }

  signal = (signal) => {
    var signalData = sanitizeSignalData(signal);
    OT.sendSignal(this.props.sessionId, signalData.signal, signalData.errorHandler);
  }

  render = () => {
    var { style, children, sessionId, apiKey, token } = this.props,
        { sessionInfo } = this.state;

    if (!children || !sessionId || !apiKey || !token)
      return null;

    return (
      <OTContext.Provider value={{ sessionId, sessionInfo }}>
        <View style={style}>
          { children }
        </View>
      </OTContext.Provider>
    );
  }
}

OTSession.propTypes = {
  apiKey: PropTypes.oneOfType([ PropTypes.string, PropTypes.number ]).isRequired,
  sessionId: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.element,
    PropTypes.arrayOf(PropTypes.element),
  ]),
  style: ViewPropTypes.style,
  eventHandlers: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  options: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  signal: PropTypes.object, // eslint-disable-line react/forbid-prop-types
};

OTSession.defaultProps = {
  eventHandlers: {},
  options: {},
  signal: {},
  style: {
    flex: 1
  },
};
