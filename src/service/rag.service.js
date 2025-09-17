import { generateSingleEmbedding } from './embedding.service.js'
import { queryVectors } from './vectorStore.service.js'
import { getMessages, addMessage } from './redis.service.js'
import { generateResponse, generateStreamingResponse } from './llm.service.js'

export const processQuery = async (sessionId, query) => {
    try {
        // first convert query into embedding
        const queryEmbedding = await generateSingleEmbedding(query);
        // second know embedding will search in vector db
        const searchResults = await queryVectors(queryEmbedding, 5, true)
        // third extract context
        const context = extractContext(searchResults);
        // fourth get chat history
        const chatHistory = await getMessages(sessionId, 10);
        // five generate response
        const response = await generateResponse(query, context, chatHistory);

        await addMessage(sessionId, {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            type: 'text'
        });

        await addMessage(sessionId, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            type: 'text',
            sources: extractSources(searchResults)
        })
        console.log(`Query processed successfully for session: ${sessionId}`);
        return {
            response,
            sources: extractSources(searchResults),
            relevantArticles: searchResults.length
        }


    } catch (error) {
        console.error('RAG processing error:', error);
        throw error;
    }
}

export const processQueryStreaming = async function* (sessionId, query) {

    try {
        // first convert query into embedding
        const queryEmbedding = await generateSingleEmbedding(query);
        // second know embedding will search in vector db
        const searchResults = await queryVectors(queryEmbedding, 5, true)
        // third extract context
        const context = extractContext(searchResults);
        // fourth get chat history
        const chatHistory = await getMessages(sessionId, 10);

        await addMessage(sessionId, {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            type: 'text'
        })

        let assistantResponse = '';
        for await (const chunk of generateStreamingResponse(query, context, chatHistory)) {
            assistantResponse += chunk;
            yield { type: 'chunk', content: chunk };
        }

        await addMessage(sessionId, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: assistantResponse,
            type: 'text',
            sources: extractSources(searchResults)
        })
        yield {
            type: 'complete',
            sources: extractSources(searchResults),
            relevantArticles: searchResults.length
        };

    } catch (error) {
console.error('RAG streaming error:', error);
    yield { type: 'error', message: 'Failed to process your query. Please try again.' };
    }

}

export const extractContext = (searchResults) => {
    if (!searchResults || searchResults.length === 0) {
        return 'No relevant news articles found.';
    }
    return searchResults
        .map(result => {
            const metadata = result.metadata || {};
            return `Article: ${metadata.title || 'Unknown Title'}
            Source: ${metadata.source || 'Unknown Source'}
            Content: ${metadata.content || metadata.text || 'No content available'}
            Published: ${metadata.publishedAt || 'Unknown Date'}---`;
        })
        .join('\n');
}


export const extractSources = (searchResults) => {
    if (!searchResults || searchResults.length === 0) {
        return [];
    }

    return searchResults
        .map(result => {
            const metadata = result.metadata || {};
            return {
                title: metadata.title || 'Unknown Title',
                source: metadata.source || 'Unknown Source',
                url: metadata.url || null,
                publishedAt: metadata.publishedAt || null,
                score: result.score || 0
            };
        })
        .filter(source => source.title !== 'Unknown Title');

}