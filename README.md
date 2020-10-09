# Twitch Simple IRC

Simple Twitch Chat Client

## Getting Started

`npm i github:honeykingdom/twitch-simple-irc`

`yarn add github:honeykingdom/twitch-simple-irc`

## Basic Usage

```javascript
import twitchIrc from 'twitch-simple-irc';

const main = async () => {
  const client = twitchIrc.Client.create({
    name: 'username',
    auth: 'authToken',
    connection: {
      type: 'ws', // or 'tcp'
      secure: true,
      reconnect: true,
    },
  });

  client.on('message', (data) => {
    console.log(data);
  });

  try {
    await client.connect();
  } catch (error) {
    console.log(error);
  }

  await client.join('forsen');

  client.say('Hello world!');
};

main();
```
