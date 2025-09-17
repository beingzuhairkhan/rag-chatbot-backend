import { connect } from './redis.service.js'
import { initializePinecone, getIndexStats } from './vectorStore.service.js'
import {ingestNewsArticles} from './newsIngestion.service.js'

const initializeServices = async () => {
    console.log(' Initializing services...');

    // Initialize Redis connection
    await connect();
    console.log(' Redis connected');

     // Initialize pinecone connection
    await initializePinecone()
    console.log(' Pinecone initialized');

    const articleCount = await getIndexStats()
    console.log(`Current article count: ${articleCount}`);

    if (articleCount === 0) {
        console.log(' No articles found, starting news ingestion...');
        await ingestNewsArticles();
        console.log(' News articles ingested');
    }

    console.log(' All services ready!');
}

export default initializeServices