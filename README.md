# Twitch Simple IRC

Simple Twitch Chat Client

## Getting Started

`npm i github:honeykingdom/twitch-simple-irc`

`yarn add github:honeykingdom/twitch-simple-irc`

## Basic Usage

```javascript
import { Client } from 'twitch-simple-irc';

const client = new Client(/* options */);

client.on('message', (data) => {
  console.log(data);
});

const main = async () => {
  await client.connect();

  client.join('forsen');
};

main();
```
