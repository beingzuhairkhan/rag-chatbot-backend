import express from 'express';
import { getMessages, clearSession, getSessionInfo } from '../service/redis.service.js'
import { processQuery } from '../service/rag.service.js';


export const getChatHistory = async (req, res) => {
    try {
        const { sessionId } = req;
        const messages = await getMessages(sessionId)
        res.json({
            success: true,
            sessionId,
            messages,
            count: messages.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve chat history'
        });
    }
}


export const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const { sessionId } = req;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const result = await processQuery(sessionId, message.trim());
        res.json({
            success: true,
            sessionId,
            response: result.response,
            sources: result.sources,
            relevantArticles: result.relevantArticles
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to process your message'
        });
    }
}

export const deleteSession = async (req, res) => {
    try {
        const { sessionId } = req;
        await clearSession(sessionId);
        res.json({
            success: true,
            sessionId,
            message: 'Session cleared successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear session'
        });
    }
}

export const getSession = async (req, res) => {
    try {
        const { sessionId } = req;
        const sessionInfo = await getSessionInfo(sessionId)
        res.json({
            success: true,
            sessionId,
            sessionInfo
        });

    } catch (error) {

    }
}