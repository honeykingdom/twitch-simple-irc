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
  PongEvent,
} from './types';
import { getChannelFromMessage, getRandomUsername } from './utils';
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

const REGISTER_RESPONSE_TIMEOUT = 2000;
const PING_RESPONSE_TIMEOUT = 2000;
const PING_TIMEOUT = 5 * 60 * 1000; // 5 min
const RECONNECT_BASE_INTERVAL = 1000;
const MAX_RECONNECT_INTERVAL = 60 * 1000; // 1 min

interface IConnection {
  secure: boolean;
  reconnect: boolean;
}

interface ConnectionTypeTcp extends IConnection {
  type: 'tcp';
  host: string;
  port: number;
  socket: Socket | null;
}

interface ConnectionTypeWs extends IConnection {
  type: 'ws';
  url: string;
  secure: boolean;
  socket: WebSocket | null;
}

type Connection = ConnectionTypeTcp | ConnectionTypeWs;

interface ClientOptions {
  name?: string;
  auth?: string;
  reconnect?: boolean;
  connection?:
    | {
        type: 'tcp';
        host?: string;
        port?: number;
        secure?: boolean;
        reconnect?: boolean;
      }
    | {
        type: 'ws';
        url?: string;
        secure?: boolean;
        reconnect?: boolean;
      };
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
  on(event: 'disconnect', listener: (error: Error) => void): this;
  on(event: '_disconnect', listener: (error: Error) => void): this;
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
  on(event: 'pong', listener: Listener<PongEvent>): this;
  on(event: 'error', listener: (error: Error) => void): this;

  emit(event: 'connect'): boolean;
  emit(event: 'disconnect', error: Error): boolean;
  emit(event: '_disconnect', error: Error): boolean;
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
  emit(event: 'pong', data: PongEvent): boolean;
  emit(event: 'error', error: Error): boolean;
}

export class Client extends EventEmitter {
  private name: string;
  private auth: string;
  private connection: Connection;

  globalUserState: GlobalUserStateTags | null = null;
  channels: Channels = {};

  connected = false;
  connecting = false;
  registered = false;

