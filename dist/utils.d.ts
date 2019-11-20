import tekko from 'tekko';
export declare const getRandomUsername: () => string;
export declare const getIsAction: (message: string) => boolean;
export declare const normalizeActionMessage: (message: string) => string;
export declare const getChannelFromMessage: (message: tekko.Message) => string;
export declare const isNode: boolean;
