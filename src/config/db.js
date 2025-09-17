import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);



export const saveMessageToPostgres = async (sessionId, message) => {
    // console.log("saveMessageToPostgres", message);

    try {
        await sql`
    INSERT INTO messages (session_id, role, content, timestamp)
    VALUES (${sessionId}, ${message.role}, ${message.content}, ${message.timestamp})
  `;
    } catch (error) {
        throw error;
    }
};

export const getMessagesFromPostgres = async (sessionId, limit = 50) => {
    try {
        const rows = await sql`
    SELECT session_id, role, content, timestamp
    FROM messages
    WHERE session_id = ${sessionId}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
        return rows.reverse();
    } catch (error) {
        throw error;
    }
};

export const deleteMessageFromDb = async (sessionId) => {
    try {
        await sql`
      DELETE FROM messages
      WHERE session_id = ${sessionId}
    `;
    } catch (error) {
        throw error;
    }
};

export default sql;