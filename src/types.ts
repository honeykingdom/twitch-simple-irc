import tekko from 'tekko';

export interface TekkoMessage extends tekko.Message {
  raw: string;
}

export interface Emotes {
  [emoteId: string]: Array<{ start: number; end: number }>;
}

export interface BadgeInfo {
  /**
   * The exact number of months the user has been a subscriber.
   */
  subscriber?: number;
}

export interface Badges {
  admin?: string;
  bits?: string;
  broadcaster?: string;
  global_mod?: string;
  moderator?: string;
  subscriber?: string;
  staff?: string;
  turbo?: string;
}

export type TagType = string | boolean | number | Emotes | BadgeInfo | Badges;

export interface Tags {
  [key: string]: TagType;
}

interface ATags {
  /**
   * Metadata related to the chat badges in the `badges` tag.
   */
  badgeInfo: BadgeInfo;

  /**
   * List of chat badges and the version of each badge.
   * Many badges have only 1 version, but some badges have different versions (images), depending on how long you hold the badge status; e.g., `subscriber`.
   */
  badges: Badges;

  /**
   * Hexadecimal RGB color code; the empty string if it is never set.
   */
  color: string;

  /**
   * The user’s display name, escaped as described in the IRCv3 spec. This is empty if it is never set.
   */
  displayName: string;

  /**
   * Your emote set, a comma-separated list of emote sets.
   */
  emoteSets: string;

  /**
   * Information to replace text in the message with emote images. This can be empty.
   */
  emotes: Emotes;

  /**
   * A unique ID for the message.
   */
  id: string;

  /**
   * `true` if the user has a moderator badge; otherwise, `false`.
   */
  mod: boolean;

  /**
   * The channel ID.
   */
  roomId: string;

  /**
   * Timestamp when the server received the message.
   */
  tmiSentTs: number;

  /**
   * The user’s ID.
   */
  userId: string;
}

export interface MessageTags
  extends Pick<
    ATags,
    | 'badgeInfo'
    | 'badges'
    | 'color'
    | 'displayName'
    | 'emotes'
    | 'id'
    | 'mod'
    | 'roomId'
    | 'tmiSentTs'
    | 'userId'
  > {
  /**
   * (Sent only for Bits messages) The amount of cheer/Bits employed by the user.
   */
  bits?: number;
}

/**
 * Sends a message to a channel.
 */
export interface MessageEvent {
  raw: string;
  message: string;
  channel: string;
  user: string;
  tags: MessageTags;
  isAction: boolean;
}

export type GlobalUserStateTags = Pick<
  ATags,
  'badgeInfo' | 'badges' | 'color' | 'displayName' | 'emoteSets' | 'userId'
>;

/**
 * On successful login, provides data about the current logged-in user through IRC tags.
 * It is sent after successfully authenticating (sending a PASS/NICK command).
 */
export interface GlobalUserStateEvent {
  raw: string;
  tags: GlobalUserStateTags;
}

export type UserStateTags = Pick<
  ATags,
  'badgeInfo' | 'badges' | 'color' | 'displayName' | 'emoteSets' | 'mod'
>;

/**
 * Sends user-state data when a user joins a channel or sends a PRIVMSG to a channel.
 */
export interface UserStateEvent {
  raw: string;
  channel: string;
  tags: UserStateTags;
}

export interface RoomStateTags extends Pick<ATags, 'roomId'> {
  /**
   * Emote-only mode. If enabled, only emotes are allowed in chat.
   */
  emoteOnly?: boolean;

  /**
   * Followers-only mode. If enabled, controls which followers can chat.
   * Valid values:
   * -1 (disabled),
   * false (all followers can chat),
   * non-negative integer (only users following for at least the specified number of minutes can chat).
   */
  followersOnly?: boolean | number;

  /**
   * R9K mode. If enabled, messages with more than 9 characters must be unique.
   */
  r9k?: boolean;

  /**
   * (Not documented)
   */
  rituals?: boolean;

  /**
   * The number of seconds a chatter without moderator privileges must wait between sending messages.
   */
  slow?: boolean | number;

  /**
   * Subscribers-only mode. If enabled, only subscribers and moderators can chat.
   */
  subsOnly?: boolean;
}

/**
 * Sends room-state data when a user joins a channel or a room setting is changed.
 * For a join, the message contains all chat-room settings.
 * For changes, only the relevant tag is sent.
 */
export interface RoomStateEvent {
  raw: string;
  channel: string;
  tags: RoomStateTags;
}

/**
 * Purges all chat messages in a channel, or purges chat messages from a specific user (typically after a timeout or ban).
 */
export interface ClearChatEvent {
  raw: string;
  message: string;
  channel: string;
  tags: {
    /**
     * Duration of the timeout, in seconds. If omitted, the ban is permanent.
     */
    banDuration?: number;

    /**
     * (Not documented)
     */
    roomId: string;

    /**
     * (Not documented)
     */
    targetUserId?: string;

    /**
     * (Not documented)
     */
    tmiSentTs: number;
  };
}

