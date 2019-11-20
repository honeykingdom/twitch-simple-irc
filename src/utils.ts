import tekko from 'tekko';

export const getRandomUsername = (): string => {
  const randomSuffix = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `justinfan${randomSuffix}`;
};

export const getIsAction = (message: string): boolean =>
  message.startsWith('\u0001ACTION ') && message.endsWith('\u0001');

export const normalizeActionMessage = (message: string): string =>
  message.slice(8, -1);

export const getChannelFromMessage = (message: tekko.Message): string =>
  message.middle[0].slice(1);

export const isNode = !!(
  typeof process !== 'undefined' &&
  process.versions &&
  process.versions.node
);
