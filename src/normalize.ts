import tekko from 'tekko';

import {
  TekkoMessage,
  GlobalUserStateEvent,
  GlobalUserStateTags,
  MessageEvent,
  MessageTags,
  WhisperEvent,
  WhisperTags,
} from './types';
import {
  getIsAction,
  normalizeActionMessage,
  getChannelFromMessage,
} from './utils';
import { parseMessageTags } from './parse';

export const normalizeChatMessage = (data: TekkoMessage): MessageEvent => {
  const { raw, trailing, tags, prefix } = data;
  const { name } = prefix as tekko.MessagePrefix;
  const isAction = getIsAction(trailing);

  return {
    raw,
    message: isAction ? normalizeActionMessage(trailing) : trailing,
    channel: getChannelFromMessage(data),
    user: name,
    get tags() {
      return (parseMessageTags(tags) as unknown) as MessageTags;
    },
    isAction,
  };
};

export const normalizeGlobalUserState = ({
  raw,
  tags,
}: TekkoMessage): GlobalUserStateEvent => ({
  raw,
  get tags() {
    return parseMessageTags(tags) as GlobalUserStateTags;
  },
});

export const normalizeState = (data: TekkoMessage) => {
  const { raw, tags } = data;

  return {
    raw,
    channel: getChannelFromMessage(data),
    get tags() {
      return parseMessageTags(tags);
    },
  };
};

export const normalizeCommand = (data: TekkoMessage) => {
  const { raw, trailing, tags } = data;

  return {
    raw,
    message: trailing,
    channel: getChannelFromMessage(data),
    get tags() {
      return parseMessageTags(tags);
    },
  };
};

export const normalizeWhisper = ({
  raw,
  trailing,
  tags,
  prefix,
  middle: [channel],
}: TekkoMessage): WhisperEvent => {
  const { name } = prefix as tekko.MessagePrefix;

  return {
    raw,
    message: trailing,
    channel,
    user: name,
    get tags() {
      return (parseMessageTags(tags) as unknown) as WhisperTags;
    },
  };
};