/**
 * Removes a single message from a channel. This is triggered by the `/delete <targetMsgId>` command on IRC.
 */
export interface ClearMessageEvent {
  raw: string;
  message: string;
  channel: string;
  tags: {
    /**
     * Name of the user who sent the message.
     */
    login: string;

    /**
     * UUID of the message.
     */
    targetMsgId: string;

    /**
     * (Not documented)
     */
    tmiSentTs: number;
  };
}

/**
 * Channel starts or stops host mode.
 */
export interface HostTargetEvent {
  raw: string;
  message: string;
  channel: string;
  tags: {};
}

/**
 * General notices from the server.
 */
export interface NoticeEvent {
  raw: string;
  message: string;
  channel: string;
  tags: {
    /**
     * A message ID string. Can be used for i18ln.
     * Valid values: see https://dev.twitch.tv/docs/irc/msg-id
     */
    msgId: string;
  };
}

export enum UserNoticeType {
  sub = 'sub',
  resub = 'resub',
  subgift = 'subgift',
  anonsubgift = 'anonsubgift',
  submysterygift = 'submysterygift',
  giftpaidupgrade = 'giftpaidupgrade',
  rewardgift = 'rewardgift',
  anongiftpaidupgrade = 'anongiftpaidupgrade',
  raid = 'raid',
  unraid = 'unraid',
  ritual = 'ritual',
  bitsbadgetier = 'bitsbadgetier',
}

interface AUserNoticeTags {
  /**
   * (Sent only on sub, resub) The total number of months the user has subscribed.
   * This is the same as msg-param-months but sent for different types of user notices.
   */
  msgParamCumulativeMonths: number;

  /**
   * (Sent only on raid) The display name of the source user raiding this channel.
   */
  msgParamDisplayName: string;

  /**
   * (Sent on only raid) The name of the source user raiding this channel.
   */
  msgParamLogin: string;

  /**
   * (Sent only on subgift, anonsubgift) The total number of months the user has subscribed.
   * This is the same as msg-param-cumulative-months but sent for different types of user notices.
   */
  msgParamMonths: number;

  /**
   * (Sent only on anongiftpaidupgrade, giftpaidupgrade) The number of gifts the gifter has given during the promo indicated by msg-param-promo-name.
   */
  msgParamPromoGiftTotal: number;

  /**
   * (Sent only on anongiftpaidupgrade, giftpaidupgrade) The subscriptions promo, if any, that is ongoing; e.g. Subtember 2018.
   */
  msgParamPromoName: string;

  /**
   * (Sent only on subgift, anonsubgift) The display name of the subscription gift recipient.
   */
  msgParamRecipientDisplayName: string;

  /**
   * (Sent only on subgift, anonsubgift) The user ID of the subscription gift recipient.
   */
  msgParamRecipientId: string;

  /**
   * (Sent only on subgift, anonsubgift) The user name of the subscription gift recipient.
   */
  msgParamRecipientUserName: string;

  /**
   * (Sent only on giftpaidupgrade) The login of the user who gifted the subscription.
   */
  msgParamSenderLogin: string;

  /**
   * (Sent only on giftpaidupgrade) The display name of the user who gifted the subscription.
   */
  msgParamSenderName: string;

  /**
   * (Sent only on sub, resub) Boolean indicating whether users want their streaks to be shared.
   */
  msgParamShouldShareStreak: boolean;

  /**
   * (Sent only on sub, resub) The number of consecutive months the user has subscribed. This is 0 if msg-param-should-share-streak is 0.
   */
  msgParamStreakMonths: number;

  /**
   * (Sent only on sub, resub, subgift, anonsubgift) The type of subscription plan being used.
   * Valid values: Prime, 1000, 2000, 3000. 1000, 2000, and 3000 refer to the first, second, and third levels of paid subscriptions, respectively (currently $4.99, $9.99, and $24.99).
   */
  msgParamSubPlan: string;

  /**
   * (Sent only on sub, resub, subgift, anonsubgift) The display name of the subscription plan.
   * This may be a default name or one created by the channel owner.
   */
  msgParamSubPlanName: string;

  /**
   * (Sent only on raid) The number of viewers watching the source channel raiding this channel.
   */
  msgParamViewerCount: number;

  /**
   * (Sent only on ritual) The name of the ritual this notice is for. Valid value: new_chatter.
   */
  msgParamRitualName: string;

  /**
   * (Sent only on bitsbadgetier) The tier of the bits badge the user just earned; e.g. 100, 1000, 10000.
   */
  msgParamThreshold: number;
}

interface ABaseUserNoticeTags
  extends Pick<
    ATags,
    | 'badgeInfo'
    | 'badges'
    | 'color'
    | 'displayName'
    | 'emotes'
    | 'id'
    | 'mod'
    | 'roomId'
    | 'tmiSentTs'
    | 'userId'
  > {
  /**
   * The name of the user who sent the notice.
   */
  login: string;

  /**
   * The message printed in chat along with this notice.
   */
  systemMsg: string;
}

