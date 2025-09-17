import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY, 
});

const model = 'llama-3.3-70b-versatile';

function cleanResponse(text) {
    if (!text) return text;
    return text.replace(/\*\*(.*?)\*\*/g, '$1')  
               .replace(/\*(.*?)\*/g, '$1');   
}

export const generateResponse = async (query, context, chatHistory = []) => {
    try {
        const systemPrompt = `You are a smart and structured chatbot. 
- Answer questions based on the provided news context. 
- If the context doesn't contain relevant information, say so politely and suggest what you can help with instead. 
- Keep responses concise, clear, and informative. 
- Do NOT use markdown bold or italics. 
- Instead, use plain text with bullet points, numbers, or line breaks for structure. 
- Always keep answers well-formatted like a chatbot response. 

Context from news articles: ${context}`;

        const messages = [{ role: 'system', content: systemPrompt }];

        const recentHistory = chatHistory.slice(-6);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }

        messages.push({ role: 'user', content: query });

        const completion = await groq.chat.completions.create({
            messages,
            model,
            temperature: 0.3,
            stream: false
        });

        const raw = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        return cleanResponse(raw);

    } catch (error) {
        console.error('Failed to generate LLM response:', error);
        throw new Error('Failed to generate response. Please try again.');
    }
};

export const generateStreamingResponse = async function* (query, context, chatHistory = []) {
    try {
        const systemPrompt = `You are a smart and structured chatbot. 
- Answer questions based on the provided news context. 
- If the context doesn't contain relevant information, say so politely and suggest what you can help with instead. 
- Keep responses concise, clear, and informative. 
- Do NOT use markdown bold or italics. 
- Instead, use plain text with bullet points, numbers, or line breaks for structure. 
- Always keep answers well-formatted like a chatbot response. 

Context from news articles: ${context}`;

        const messages = [{ role: 'system', content: systemPrompt }];

        const recentHistory = chatHistory.slice(-6);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            });
        }

        messages.push({ role: 'user', content: query });

        const stream = await groq.chat.completions.create({
            messages,
            model,
            temperature: 0.3,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield cleanResponse(content);
            }
        }
    } catch (error) {
        console.error('Failed to generate streaming response:', error);
        throw new Error('Failed to generate response. Please try again.');
    }
};
