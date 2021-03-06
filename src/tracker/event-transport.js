import { buildQuery, logSupport, supportsBeaconApi } from '../utils';

const domain = 'https://fortnight.as3.io';

export default class EventTransport {
  /**
   * Constructor.
   *
   * @param {?object} options
   * @param {?string} options.domain The backend domain.
   */
  constructor(options = {}) {
    const defaults = { domain };
    this.options = Object.assign(defaults, options);
  }

  /**
   * Sends an event to the backend.
   *
   * @param {string} action The event action, e.g. `view`, `load` or `click`
   * @param {object} fields The event fields
   * @param {string} fields.pid The placement ID
   * @param {string} fields.cid The campaign ID
   * @param {string} fields.uuid The unique request UUID
   * @param {string} fields.cre The creative ID
   * @param {?object} options The event options
   * @param {?string} options.transport The transport type. Image is the default.
   * @param {?Function} options.callback The callback to fire once complete.
   */
  send(
    action,
    {
      pid,
      cid,
      uuid,
      cre,
    } = {},
    { transport, callback } = {},
  ) {
    const act = String(action).trim().toLowerCase();
    if (!act) {
      logSupport(true, 'No event action was provided. Preventing send.', 'warning');
      return;
    }
    const _ = (new Date()).getTime();
    const params = {
      pid,
      cid,
      uuid,
      cre,
      _,
    };

    if (transport === 'beacon') {
      this.sendBeacon(act, params, callback);
    } else {
      this.sendImage(act, params, callback);
    }
  }

  /**
   * Sends the event an `img` element.
   *
   * @private
   * @param {string} act
   * @param {object} params
   * @param {?Function} callback
   */
  sendImage(act, params, callback) {
    const url = this.buildEventUrl(act, params);
    const img = document.createElement('img');
    if (typeof callback === 'function') {
      img.onload = () => callback(act, params);
      img.onerror = () => {
        logSupport(true, 'The image beacon failed to load.', 'warning', { act, params });
        callback(act, params);
      };
    }
    img.src = url;
  }

  /**
   * Sends the event using the Beacon API.
   * Will fallback with an `img` element if the beacon wasn't queued.
   *
   * @private
   * @param {string} act
   * @param {object} params
   * @param {?Function} callback
   */
  sendBeacon(act, params, callback) {
    logSupport(!window.navigator, 'The window.navigator object is not defined.', 'warning');
    if (!supportsBeaconApi()) {
      logSupport(true, 'Falling back to image transport. Beacon API unavailable.', 'info', { act, params });
      this.sendImage(act, params, callback);
    } else {
      const url = this.buildEventUrl(act, params);
      const queued = navigator.sendBeacon(url);
      if (queued) {
        if (typeof callback === 'function') callback(act, params);
      } else {
        this.sendImage(act, params, callback);
      }
    }
  }

  /**
   * Builds an fully-qualified event URL for the provided action and paramaters
   *
   * @private
   * @param {string} action
   * @param {object} params
   */
  buildEventUrl(act, params) {
    const query = buildQuery(params);
    const endpoint = `/e/${act}.gif?${query}`;
    return this.createUrl(endpoint);
  }

  /**
   * Configures the domain name for sending events.
   *
   * @return string
   */
  get domain() {
    if (!this.options.domain) return domain;
    return `${this.options.domain.replace(/\/+$/, '')}`;
  }

  /**
   * Creates a URL using the provided endoint with the configured domain.
   *
   * @param {string} endpoint
   * @return {string}
   */
  createUrl(endpoint) {
    return `${this.domain}/${endpoint.replace(/^\/+/, '')}`;
  }
}
