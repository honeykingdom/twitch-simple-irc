'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tls = _interopDefault(require('tls'));
var net = require('net');
var events = require('events');
var tekko = require('tekko');

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

var getRandomUsername = function getRandomUsername() {
  var randomSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return "justinfan" + randomSuffix;
};
var getIsAction = function getIsAction(message) {
  return message.startsWith("\x01ACTION ") && message.endsWith("\x01");
};
var normalizeActionMessage = function normalizeActionMessage(message) {
  return message.slice(8, -1);
};
var getChannelFromMessage = function getChannelFromMessage(message) {
  return message.middle[0].slice(1);
};
var isNode = !!(typeof process !== 'undefined' && process.versions && process.versions.node);

var booleanMessageTags = ['mod', 'emote-only', 'r9k', 'rituals', 'subs-only', 'msg-param-should-share-streak'];
var numberMessageTags = ['tmi-sent-ts', 'bits', 'ban-duration', 'msg-param-cumulative-months', 'msg-param-months', 'msg-param-promo-gift-total', 'msg-param-streak-months', 'msg-param-viewerCount', 'msg-param-threshold'];
var tagNamesMap = {
  'badge-info': 'badgeInfo',
  'display-name': 'displayName',
  'emote-sets': 'emoteSets',
  'room-id': 'roomId',
  'tmi-sent-ts': 'tmiSentTs',
  'user-id': 'userId',
  'target-msg-id': 'targetMsgId',
  'target-user-id': 'targetUserId',
  'msg-id': 'msgId',
  'system-msg': 'systemMsg',
  'emote-only': 'emoteOnly',
  'followers-only': 'followersOnly',
  'subs-only': 'subsOnly',
  'ban-duration': 'banDuration',
  'message-id': 'messageId',
  'thread-id': 'threadId',
  'msg-param-cumulative-months': 'msgParamCumulativeMonths',
  'msg-param-displayName': 'msgParamDisplayName',
  'msg-param-login': 'msgParamLogin',
  'msg-param-months': 'msgParamMonths',
  'msg-param-promo-gift-total': 'msgParamPromoGiftTotal',
  'msg-param-promo-name': 'msgParamPromoName',
  'msg-param-recipient-display-name': 'msgParamRecipientDisplayName',
  'msg-param-recipient-id': 'msgParamRecipientId',
  'msg-param-recipient-user-name': 'msgParamRecipientUserName',
  'msg-param-sender-login': 'msgParamSenderLogin',
  'msg-param-sender-name': 'msgParamSenderName',
  'msg-param-should-share-streak': 'msgParamShouldShareStreak',
  'msg-param-streak-months': 'msgParamStreakMonths',
  'msg-param-sub-plan': 'msgParamSubPlan',
  'msg-param-sub-plan-name': 'msgParamSubPlanName',
  'msg-param-viewerCount': 'msgParamViewerCount',
  'msg-param-ritual-name': 'msgParamRitualName',
  'msg-param-threshold': 'msgParamThreshold'
};
var depricatedMessageTags = ['subscriber', 'turbo', 'user-type'];

var parseMessageEmotes = function parseMessageEmotes(raw) {
  if (raw === void 0) {
    raw = '';
  }

  if (!raw) return {};
  return raw.split('/').reduce(function (acc, emote) {
    var _extends2;

    var _emote$split = emote.split(':'),
        id = _emote$split[0],
        indexes = _emote$split[1];

    return _extends({}, acc, (_extends2 = {}, _extends2[id] = indexes.split(',').map(function (index) {
      var _index$split = index.split('-'),
          start = _index$split[0],
          end = _index$split[1];

      return {
        start: Number.parseInt(start, 10),
        end: Number.parseInt(end, 10)
      };
    }), _extends2));
  }, {});
};

var parseBadges = function parseBadges(data) {
  if (data === void 0) {
    data = '';
  }

  if (!data) return {};
  return data.split(',').reduce(function (acc, badge) {
    var _extends3;

    var _badge$split = badge.split('/'),
        name = _badge$split[0],
        value = _badge$split[1];

    return _extends({}, acc, (_extends3 = {}, _extends3[name] = value, _extends3));
  }, {});
};

var normalizeTagValue = function normalizeTagValue(name, value) {
  if (name === 'emotes') return parseMessageEmotes(value);
  if (name === 'badges') return parseBadges(value);
  if (name === 'badge-info') return parseBadges(value);

  if (name === 'followers-only') {
    var followersOnly = false;

    if (value === '-1') {
      followersOnly = false;
    } else if (value === '0') {
      followersOnly = true;
    } else if (typeof value === 'string') {
      followersOnly = parseInt(value, 10);
    }

    return followersOnly;
  }

  if (name === 'slow') {
    var slow = false;

    if (value === '0') {
      slow = false;
    } else if (typeof value === 'string') {
      slow = parseInt(value, 10);
    }

    return slow;
  }

  if (booleanMessageTags.includes(name)) return value === '1';
  if (numberMessageTags.includes(name)) return parseInt(value, 10);

  if (typeof value === 'string') {
    return value.replace('\\s', ' ');
  }

  return value;
};