interface UserNoticeTagsSub
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      | 'msgParamCumulativeMonths'
      | 'msgParamShouldShareStreak'
      | 'msgParamStreakMonths'
      | 'msgParamSubPlan'
      | 'msgParamSubPlanName'
    > {
  /**
   * The type of notice (not the ID).
   */
  msgId: 'sub';
}

interface UserNoticeTagsResub
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      | 'msgParamCumulativeMonths'
      | 'msgParamShouldShareStreak'
      | 'msgParamStreakMonths'
      | 'msgParamSubPlan'
      | 'msgParamSubPlanName'
    > {
  msgId: 'resub';
}

interface UserNoticeTagsSubGift
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      | 'msgParamMonths'
      | 'msgParamRecipientDisplayName'
      | 'msgParamRecipientId'
      | 'msgParamRecipientUserName'
      | 'msgParamSubPlan'
      | 'msgParamSubPlanName'
    > {
  msgId: 'subgift';
}

interface UserNoticeTagsAnonSubGift
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      | 'msgParamMonths'
      | 'msgParamRecipientDisplayName'
      | 'msgParamRecipientId'
      | 'msgParamRecipientUserName'
      | 'msgParamSubPlan'
      | 'msgParamSubPlanName'
    > {
  msgId: 'anonsubgift';
}

interface UserNoticeTagsSubMysteryGift extends ABaseUserNoticeTags {
  msgId: 'submysterygift';
}

interface UserNoticeTagsGiftPaidUpgrade
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      | 'msgParamPromoGiftTotal'
      | 'msgParamPromoName'
      | 'msgParamSenderLogin'
      | 'msgParamSenderName'
    > {
  msgId: 'giftpaidupgrade';
}

interface UserNoticeTagsAnonGiftPaidUpgrade
  extends ABaseUserNoticeTags,
    Pick<AUserNoticeTags, 'msgParamPromoGiftTotal' | 'msgParamPromoName'> {
  msgId: 'anongiftpaidupgrade';
}

interface UserNoticeTagsRewardGift extends ABaseUserNoticeTags {
  msgId: 'rewardgift';
}

interface UserNoticeTagsRaid
  extends ABaseUserNoticeTags,
    Pick<
      AUserNoticeTags,
      'msgParamDisplayName' | 'msgParamLogin' | 'msgParamViewerCount'
    > {
  msgId: 'raid';
}

interface UserNoticeTagsUnraid extends ABaseUserNoticeTags {
  msgId: 'unraid';
}

interface UserNoticeTagsRitual
  extends ABaseUserNoticeTags,
    Pick<AUserNoticeTags, 'msgParamRitualName'> {
  msgId: 'ritual';
}

interface UserNoticeTagsBitsBadGetier
  extends ABaseUserNoticeTags,
    Pick<AUserNoticeTags, 'msgParamThreshold'> {
  msgId: 'bitsbadgetier';
}

type UserNoticeTags =
  | UserNoticeTagsSub
  | UserNoticeTagsResub
  | UserNoticeTagsSubGift
  | UserNoticeTagsAnonSubGift
  | UserNoticeTagsSubMysteryGift
  | UserNoticeTagsGiftPaidUpgrade
  | UserNoticeTagsAnonGiftPaidUpgrade
  | UserNoticeTagsRewardGift
  | UserNoticeTagsRaid
  | UserNoticeTagsUnraid
  | UserNoticeTagsRitual
  | UserNoticeTagsBitsBadGetier;

/**
 * Sends a notice to the user when any of the following events occurs:
 * - Subscription, resubscription, or gift subscription to a channel.
 * - Incoming raid to a channel.
 *   Raid is a Twitch tool that allows broadcasters to send their viewers to another channel, to help support and grow other members in the community.
 * - Channel ritual.
 *   Many channels have special rituals to celebrate viewer milestones when they are shared.
 *   The rituals notice extends the sharing of these messages to other viewer milestones (initially, a new viewer chatting for the first time).
 */
export interface UserNoticeEvent {
  raw: string;
  /**
   * The message. This is omitted if the user did not enter a message.
   */
  message: string;
  channel: string;
  tags: UserNoticeTags;
}

export interface WhisperTags
  extends Pick<
    ATags,
    'badges' | 'color' | 'displayName' | 'emotes' | 'userId'
  > {
  /**
   * (Not documented)
   */
  messageId: string;

  /**
   * (Not documented)
   */
  threadId: string;
}

/**
 * (Not documented)
 */
export interface WhisperEvent {
  raw: string;
  message: string;
  channel: string;
  user: string;
  tags: WhisperTags;
}

export interface PingEvent {
  raw: string;
}

/**
 * Join a channel.
 */
export interface JoinEvent {
  raw: string;
  channel: string;
  user: string;
}

/**
 * Depart from a channel.
 */
export interface PartEvent {
  raw: string;
  channel: string;
  user: string;
}
