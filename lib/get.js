/**
 * Accessor for compiled MessageFormat functions
 *
 * @class
 * @param {object} locales A map of locale codes to their function objects
 * @param {string|null} [defaultLocale] If not defined, default and initial locale is the first entry of `locales`
 *
 * @example
 * var fs = require('fs');
 * var MessageFormat = require('messageformat');
 * var mf = new MessageFormat(['en', 'fi']);
 * var msgSet = {
 *   en: {
 *     a: 'A {TYPE} example.',
 *     b: 'This has {COUNT, plural, one{one user} other{# users}}.',
 *     c: {
 *       d: 'We have {P, number, percent} code coverage.'
 *     }
 *   },
 *   fi: {
 *     b: 'Tällä on {COUNT, plural, one{yksi käyttäjä} other{# käyttäjää}}.',
 *     e: 'Minä puhun vain suomea.'
 *   }
 * };
 * var cfStr = mf.compile(msgSet).toString('module.exports');
 * fs.writeFileSync('messages.js', cfStr);
 *
 * ...
 *
 * var MessageFormatGet = require('messageformat/lib/get');
 * var msgData = require('./messages');
 * var messages = new MessageFormatGet(msgData, 'en');
 *
 * messages.hasMessage('a')                // true
 * messages.hasObject('c')                 // true
 * messages.get('b', { COUNT: 3 })         // 'This has 3 users.'
 * messages.get(['c', 'd'], { P: 0.314 })  // 'We have 31% code coverage.'
 *
 * messages.get('e')                       // 'e'
 * messages.setFallback('en', ['foo', 'fi'])
 * messages.get('e')                       // 'Minä puhun vain suomea.'
 *
 * messages.locale = 'fi'
 * messages.hasMessage('a')                // false
 * messages.hasMessage('a', 'en')          // true
 * messages.hasMessage('a', null, true)    // true
 * messages.hasObject('c')                 // false
 * messages.get('b', { COUNT: 3 })         // 'Tällä on 3 käyttäjää.'
 * messages.get('c').d({ P: 0.628 })       // 'We have 63% code coverage.'
 */
function Get(locales, defaultLocale) {
  this._data = {};
  this._fallback = {};
  Object.keys(locales).forEach(function(lc) {
    if (lc !== 'toString') {
      this._data[lc] = locales[lc];
      if (typeof defaultLocale === 'undefined') defaultLocale = lc;
    }
  }, this);

  /**
   * List of available locales
   * @readonly
   * @member {string[]} availableLocales
   */
  Object.defineProperty(this, 'availableLocales', {
    get() { return Object.keys(this._data) }
  });

  /**
   * Current locale
   * @member {string}
   */
  this.locale = defaultLocale;

  /**
   * Default fallback locale
   * @member {string|null}
   */
  this.defaultLocale = this.locale;
}

module.exports = Get;

/**
 * Add a new locale to the accessor; useful if loading locales dynamically
 * @param {string} lc Locale identifier
 * @param {object} data Hierarchical map of keys to functions
 * @returns {Get} The Get instance, to allow for chaining
 */
Get.prototype.addLocale = function(lc, data) {
  this._data[lc] = Object.keys(data).reduce(function(map, key) {
    if (key !== 'toString') map[key] = data[key];
    return map
  }, {});
  return this;
}

/**
 * Get the list of fallback locales
 * @param {string} [lc] If empty or undefined, defaults to `this.locale`
 * @returns {string[]}
 */
Get.prototype.getFallback = function(lc) {
  if (!lc) lc = this.locale;
  return this._fallback[lc] || (
    lc === this.defaultLocale || !this.defaultLocale ? [] : [this.defaultLocale]
  );
}

/**
 * Set the fallback locale or locales for `lc`
 *
 * To disable fallback for the locale, use `setFallback(lc, [])`.
 * To use the default fallback, use `setFallback(lc, null)`.
 *
 * @param {string} lc
 * @param {string[]|null} fallback
 * @returns {Get} The Get instance, to allow for chaining
 */
Get.prototype.setFallback = function(lc, fallback) {
  this._fallback[lc] = Array.isArray(fallback) ? fallback : null;
  return this;
}

/** @private */
function _get(obj, key) {
  if (!obj) return null;
  if (Array.isArray(key)) {
    for (var i = 0; i < key.length; ++i) {
      obj = obj[key[i]];
      if (!obj) return null;
    }
    return obj;
  }
  return obj[key];
}

/** @private */
function _has(data, lc, key, fallback, type) {
  var msg = _get(data[lc], key);
  if (msg) return typeof msg === type;
  if (fallback) {
    for (var i = 0; i < fallback.length; ++i) {
      msg = _get(data[fallback[i]], key);
      if (msg) return typeof msg === type;
    }
  }
  return false;
}

/**
 * Check if `key` is a message function for the locale
 *
 * `key` may be a `string` for functions at the root level, or `string[]` for
 * accessing hierarchical objects. If an exact match is not found and `fallback`
 * is true, the fallback locales are checked for the first match.
 *
 * @param {string|string[]} key The key or keypath being sought
 * @param {string} [lc] If empty or undefined, defaults to `this.locale`
 * @param {boolean} [fallback=false] If true, also checks fallback locales
 * @returns {boolean}
 */
Get.prototype.hasMessage = function(key, lc, fallback) {
  if (!lc) lc = this.locale;
  var fb = fallback ? this.getFallback(lc) : null;
  return _has(this._data, lc, key, fb, 'function');
}

/**
 * Check if `key` is a message object for the locale
 *
 * `key` may be a `string` for functions at the root level, or `string[]` for
 * accessing hierarchical objects. If an exact match is not found and `fallback`
 * is true, the fallback locales are checked for the first match.
 *
 * @param {string|string[]} key The key or keypath being sought
 * @param {string} [lc] If empty or undefined, defaults to `this.locale`
 * @param {boolean} [fallback=false] If true, also checks fallback locales
 * @returns {boolean}
 */
Get.prototype.hasObject = function(key, lc, fallback) {
  if (!lc) lc = this.locale;
  var fb = fallback ? this.getFallback(lc) : null;
  return _has(this._data, lc, key, fb, 'object');
}

/**
 * Get the message or object corresponding to `key`
 *
 * `key` may be a `string` for functions at the root level, or `string[]` for
 * accessing hierarchical objects. If an exact match is not found, the fallback
 * locales are checked for the first match.
 *
 * If `key` maps to a message function, it will be called with `props`. If it
 * maps to an object, the object is returned directly.
 *
 * @param {string|string[]} key The key or keypath being sought
 * @param {object} [props] Optional properties passed to the function
 * @param {string} [lc] If empty or undefined, defaults to `this.locale`
 * @returns {string|Object<string,function|object>}
 */
Get.prototype.get = function(key, props, lc) {
  if (!lc) lc = this.locale;
  var msg = _get(this._data[lc], key);
  if (msg) return typeof msg == 'function' ? msg(props) : msg;
  var fb = this.getFallback(lc);
  for (var i = 0; i < fb.length; ++i) {
    msg = _get(this._data[fb[i]], key);
    if (msg) return typeof msg == 'function' ? msg(props) : msg;
  }
  return key;
}
