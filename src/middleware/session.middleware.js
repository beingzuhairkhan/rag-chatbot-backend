import { v4 as uuidv4 } from 'uuid'
import { createSession, sessionExists } from '../service/redis.service.js';

const sessionMiddleware = async (req, res, next) => {
    try {
        let sessionId = req.headers['x-session-id'] || req.query.sessionId;
        if (!sessionId) {
            sessionId = uuidv4();
            console.log(`Creating new session: ${sessionId}`);
        }

        const isSessionExists = await sessionExists(sessionId);
        if (!isSessionExists) {
            await createSession(sessionId);
            console.log(`Session initialized in Redis: ${sessionId}`);
        }
        req.sessionId = sessionId;
        res.setHeader('X-Session-Id', sessionId);
        next();

    } catch (error) {
        console.error(' Session middleware error:', error);
        next(error);
    }
}

export default sessionMiddleware;