  private reconnecting = false;
  private reconnectInterval = RECONNECT_BASE_INTERVAL;
  private pingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: ClientOptions | null | undefined = {}) {
    super();

    this.name = options?.name || getRandomUsername();
    this.auth = options?.auth ? `oauth:${options.auth}` : 'SCHMOOPIIE';

    const { secure = true, reconnect = true } = options?.connection || {};

    if (options?.connection?.type === 'tcp') {
      this.connection = {
        type: 'tcp',
        host: options?.connection?.host || 'irc.chat.twitch.tv',
        port: options?.connection?.port || (secure ? 6697 : 6667),
        secure,
        reconnect,
        socket: null,
      };
    } else {
      this.connection = {
        type: 'ws',
        url:
          (options?.connection as ConnectionTypeWs)?.url ||
          (secure
            ? 'wss://irc-ws.chat.twitch.tv:443'
            : 'ws://irc-ws.chat.twitch.tv:80'),
        secure,
        reconnect,
        socket: null,
      };
    }
  }

  static create(options: Partial<ClientOptions> | null | undefined = {}) {
    return new Client(options);
  }

  async connect(): Promise<void> {
    const connection =
      this.connection.type === 'tcp'
        ? this.connectTcp(this.connection)
        : this.connectWs(this.connection);

    await connection;

    this.once('_disconnect', (error) => {
      this.clearAfterDisconnect();
      this.emit('disconnect', error);

      if (this.connection.reconnect) {
        this.reconnect();
      }
    });

    return this.register();
  }

  clearAfterDisconnect() {
    if (this.connection.type === 'tcp') {
      this.connection.socket?.destroy();
    } else {
      this.connection.socket?.close();
    }

    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
    }

    this.connection.socket = null;
    this.connected = false;
    this.connecting = false;
    this.registered = false;
    this.reconnecting = false;
    this.pingTimeout = null;
  }

  private reconnect() {
    if (this.connected || this.reconnecting) return;

    const interval = Math.min(MAX_RECONNECT_INTERVAL, this.reconnectInterval);

    setTimeout(async () => {
      this.reconnecting = true;

      try {
        await this.connect();
      } catch {}

      this.reconnecting = false;

      if (this.connected && this.registered) {
        this.reconnectInterval = RECONNECT_BASE_INTERVAL;

        Object.keys(this.channels).map((channel) => this.join(channel));
      } else {
        this.reconnectInterval *= 2;
        this.clearAfterDisconnect();
        this.reconnect();
      }
    }, interval);
  }

  private connectTcp({ host, port }: ConnectionTypeTcp): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.connecting = true;

      const handleConnect = () => {
        this.connecting = false;
        this.connected = true;
        this.emit('connect');
        resolve();
      };

      if (this.connection.secure) {
        this.connection.socket = tls.connect(port, host, {}, handleConnect);
      } else {
        this.connection.socket = new Socket();
        this.connection.socket.connect(port, host, handleConnect);
      }

      this.connection.socket.on('error', (error: Error) => {
        reject(error);

        this.emit('_disconnect', error);
      });

      this.connection.socket.on('data', (data: Buffer) => {
        this.receiveRaw(data.toString());
      });
    });
  }

  private connectWs({ url }: ConnectionTypeWs): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.connecting = true;

      this.connection.socket = new WebSocket(url);

      this.connection.socket.onopen = () => {
        this.connected = true;
        this.connecting = false;
        this.emit('connect');
        resolve();
      };

      this.connection.socket.onmessage = ({ data }) => this.receiveRaw(data);

      this.connection.socket.onerror = () => {};

      this.connection.socket.onclose = ({ code, reason }) => {
        const error = Error(`[${code}] ${reason}`);

        reject(error);

        this.emit('_disconnect', error);
      };
    });
  }

  private register(): Promise<void> {
    if (!this.connected) return Promise.reject();
    if (this.registered) return Promise.resolve();

    this.sendRaw('CAP REQ :twitch.tv/tags twitch.tv/commands');
    this.sendRaw(`PASS ${this.auth}`);
    this.sendRaw(`NICK ${this.name}`);

    return new Promise<void>((resolve, reject) => {
      const handleRegister = () => {
        resolve();
        this.setPingTimeout();
        this.off('register', handleRegister);
      };

      this.on('register', handleRegister);

      setTimeout(() => {
        reject();
        this.off('register', handleRegister);
      }, REGISTER_RESPONSE_TIMEOUT);
    });
  }

  private sendPing(): Promise<boolean> {
    return new Promise((resolve) => {
      const handlePong = () => {
        resolve(true);
        this.off('pong', handlePong);
      };

      this.on('pong', handlePong);

      setTimeout(() => {
        resolve(false);
        this.off('pong', handlePong);
      }, PING_RESPONSE_TIMEOUT);

      this.sendRaw('PING');
    });
  }

  private async setPingTimeout() {
    const makePingTimeout = () =>
      setTimeout(() => {
        this.setPingTimeout();
      }, PING_TIMEOUT);

    if (this.pingTimeout === null) {
      this.pingTimeout = makePingTimeout();

      return;
    }

    const pongReceived = await this.sendPing();

    if (pongReceived) {
      this.pingTimeout = makePingTimeout();
    } else {
      this.emit('_disconnect', Error('Server did not PONG back'));
    }
  }

  private receiveRaw(rawData: string) {
    const data = rawData.trim().split('\r\n');

    data.forEach((line) => this.handleMessage(line));
  }

  sendRaw(message: string): boolean {
    if (this.connection.socket === null || !message) {
      return false;
    }

    if (this.connection.type === 'tcp') {
      this.connection.socket.write(`${message}\r\n`);
    } else {
      this.connection.socket.send(message);
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

  join(channel: string): Promise<boolean> {
    if (!this.registered) return Promise.reject();

    const ircMessage = tekko.format({
      command: Commands.JOIN,
      middle: [`#${channel}`],
    });

    this.sendRaw(ircMessage);

    return new Promise((resolve) => {
      const handleJoin = (joinEvent: JoinEvent) => {
        if (joinEvent.channel === channel) {
          resolve(true);
          this.off('join', handleJoin);
        }
      };

      this.on('join', handleJoin);

      setTimeout(() => {
        resolve(false);
        this.off('join', handleJoin);
      }, 2000);
    });
  }

  part(channel: string): Promise<boolean> {
    if (!this.registered) return Promise.resolve(false);

    const ircMessage = tekko.format({
      command: Commands.PART,
      middle: [`#${channel}`],
    });

    this.sendRaw(ircMessage);

    return new Promise((resolve) => {
      const handlePart = (partEvent: PartEvent) => {
        if (partEvent.channel === channel) {
          resolve(true);
          this.off('part', handlePart);
        }
      };

      this.on('join', handlePart);

      setTimeout(() => {
        resolve(false);
        this.off('join', handlePart);
      }, 2000);
    });
  }

  private handleMessage(raw: string) {
    const data: TekkoMessage = tekko.parse(raw) as TekkoMessage;
    data.raw = raw;
    const { command } = data;

    if (command === Commands.PING) {
      this.sendRaw(`${Commands.PONG} :tmi.twitch.tv`);
      this.emit('ping', { raw });

      return;
    }

    if (command === Commands.PONG) {
      this.emit('pong', { raw });

      return;
    }

    if (command === Commands.REPLY001) {
      this.name = data.middle[0];
      this.registered = true;

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

      this.updateUserState(channel, eventData.tags);
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

      this.updateRoomState(channel, eventData.tags);
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

      this.updateGlobalUserState(eventData.tags);
      this.emit('globaluserstate', eventData);

      return;
    }
  }

  private updateGlobalUserState(globalUserState: GlobalUserStateTags) {
    this.globalUserState = { ...this.globalUserState, ...globalUserState };
  }

  private updateUserState(channel: string, userState: UserStateTags) {
    this.channels = {
      ...this.channels,
      [channel]: {
        ...this.channels[channel],
        userState,
      },
    };
  }

  private updateRoomState(channel: string, roomState: RoomStateTags) {
    this.channels = {
      ...this.channels,
      [channel]: {
        ...this.channels[channel],
        roomState,
      },
    };
  }
}

export default Client;
