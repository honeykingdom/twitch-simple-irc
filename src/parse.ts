import tekko from 'tekko';
import { Emotes, BadgeInfo, Badges, TagType, Tags } from './types';

const booleanMessageTags = [
  'mod',
  'emote-only',
  'r9k',
  'rituals',
  'subs-only',
  'msg-param-should-share-streak',
];

const numberMessageTags = [
  'tmi-sent-ts',
  'bits',
  'ban-duration',
  'msg-param-cumulative-months',
  'msg-param-months',
  'msg-param-promo-gift-total',
  'msg-param-streak-months',
  'msg-param-viewerCount',
  'msg-param-threshold',
];

const tagNamesMap: { [key: string]: string } = {
  'badge-info': 'badgeInfo',
  'display-name': 'displayName',
  'emote-sets': 'emoteSets',
  'room-id': 'roomId',
  'tmi-sent-ts': 'tmiSendTs',
  'user-id': 'userId',
  'target-msg-id': 'targetMsgId',
  'msg-id': 'msgId',
  'system-msg': 'systemMsg',
  'emote-only': 'emoteOnly',
  'followers-only': 'followersOnly',
  'subs-only': 'subsOnly',
  'ban-duration': 'banDuration',
  'message-id': 'messageId',
  'thread-id': 'threadId',
  'msg-param-cumulative-months': 'msgParamСumulativeMonths',
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
  'msg-param-threshold': 'msgParamThreshold',
};

const depricatedMessageTags = ['subscriber', 'turbo', 'user-type'];

const parseMessageEmotes = (raw: string = ''): Emotes => {
  if (!raw) return {};

  return raw.split('/').reduce((acc, emote) => {
    const [id, indexes] = emote.split(':');

    return {
      ...acc,
      [id]: indexes.split(',').map((index) => {
        const [start, end] = index.split('-');

        return {
          start: Number.parseInt(start, 10),
          end: Number.parseInt(end, 10),
        };
      }),
    };
  }, {});
};

const parseBadges = (data: string = ''): BadgeInfo | Badges => {
  if (!data) return {};

  return data.split(',').reduce((acc, badge) => {
    const [name, value] = badge.split('/');

    return {
      ...acc,
      [name]: value,
    };
  }, {});
};

const normalizeTagValue = (name: string, value: string): TagType => {
  if (name === 'emotes') return parseMessageEmotes(value);
  if (name === 'badges') return parseBadges(value);
  if (name === 'badge-info') return parseBadges(value);

  if (name === 'followers-only') {
    let followersOnly: boolean | number = false;
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
    let slow: boolean | number = false;
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

export const parseMessageTags = (data?: tekko.MessageTags): Tags => {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (depricatedMessageTags.includes(key)) {
      return acc;
    }

    const newKey = tagNamesMap[key] || key;

    return {
      ...acc,
      [newKey]: normalizeTagValue(key, value as string),
    };
  }, {});
};
