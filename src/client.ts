import tls from 'tls';
import { Socket } from 'net';
import { EventEmitter } from 'events';
import * as tekko from 'tekko';

import {
  TekkoMessage,
  MessageEvent,
  GlobalUserStateEvent,
  GlobalUserStateTags,
  UserStateEvent,
  UserStateTags,
  RoomStateEvent,
  RoomStateTags,
  ClearChatEvent,
  ClearMessageEvent,
  HostTargetEvent,
  NoticeEvent,
  UserNoticeEvent,
  WhisperEvent,
  JoinEvent,
  PartEvent,
  PingEvent,
} from './types';
import { isNode, getChannelFromMessage, getRandomUsername } from './utils';
import {
  normalizeChatMessage,
  normalizeState,
  normalizeCommand,
  normalizeWhisper,
  normalizeGlobalUserState,
} from './normalize';

export enum Commands {
  REPLY001 = '001',
  PING = 'PING',
  PONG = 'PONG',
  JOIN = 'JOIN',
  PART = 'PART',
  PRIVMSG = 'PRIVMSG',
  NOTICE = 'NOTICE',
  USERNOTICE = 'USERNOTICE',
  GLOBALUSERSTATE = 'GLOBALUSERSTATE',
  USERSTATE = 'USERSTATE',
  ROOMSTATE = 'ROOMSTATE',
  CLEARCHAT = 'CLEARCHAT',
  CLEARMSG = 'CLEARMSG',
  HOSTTARGET = 'HOSTTARGET',
  WHISPER = 'WHISPER',
}

interface ClientOptions {
  name?: string;
  auth?: string;
  secure?: boolean;
}

interface Channels {
  [channel: string]: {
    userState: UserStateTags;
    roomState: RoomStateTags;
  };
}

type Listener<T> = (data: T) => void;

export interface Client {
  on(event: 'connect', listener: () => void): this;
  on(event: 'disconnect', listener: (error?: Error) => void): this;
  on(event: 'register', listener: () => void): this;
  on(event: 'message', listener: Listener<MessageEvent>): this;
  on(event: 'notice', listener: Listener<NoticeEvent>): this;
  on(event: 'usernotice', listener: Listener<UserNoticeEvent>): this;
  on(event: 'whisper', listener: Listener<WhisperEvent>): this;
  on(event: 'globaluserstate', listener: Listener<GlobalUserStateEvent>): this;
  on(event: 'userstate', listener: Listener<UserStateEvent>): this;
  on(event: 'roomstate', listener: Listener<RoomStateEvent>): this;
  on(event: 'join', listener: Listener<JoinEvent>): this;
  on(event: 'part', listener: Listener<PartEvent>): this;
  on(event: 'clearchat', listener: Listener<ClearChatEvent>): this;
  on(event: 'clearmessage', listener: Listener<ClearMessageEvent>): this;
  on(event: 'hosttarget', listener: Listener<HostTargetEvent>): this;
  on(event: 'ping', listener: Listener<PingEvent>): this;
  on(event: 'error', listener: (error: Error) => void): this;

  emit(event: 'connect'): boolean;
  emit(event: 'disconnect', error?: Error): boolean;
  emit(event: 'register'): boolean;
  emit(event: 'message', data: MessageEvent): boolean;
  emit(event: 'notice', data: NoticeEvent): boolean;
  emit(event: 'usernotice', data: UserNoticeEvent): boolean;
  emit(event: 'whisper', data: WhisperEvent): boolean;
  emit(event: 'globaluserstate', data: GlobalUserStateEvent): boolean;
  emit(event: 'userstate', data: UserStateEvent): boolean;
  emit(event: 'roomstate', data: RoomStateEvent): boolean;
  emit(event: 'join', data: JoinEvent): boolean;
  emit(event: 'part', data: PartEvent): boolean;
  emit(event: 'clearchat', data: ClearChatEvent): boolean;
  emit(event: 'clearmessage', data: ClearMessageEvent): boolean;
  emit(event: 'hosttarget', data: HostTargetEvent): boolean;
  emit(event: 'ping', data: PingEvent): boolean;
  emit(event: 'error', error: Error): boolean;
}

export class Client extends EventEmitter {
  socket: WebSocket | Socket | null = null;

