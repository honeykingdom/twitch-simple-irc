/// <reference types="node" />
import { Socket } from 'net';
import { EventEmitter } from 'events';
import { MessageEvent, GlobalUserStateEvent, GlobalUserStateTags, UserStateEvent, UserStateTags, RoomStateEvent, RoomStateTags, ClearChatEvent, ClearMessageEvent, HostTargetEvent, NoticeEvent, UserNoticeEvent, WhisperEvent, JoinEvent, PartEvent, PingEvent } from './types';
export declare enum Commands {
    REPLY001 = "001",
    PING = "PING",
    PONG = "PONG",
    JOIN = "JOIN",
    PART = "PART",
    PRIVMSG = "PRIVMSG",
    NOTICE = "NOTICE",
    USERNOTICE = "USERNOTICE",
    GLOBALUSERSTATE = "GLOBALUSERSTATE",
    USERSTATE = "USERSTATE",
    ROOMSTATE = "ROOMSTATE",
    CLEARCHAT = "CLEARCHAT",
    CLEARMSG = "CLEARMSG",
    HOSTTARGET = "HOSTTARGET",
    WHISPER = "WHISPER"
}
interface ClientOptions {
    name?: string;
    auth?: string;
    secure?: boolean;
    reconnect?: boolean;
}
interface Channels {
    [channel: string]: {
        userState: UserStateTags;
        roomState: RoomStateTags;
    };
}
declare type Listener<T> = (data: T) => void;
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
export declare class Client extends EventEmitter {
    socket: WebSocket | Socket | null;
    options: ClientOptions;
    globalUserState: GlobalUserStateTags | null;
    channels: Channels;
    private _connected;
    private _connecting;
    private _registered;
    private _reconnectInterval;
    constructor(options?: ClientOptions | null | undefined);
    connect(): Promise<void>;
    disconnect(): void;
    reconnect(): void;
    receiveRaw(rawData: string): void;
    sendRaw(message: string): boolean;
    say(channel: string, message: string): boolean;
    sendCommand(channel: string, command: string, params?: string | Array<string>): boolean;
    join(channel: string): boolean;
    part(channel: string): boolean;
    _handleMessage(raw: string): void;
    _connectInNode(): Promise<void>;
    _connectInBrowser(): Promise<void>;
    _register(): Promise<void>;
    _updateGlobalUserState(globalUserState: GlobalUserStateTags): void;
    _updateUserState(channel: string, userState: UserStateTags): void;
    _updateRoomState(channel: string, roomState: RoomStateTags): void;
    get connected(): boolean;
    get connecting(): boolean;
    get registered(): boolean;
}
export default Client;
