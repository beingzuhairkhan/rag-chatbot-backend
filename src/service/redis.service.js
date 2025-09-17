import Redis from 'ioredis'
import {saveMessageToPostgres , getMessagesFromPostgres , deleteMessageFromDb} from '../config/db.js'
import dotenv from 'dotenv'
dotenv.config();


let client = null;

export const connect = async () => {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    client.on("connect", () => {
      console.log("Redis connected");
    });

    client.on("error", (err) => {
      console.log("Redis error", err);
    });
  }
  return client;
};

export const createSession = async (sessionId) => {
    const sessionKey = `session:${sessionId}`;
    const sessionData = {
        id:sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount : 0 
    }

    await client.hset(sessionKey , sessionData);
    await client.expire(sessionKey , process.env.SESSION_TTL || 3600);
    return sessionData ;
}

export const sessionExists = async(sessionId) => {
    return await client.exists(`session:${sessionId}`);
}


export const updateSessionActivity = async (sessionId) => {
    const sessionKey = `session:${sessionId}`;
    await client.hset(sessionKey , "lastActivity", new Date().toISOString());
    await client.expire(sessionKey , process.env.SESSION_TTL || 3600);
}

export const addMessage = async(sessionId , message) => {
    const messagesKey = `messages:${sessionId}`;
    const messageData = {
        ...message,
        timestamp: new Date().toISOString()
    };

    await saveMessageToPostgres(sessionId , messageData)

    await client.lpush(messagesKey , JSON.stringify(messageData));
    await client.expire(messagesKey, process.env.SESSION_TTL || 3600);

    const sessionKey = `session:${sessionId}`;
    await client.hincrby(sessionKey , "messageCount" , 1);
    await updateSessionActivity(sessionId) ;
    return messageData ;
}


export const getMessages = async (sessionId , limit = 50) => {
    const messagesKey = `messages:${sessionId}`;
    const messages = await client.lrange(messagesKey , 0 , limit-1);
    if(messages.length > 0){
       return messages.map((msg) => JSON.parse(msg)).reverse();
    }
    return await getMessagesFromPostgres(sessionId, limit);
}

export const clearSession = async (sessionId) => {
    await deleteMessageFromDb(sessionId);
    await client.del(`session:${sessionId}`, `messages:${sessionId}`)
    console.log(`Session cleared: ${sessionId}`);
}

export const getSessionInfo = async (sessionId) => {
    const sessionData = await client.hgetall(`session:${sessionId}`);
    return Object.keys(sessionData).length === 0 ? null : sessionData ;
}