var parseMessageTags = function parseMessageTags(data) {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce(function (acc, _ref) {
    var _extends4;

    var key = _ref[0],
        value = _ref[1];

    if (depricatedMessageTags.includes(key)) {
      return acc;
    }

    var newKey = tagNamesMap[key] || key;
    return _extends({}, acc, (_extends4 = {}, _extends4[newKey] = normalizeTagValue(key, value), _extends4));
  }, {});
};

var normalizeChatMessage = function normalizeChatMessage(data) {
  var raw = data.raw,
      trailing = data.trailing,
      tags = data.tags,
      prefix = data.prefix;
  var name = prefix.name;
  var isAction = getIsAction(trailing);
  return {
    raw: raw,
    message: isAction ? normalizeActionMessage(trailing) : trailing,
    channel: getChannelFromMessage(data),
    user: name,

    get tags() {
      return parseMessageTags(tags);
    },

    isAction: isAction
  };
};
var normalizeGlobalUserState = function normalizeGlobalUserState(_ref) {
  var raw = _ref.raw,
      tags = _ref.tags;
  return {
    raw: raw,

    get tags() {
      return parseMessageTags(tags);
    }

  };
};
var normalizeState = function normalizeState(data) {
  var raw = data.raw,
      tags = data.tags;
  return {
    raw: raw,
    channel: getChannelFromMessage(data),

    get tags() {
      return parseMessageTags(tags);
    }

  };
};
var normalizeCommand = function normalizeCommand(data) {
  var raw = data.raw,
      trailing = data.trailing,
      tags = data.tags;
  return {
    raw: raw,
    message: trailing,
    channel: getChannelFromMessage(data),

    get tags() {
      return parseMessageTags(tags);
    }

  };
};
var normalizeWhisper = function normalizeWhisper(_ref2) {
  var raw = _ref2.raw,
      trailing = _ref2.trailing,
      tags = _ref2.tags,
      prefix = _ref2.prefix,
      _ref2$middle = _ref2.middle,
      channel = _ref2$middle[0];
  var name = prefix.name;
  return {
    raw: raw,
    message: trailing,
    channel: channel,
    user: name,

    get tags() {
      return parseMessageTags(tags);
    }

  };
};

(function (Commands) {
  Commands["REPLY001"] = "001";
  Commands["PING"] = "PING";
  Commands["PONG"] = "PONG";
  Commands["JOIN"] = "JOIN";
  Commands["PART"] = "PART";
  Commands["PRIVMSG"] = "PRIVMSG";
  Commands["NOTICE"] = "NOTICE";
  Commands["USERNOTICE"] = "USERNOTICE";
  Commands["GLOBALUSERSTATE"] = "GLOBALUSERSTATE";
  Commands["USERSTATE"] = "USERSTATE";
  Commands["ROOMSTATE"] = "ROOMSTATE";
  Commands["CLEARCHAT"] = "CLEARCHAT";
  Commands["CLEARMSG"] = "CLEARMSG";
  Commands["HOSTTARGET"] = "HOSTTARGET";
  Commands["WHISPER"] = "WHISPER";
})(exports.Commands || (exports.Commands = {}));