  options: ClientOptions;

  globalUserState: GlobalUserStateTags | null = null;

  channels: Channels = {};

  private _connected: boolean = false;

  private _connecting: boolean = false;

  private _registered: boolean = false;

  constructor(options: ClientOptions | null | undefined = {}) {
    super();
    this.options = { secure: true, ...options };
  }

  async connect(): Promise<void> {
    const connection = isNode
      ? this._connectInNode()
      : this._connectInBrowser();

    await connection;

    return this._register();
  }

  disconnect(): void {
    if (!this._connected) return;

    if (isNode) {
      (this.socket as Socket).destroy();
    } else {
      (this.socket as WebSocket).close();
    }

    this.socket = null;
    this._connected = false;
    this._connecting = false;
    this._registered = false;

    this.emit('disconnect');
  }

  receiveRaw(rawData: string) {
    const data = rawData.trim().split('\r\n');

    data.forEach((line) => this._handleMessage(line));
  }

  sendRaw(message: string): boolean {
    if (this.socket === null || !message) {
      return false;
    }

    if (isNode) {
      (this.socket as Socket).write(`${message}\r\n`);
    } else {
      (this.socket as WebSocket).send(message);
    }

    return true;
  }

  say(channel: string, message: string): boolean {
    if (!message) return false;

    const ircMessage = tekko.format({
      command: Commands.PRIVMSG,
      middle: [`#${channel}`],
      trailing: message,
    });

    return this.sendRaw(ircMessage);
  }

  sendCommand(
    channel: string,
    command: string,
    params: string | Array<string> = '',
  ): boolean {
    const commandParams = Array.isArray(params) ? params.join(' ') : params;
    const ircMessage = tekko.format({
      command: Commands.PRIVMSG,
      middle: [`#${channel}`],
      trailing: `/${command} ${commandParams}`,
    });

    return this.sendRaw(ircMessage);
  }

  join(channel: string): boolean {
    if (!this._registered) return false;

    const ircMessage = tekko.format({
      command: Commands.JOIN,
      middle: [`#${channel}`],
    });

    return this.sendRaw(ircMessage);
  }

  part(channel: string): boolean {
    if (!this._registered) return false;

    const ircMessage = tekko.format({
      command: Commands.PART,
      middle: [`#${channel}`],
    });

    return this.sendRaw(ircMessage);
  }

  _handleMessage(raw: string) {
    const data: TekkoMessage = tekko.parse(raw) as TekkoMessage;
    data.raw = raw;
    const { command } = data;

    if (command === Commands.PING) {
      this.sendRaw(`${Commands.PONG} :tmi.twitch.tv`);
      this.emit('ping', { raw });

      return;
    }

    if (command === Commands.REPLY001) {
      this.options.name = data.middle[0];
      this._registered = true;

      this.emit('register');

      return;
    }

    if (command === Commands.PRIVMSG) {
      const eventData = normalizeChatMessage(data);

      this.emit('message', eventData);

      return;
    }

    if (command === Commands.USERSTATE) {
      const channel = getChannelFromMessage(data);
      const eventData = normalizeState(data) as UserStateEvent;

      this._updateUserState(channel, eventData.tags);
      this.emit('userstate', eventData);

      return;
    }

    if (command === Commands.JOIN) {
      const channel = getChannelFromMessage(data);
      const eventData = { channel } as JoinEvent;

      this.emit('join', eventData);

      return;
    }

    if (command === Commands.PART) {
      const channel = getChannelFromMessage(data);
      const eventData = { channel } as PartEvent;

      this.emit('part', eventData);

      return;
    }

    if (command === Commands.ROOMSTATE) {
      const channel = getChannelFromMessage(data);
      const eventData = (normalizeState(data) as unknown) as RoomStateEvent;

      this._updateRoomState(channel, eventData.tags);
      this.emit('roomstate', eventData);

      return;
    }

    if (command === Commands.NOTICE) {
      const eventData = normalizeCommand(data) as NoticeEvent;

      this.emit('notice', eventData);

      return;
    }

    if (command === Commands.USERNOTICE) {
      const eventData = (normalizeCommand(data) as unknown) as UserNoticeEvent;

      this.emit('usernotice', eventData);

      return;
    }

    if (command === Commands.CLEARCHAT) {
      const eventData = normalizeCommand(data) as ClearChatEvent;

      this.emit('clearchat', eventData);

      return;
    }

    if (command === Commands.CLEARMSG) {
      const eventData = normalizeCommand(data) as ClearMessageEvent;

      this.emit('clearmessage', eventData);

      return;
    }

    if (command === Commands.HOSTTARGET) {
      const eventData = normalizeCommand(data) as HostTargetEvent;

      this.emit('hosttarget', eventData);

      return;
    }

    if (command === Commands.WHISPER) {
      const eventData = normalizeWhisper(data);

      this.emit('whisper', eventData);

      return;
    }

    if (command === Commands.GLOBALUSERSTATE) {
      const eventData = normalizeGlobalUserState(data);

      this._updateGlobalUserState(eventData.tags);
      this.emit('globaluserstate', eventData);

      return;
    }
  }

