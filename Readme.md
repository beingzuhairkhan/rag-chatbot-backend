Demo Video : https://drive.google.com/file/d/16G8gjup-pZ0vh1Szaz1LuLavyTUmIQa7/view?usp=drive_link
# News Assistant Backend

Backend for News Assistant, a chatbot powered by AI with RAG (Retrieval-Augmented Generation). Handles chat sessions, embeddings, Redis caching, and API communication with the frontend.

## Tech Stack

- Node.js & Express – Backend server  
- Redis – Session storage & caching  
- Vector Storage / Embeddings – Pinecone / Jina / llama(groq cloud)  
- Frontend Communication – REST API + WebSocket  
- Other Tools – dotenv, nodemon, cors  



# Setup Instructions

1. Clone the repository


git clone https://github.com/beingzuhairkhan/rag-chatbot-backend.git


2. Install dependencies


npm install


3. Set environment variables in `.env`:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=
REDIS_URL=
SESSION_TTL=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
JINA_API_KEY=
GROQ_API_KEY=
```

4. **Start the server**

```bash
npm run dev
```

---

## API Endpoints

| Endpoint            | Method | Description                     |
| ------------------- | ------ | ------------------------------- |
| `/api/chat/history` | GET    | Fetch session chat history      |
| `/api/chat/message` | POST   | Send a message to the assistant |
| `/api/chat/clear`   | DELETE | Clear a session's chat history  |
| `/api/chat/session` | GET    | Get current session information |

---

## End-to-End Flow

1. **Embeddings Creation & Indexing**

   * Text queries are converted into vector embeddings using AI services (llama/Pinecone/Jina).
   * Embeddings are indexed and stored for fast retrieval during similar queries.

2. **Redis Caching & Session History**

   * Each session is assigned a unique `sessionId`.
   * Chat messages are stored in Redis for fast access and easy session reset.

3. **Frontend Interaction**

   * Frontend calls REST endpoints or WebSocket for real-time messaging.
   * Backend responds with the AI-generated text and any sources if available.

4. **Noteworthy Design Decisions**

   * Stateless backend with Redis session storage for scalability.
   * Modular separation of API, embeddings, and WebSocket logic.
   * Real-time streaming support for a better user experience.

5. **Potential Improvements**

   * Add authentication for multiple users.
   * Enable Redis clustering for horizontal scaling.
   * Integrate Postgres + pgvector for larger vector datasets.
   * Implement rate limiting and logging for production.

---