var Client = /*#__PURE__*/function (_EventEmitter) {
  _inheritsLoose(Client, _EventEmitter);

  function Client(options) {
    var _this;

    if (options === void 0) {
      options = {};
    }

    _this = _EventEmitter.call(this) || this;
    _this.socket = null;
    _this.globalUserState = null;
    _this.channels = {};
    _this._connected = false;
    _this._connecting = false;
    _this._registered = false;
    _this.options = _extends({
      secure: true
    }, options);
    return _this;
  }

  var _proto = Client.prototype;

  _proto.connect = function connect() {
    try {
      var _this3 = this;

      var connection = isNode ? _this3._connectInNode() : _this3._connectInBrowser();
      return Promise.resolve(connection).then(function () {
        return _this3._register();
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.disconnect = function disconnect() {
    if (!this._connected) return;

    if (isNode) {
      this.socket.destroy();
    } else {
      this.socket.close();
    }

    this.socket = null;
    this._connected = false;
    this._connecting = false;
    this._registered = false;
    this.emit('disconnect');
  };

  _proto.receiveRaw = function receiveRaw(rawData) {
    var _this4 = this;

    var data = rawData.trim().split('\r\n');
    data.forEach(function (line) {
      return _this4._handleMessage(line);
    });
  };

  _proto.sendRaw = function sendRaw(message) {
    if (this.socket === null || !message) {
      return false;
    }

    if (isNode) {
      this.socket.write(message);
    } else {
      this.socket.send(message);
    }

    return true;
  };

  _proto.say = function say(channel, message) {
    if (!message) return false;
    var ircMessage = tekko.format({
      command: exports.Commands.PRIVMSG,
      middle: ["#" + channel],
      trailing: message
    });
    return this.sendRaw(ircMessage);
  };

  _proto.sendCommand = function sendCommand(channel, command, params) {
    if (params === void 0) {
      params = '';
    }

    var commandParams = Array.isArray(params) ? params.join(' ') : params;
    var ircMessage = tekko.format({
      command: exports.Commands.PRIVMSG,
      middle: ["#" + channel],
      trailing: "/" + command + " " + commandParams
    });
    return this.sendRaw(ircMessage);
  };

  _proto.join = function join(channel) {
    if (!this._registered) return false;
    var ircMessage = tekko.format({
      command: exports.Commands.JOIN,
      middle: ["#" + channel]
    });
    return this.sendRaw(ircMessage);
  };

  _proto.part = function part(channel) {
    if (!this._registered) return false;
    var ircMessage = tekko.format({
      command: exports.Commands.PART,
      middle: ["#" + channel]
    });
    return this.sendRaw(ircMessage);
  };

  _proto._handleMessage = function _handleMessage(raw) {
    var data = tekko.parse(raw);
    data.raw = raw;
    var command = data.command;

    if (command === exports.Commands.PING) {
      this.sendRaw(exports.Commands.PONG + " :tmi.twitch.tv");
      this.emit('ping', {
        raw: raw
      });
      return;
    }

    if (command === exports.Commands.REPLY001) {
      this.options.name = data.middle[0];
      this._registered = true;
      this.emit('register');
      return;
    }

    if (command === exports.Commands.PRIVMSG) {
      var eventData = normalizeChatMessage(data);
      this.emit('message', eventData);
      return;
    }

    if (command === exports.Commands.USERSTATE) {
      var channel = getChannelFromMessage(data);

      var _eventData = normalizeState(data);

      this._updateUserState(channel, _eventData.tags);

      this.emit('userstate', _eventData);
      return;
    }

    if (command === exports.Commands.JOIN) {
      var _channel = getChannelFromMessage(data);

      var _eventData2 = {
        channel: _channel
      };
      this.emit('join', _eventData2);
      return;
    }

    if (command === exports.Commands.PART) {
      var _channel2 = getChannelFromMessage(data);

      var _eventData3 = {
        channel: _channel2
      };
      this.emit('part', _eventData3);
      return;
    }

    if (command === exports.Commands.ROOMSTATE) {
      var _channel3 = getChannelFromMessage(data);

      var _eventData4 = normalizeState(data);

      this._updateRoomState(_channel3, _eventData4.tags);

      this.emit('roomstate', _eventData4);
      return;
    }

    if (command === exports.Commands.NOTICE) {
      var _eventData5 = normalizeCommand(data);

      this.emit('notice', _eventData5);
      return;
    }

    if (command === exports.Commands.USERNOTICE) {
      var _eventData6 = normalizeCommand(data);

      this.emit('usernotice', _eventData6);
      return;
    }

    if (command === exports.Commands.CLEARCHAT) {
      var _eventData7 = normalizeCommand(data);

      this.emit('clearchat', _eventData7);
      return;
    }

    if (command === exports.Commands.CLEARMSG) {
      var _eventData8 = normalizeCommand(data);

      this.emit('clearmessage', _eventData8);
      return;
    }

    if (command === exports.Commands.HOSTTARGET) {
      var _eventData9 = normalizeCommand(data);

      this.emit('hosttarget', _eventData9);
      return;
    }

    if (command === exports.Commands.WHISPER) {
      var _eventData10 = normalizeWhisper(data);

      this.emit('whisper', _eventData10);
      return;
    }

    if (command === exports.Commands.GLOBALUSERSTATE) {
      var _eventData11 = normalizeGlobalUserState(data);

      this._updateGlobalUserState(_eventData11.tags);

      this.emit('globaluserstate', _eventData11);
      return;
    }
  };

  _proto._connectInNode = function _connectInNode() {
    var _this5 = this;

    var host = 'irc.chat.twitch.tv';
    var port = this.options.secure ? 6697 : 6667;
    return new Promise(function (resolve, reject) {
      _this5._connecting = true;

      var handleConnect = function handleConnect() {
        _this5._connecting = false;
        _this5._connected = true;

        _this5.emit('connect');

        resolve();
      };

      if (_this5.options.secure) {
        _this5.socket = tls.connect(port, host, {}, handleConnect);
      } else {
        _this5.socket = new net.Socket();

        _this5.socket.connect(port, host, handleConnect);
      }

      _this5.socket.on('error', function (error) {
        _this5._connected = false;
        _this5._connecting = false;

        _this5.emit('disconnect', error);

        reject(error);
      });

      _this5.socket.on('data', function (data) {
        _this5.receiveRaw(data.toString());
      });

      _this5.socket.on('close', function () {
        _this5._connected = false;
        _this5._connecting = false;
        _this5._registered = false;

        _this5.emit('disconnect');
      });
    });
  };

  _proto._connectInBrowser = function _connectInBrowser() {
    var _this6 = this;

    var url = this.options.secure ? 'wss://irc-ws.chat.twitch.tv:443' : 'ws://irc-ws.chat.twitch.tv:80';
    return new Promise(function (resolve, reject) {
      _this6._connecting = true;
      _this6.socket = new WebSocket(url);

      _this6.socket.onopen = function () {
        _this6._connected = true;
        _this6._connecting = false;

        _this6.emit('connect');

        resolve();
      };

      _this6.socket.onmessage = function (_ref) {
        var data = _ref.data;
        return _this6.receiveRaw(data);
      };

      _this6.socket.onerror = function () {};

      _this6.socket.onclose = function (_ref2) {
        var wasClean = _ref2.wasClean,
            code = _ref2.code,
            reason = _ref2.reason;
        _this6.socket = null;
        _this6._connected = false;
        _this6._connecting = false;
        _this6._registered = false;

        if (wasClean) {
          _this6.emit('disconnect');
        } else {
          var error = new Error("[" + code + "] " + reason);

          _this6.emit('disconnect', error);

          reject(error);
        }
      };
    });
  };

  _proto._register = function _register() {
    var _this7 = this;

    if (!this._connected) return Promise.reject();
    if (this._registered) return Promise.resolve();
    var _this$options = this.options,
        name = _this$options.name,
        auth = _this$options.auth;
    var nick = name || getRandomUsername();
    var pass = auth ? "oauth:" + auth : 'SCHMOOPIIE';
    this.sendRaw('CAP REQ :twitch.tv/tags twitch.tv/commands');
    this.sendRaw("PASS " + pass);
    this.sendRaw("NICK " + nick);
    return new Promise(function (resolve, reject) {
      var handleRegister = function handleRegister() {
        resolve();

        _this7.off('register', handleRegister);
      };

      _this7.on('register', handleRegister);

      setTimeout(function () {
        reject();

        _this7.off('register', handleRegister);
      }, 10000);
    });
  };

  _proto._updateGlobalUserState = function _updateGlobalUserState(globalUserState) {
    this.globalUserState = _extends({}, this.globalUserState, globalUserState);
  };

  _proto._updateUserState = function _updateUserState(channel, userState) {
    var _extends2;

    this.channels = _extends({}, this.channels, (_extends2 = {}, _extends2[channel] = _extends({}, this.channels[channel], {
      userState: userState
    }), _extends2));
  };

  _proto._updateRoomState = function _updateRoomState(channel, roomState) {
    var _extends3;

    this.channels = _extends({}, this.channels, (_extends3 = {}, _extends3[channel] = _extends({}, this.channels[channel], {
      roomState: roomState
    }), _extends3));
  };

  _createClass(Client, [{
    key: "connected",
    get: function get() {
      return this._connected;
    }
  }, {
    key: "connecting",
    get: function get() {
      return this._connecting;
    }
  }, {
    key: "registered",
    get: function get() {
      return this._registered;
    }
  }]);

  return Client;
}(events.EventEmitter);

(function (UserNoticeType) {
  UserNoticeType["sub"] = "sub";
  UserNoticeType["resub"] = "resub";
  UserNoticeType["subgift"] = "subgift";
  UserNoticeType["anonsubgift"] = "anonsubgift";
  UserNoticeType["submysterygift"] = "submysterygift";
  UserNoticeType["giftpaidupgrade"] = "giftpaidupgrade";
  UserNoticeType["rewardgift"] = "rewardgift";
  UserNoticeType["anongiftpaidupgrade"] = "anongiftpaidupgrade";
  UserNoticeType["raid"] = "raid";
  UserNoticeType["unraid"] = "unraid";
  UserNoticeType["ritual"] = "ritual";
  UserNoticeType["bitsbadgetier"] = "bitsbadgetier";
})(exports.UserNoticeType || (exports.UserNoticeType = {}));

exports.Client = Client;
exports.getChannelFromMessage = getChannelFromMessage;
exports.getIsAction = getIsAction;
exports.getRandomUsername = getRandomUsername;
exports.isNode = isNode;
exports.normalizeActionMessage = normalizeActionMessage;
exports.parseMessageTags = parseMessageTags;
//# sourceMappingURL=twitch-simple-irc.cjs.development.js.map
