import tekko from 'tekko';
import { TagType } from './types';
export declare const parseMessageTags: (data?: tekko.MessageTags | undefined) => Record<string, TagType>;
