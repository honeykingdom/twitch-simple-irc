import { TekkoMessage, GlobalUserStateEvent, MessageEvent, WhisperEvent } from './types';
export declare const normalizeChatMessage: (data: TekkoMessage) => MessageEvent;
export declare const normalizeGlobalUserState: ({ raw, tags, }: TekkoMessage) => GlobalUserStateEvent;
export declare const normalizeState: (data: TekkoMessage) => {
    raw: string;
    channel: string;
    readonly tags: import("./types").Tags;
};
export declare const normalizeCommand: (data: TekkoMessage) => {
    raw: string;
    message: string;
    channel: string;
    readonly tags: import("./types").Tags;
};
export declare const normalizeWhisper: ({ raw, trailing, tags, prefix, middle: [channel], }: TekkoMessage) => WhisperEvent;