  _connectInNode(): Promise<void> {
    const host = 'irc.chat.twitch.tv';
    const port = this.options.secure ? 6697 : 6667;

    return new Promise<void>((resolve, reject) => {
      this._connecting = true;

      const handleConnect = () => {
        this._connecting = false;
        this._connected = true;
        this.emit('connect');
        resolve();
      };

      if (this.options.secure) {
        this.socket = tls.connect(port, host, {}, handleConnect);
      } else {
        this.socket = new Socket();
        this.socket.connect(port, host, handleConnect);
      }

      this.socket.on('error', (error: Error) => {
        this._connected = false;
        this._connecting = false;
        this.emit('disconnect', error);
        reject(error);
      });
      this.socket.on('data', (data: Buffer) => {
        this.receiveRaw(data.toString());
      });
      this.socket.on('close', () => {
        this._connected = false;
        this._connecting = false;
        this._registered = false;
        this.emit('disconnect');
      });
    });
  }

  _connectInBrowser(): Promise<void> {
    const url = this.options.secure
      ? 'wss://irc-ws.chat.twitch.tv:443'
      : 'ws://irc-ws.chat.twitch.tv:80';

    return new Promise<void>((resolve, reject) => {
      this._connecting = true;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this._connected = true;
        this._connecting = false;
        this.emit('connect');
        resolve();
      };
      this.socket.onmessage = ({ data }) => this.receiveRaw(data);
      this.socket.onerror = () => {};
      this.socket.onclose = ({ wasClean, code, reason }) => {
        this.socket = null;
        this._connected = false;
        this._connecting = false;
        this._registered = false;

        if (wasClean) {
          this.emit('disconnect');
        } else {
          const error = new Error(`[${code}] ${reason}`);
          this.emit('disconnect', error);
          reject(error);
        }
      };
    });
  }

  _register(): Promise<void> {
    if (!this._connected) return Promise.reject();
    if (this._registered) return Promise.resolve();

    const { name, auth } = this.options;

    const nick = name || getRandomUsername();
    const pass = auth ? `oauth:${auth}` : 'SCHMOOPIIE';

    this.sendRaw('CAP REQ :twitch.tv/tags twitch.tv/commands');
    this.sendRaw(`PASS ${pass}`);
    this.sendRaw(`NICK ${nick}`);

    return new Promise<void>((resolve, reject) => {
      const handleRegister = () => {
        resolve();
        this.off('register', handleRegister);
      };

      this.on('register', handleRegister);

      setTimeout(() => {
        reject();
        this.off('register', handleRegister);
      }, 10000);
    });
  }

  _updateGlobalUserState(globalUserState: GlobalUserStateTags) {
    this.globalUserState = { ...this.globalUserState, ...globalUserState };
  }

  _updateUserState(channel: string, userState: UserStateTags) {
    this.channels = {
      ...this.channels,
      [channel]: {
        ...this.channels[channel],
        userState,
      },
    };
  }

  _updateRoomState(channel: string, roomState: RoomStateTags) {
    this.channels = {
      ...this.channels,
      [channel]: {
        ...this.channels[channel],
        roomState,
      },
    };
  }

  get connected() {
    return this._connected;
  }

  get connecting() {
    return this._connecting;
  }

  get registered() {
    return this._registered;
  }
}

export default Client;
