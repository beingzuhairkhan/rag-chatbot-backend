import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import sql from './config/db.js'
import sessionMiddleware from './middleware/session.middleware.js'
import initializeServices from './service/initialize.service.js'
import chatRoutes from './route/chat.route.js'
import setupSocketHandlers from './service/socket.service.js'
dotenv.config();


const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
})
const PORT = process.env.PORT || 3001;
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sessionMiddleware)
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Setup Socket.io
setupSocketHandlers(io);

// initalize Postgres DB
async function initPostgres(){
    try {
        const result = await sql`SELECT NOW()`;
         console.log("Postgres connected at:", result[0].now);
    } catch (error) {
         console.error(" Postgres connection failed:", error.message);
    }
}

// start server
async function startServer() {
    try {
        await initializeServices();
        await initPostgres();
        console.log('All services initialized successfully');
         
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
            console.log(`API URL: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  server.close(() => {
    console.log(' Server closed');
    process.exit(0);
  });
});

startServer();

export { io };