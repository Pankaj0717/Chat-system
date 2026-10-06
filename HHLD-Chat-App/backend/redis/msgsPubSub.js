import dotenv from "dotenv"
dotenv.config()

import Redis from 'ioredis'

const redisPort = process.env.REDIS_PORT
  ? Number(process.env.REDIS_PORT)
  : 6379;
const redisTlsSetting = process.env.REDIS_TLS?.toLowerCase();

if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
  throw new Error('REDIS_PORT must be a valid TCP port');
}
if (redisTlsSetting && !['true', 'false'].includes(redisTlsSetting)) {
  throw new Error('REDIS_TLS must be either "true" or "false"');
}

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: redisPort,
  ...(process.env.REDIS_PWD ? { password: process.env.REDIS_PWD } : {}),
  ...(process.env.REDIS_USER ? { username: process.env.REDIS_USER } : {}),
  ...(redisTlsSetting === 'false' ? {} : { tls: {} })
};

const subscriber = new Redis(redisOptions);
const publisher = new Redis(redisOptions);

subscriber.on('error', (error) => {
  console.error('Redis subscriber error:', error.message);
});
publisher.on('error', (error) => {
  console.error('Redis publisher error:', error.message);
});

// When a message is published to a specific channel, 
// all subscribers that are listening to that channel 
// receive a copy of the message. 
// Channels provide a way to categorize messages and allow 
// subscribers to selectively listen for messages they are interested in.


export function subscribe(channel, callback) {
  subscriber.subscribe(channel, (err, count) => {
    if (err) {
      console.log('Error subscribing to channel:', err);
      return;
    } 
    console.log(`Subscribed to ${channel}`);
  });


  // When a message is received on any subscribed channel,
  // it checks if the channel matches the specified channel and
  // calls the provided callback function with the received message

  subscriber.on('message', (subscribedChannel, message) => {
    if (subscribedChannel === channel) {
      callback(message);
    }
  });
}


// Function to unsubscribe from a Redis channel
export function unsubscribe(channel) {
  subscriber.unsubscribe(channel, (err, count) => {
    if (err) {
      console.error('Error unsubscribing from channel:', err);
      return;
    }
    console.log(`Unsubscribed from ${channel}`);
  });
}


// Function to publish a message to a Redis channel
export async function publish(channel, message) {
  try {
    await publisher.publish(channel, message);
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
}
