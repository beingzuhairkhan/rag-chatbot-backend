import { getMessages, clearSession } from '../service/redis.service.js'
import { processQueryStreaming } from '../service/rag.service.js'

export default function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(` Client connected: ${socket.id}`);

        socket.on('join_session', async (data) => {
            const { sessionId } = data;
            if (!sessionId) {
                socket.emit('error', { message: 'Session ID required' });
                return;
            }

            socket.join(sessionId)
            socket.sessionId = sessionId;
            console.log(` Client ${socket.id} joined session: ${sessionId}`);

            // send chat history
            try {
                const messages = await getMessages(sessionId);
                socket.emit('chat_history', { messages });
            } catch (error) {
                console.error('Failed to get chat history:', error);
                socket.emit('error', { message: 'Failed to load chat history' });
            }
        });

        socket.on('send_message', async (data) => {
            const { message, sessionId } = data;
            if (!sessionId || !message) {
                socket.emit('error', { message: 'Session ID and message required' });
                return;
            }
            try {
                // Emit typing indicator
                socket.to(sessionId).emit('typing', { isTyping: true });
                socket.emit('typing', { isTyping: true });

                let fullResponse = '';

                for await (const chunk of processQueryStreaming(sessionId, message)) {
                    if (chunk.type === 'chunk') {
                        fullResponse += chunk.content;
                        socket.emit('message_chunk', {
                            content: chunk.content,
                            sessionId
                        });
                    } else if (chunk.type === 'complete') {
                        socket.emit('message_complete', {
                            sources: chunk.sources,
                            relevantArticles: chunk.relevantArticles,
                            sessionId
                        });
                    } else if (chunk.type === 'error') {
                        socket.emit('error', { message: chunk.message });
                        return;
                    }
                }
                // Stop typing indicator
                socket.emit('typing', { isTyping: false });

            } catch (error) {
                console.error('Socket message processing error:', error);
                socket.emit('error', { message: 'Failed to process your message' });
                socket.emit('typing', { isTyping: false });
            }
        });

        socket.on('clear_session', async (data) => {
            const { sessionId } = data;
            if (!sessionId) {
                socket.emit('error', { message: 'Session ID required' });
                return;
            }

            try {
                await clearSession(sessionId);
                socket.emit('session_cleared', { sessionId });
                console.log(` Session cleared via socket: ${sessionId}`);

            } catch (error) {
                console.error('Failed to clear session:', error);
                socket.emit('error', { message: 'Failed to clear session' });
            }

        })
        socket.on('disconnect', () => {
            console.log(` Client disconnected: ${socket.id}`);
        });


    })
}