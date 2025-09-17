import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { batchGenerateEmbeddings } from './embedding.service.js'
import {upsertVectors} from './vectorStore.service.js'


const xmlParser = new XMLParser();
const newsSources = [
    //"https://feeds.nbcnews.com/nbcnews/public/world",
    // "https://feeds.bbci.co.uk/news/world/rss.xml",
    //   "https://rss.cnn.com/rss/edition.rss",
    // "https://feeds.reuters.com/reuters/topNews",
    // "https://feeds.abcnews.com/abcnews/topstories"
];

export const ingestNewsArticles = async () => {
    console.log(" Starting news article ingestion...");
    try {
        const allArticles = [];

        for (const feedUrl of newsSources) {
            try {
                const articles = await fetchRSSFeed(feedUrl);
                allArticles.push(...articles);
            } catch (error) {
                console.error(`Failed to fetch from ${feedUrl}:`, error.message);
            }
        }

        console.log(` Total articles fetched: ${allArticles.length}`);

        if (allArticles.length === 0) {
            throw new Error("No articles were successfully fetched");
        }

        // Limit to ~50
        const limitedArticles = allArticles.slice(0, 50);

        // Prepare text for embeddings
        const articlesForEmbedding = limitedArticles.map(
            (article) =>
                `${article.title} ${article.description || ""} ${article.content || ""
                }`
        );
        // console.log(
        //     "Embedding text lengths:",
        //     articlesForEmbedding.map((t) => t.length)
        // );
        //console.log("articlesForEmbedding",articlesForEmbedding)

        console.log("Generating embeddings...");
        const embeddings = await batchGenerateEmbeddings(articlesForEmbedding , 5);

        if (embeddings.length !== limitedArticles.length) {
        throw new Error('Embeddings count mismatch with articles');
      }

      const vectors = limitedArticles.map((article , index)=>({
          id:uuidv4(),
          values: embeddings[index],
          metadata: {
          title: article.title,
          description: article.description || '',
          content: article.content || article.description || '',
          source: article.source,
          url: article.link,
          publishedAt: article.publishedAt,
          category: article.category || 'general',
        },
      }))

        console.log('Storing embeddings in Pinecone...');
        await upsertVectors(vectors);

      console.log(` Successfully ingested ${vectors.length} articles`);
      return vectors.length;


    } catch (error) {
        console.error(" News ingestion failed:", error.message);
        return 0;
    }
};

export const fetchRSSFeed = async (feedUrl) => {
    try {
        const response = await axios.get(feedUrl, {
            timeout: 30000,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
        });

        const feedData = xmlParser.parse(response.data);
        const channel = feedData.rss?.channel || feedData.feed;

        if (!channel) throw new Error("Invalid RSS feed structure");

        const items = channel.item || channel.entry || [];
        const articles = [];

        for (const item of items.slice(0, 15)) {
            try {
                const article = await parseArticle(item, feedUrl);
                if (article) articles.push(article);
            } catch (error) {
                console.warn(" Failed to parse article:", error.message);
            }
        }

        return articles;
    } catch (error) {
        console.error(`Failed to fetch RSS feed ${feedUrl}:`, error.message);
        throw error;
    }
};

export const parseArticle = async (item, feedUrl) => {
    const title = item.title?._ || item.title || "";
    const description =
        item.description?._ ||
        item.description ||
        item.summary?._ ||
        item.summary ||
        "";
    const link = item.link?.href || item.link || item.guid?._ || item.guid || "";
    const publishedAt =
        item.pubDate || item.published || item["dc:date"] || new Date().toISOString();
    const category = item.category?._ || item.category || "";

    if (!title || title.length < 5) return null;

    const source = extractSourceName(feedUrl);

    let content = description || "";
    if (link && link.startsWith("http")) {
        try {
            const fullContent = await fetchArticleContent(link);
            if (fullContent && fullContent.length > 200) {
                content = fullContent;
            }
        } catch {
            console.warn(` Could not fetch full content for ${link}`);
        }
    }

    return {
        title: (title || "").trim(),
        description: (description || "").trim(),
        content: (content || "").trim(),
        link,
        source,
        publishedAt,
        category,
    };
};

export const fetchArticleContent = async (url) => {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
        });

        const $ = cheerio.load(response.data);
        $("script, style, nav, header, footer, aside, .advertisement, .ad").remove();

        let content = "";
        const contentSelectors = [
            "article p",
            ".article-content p",
            ".story-body p",
            ".entry-content p",
            "main p",
            ".content p",
        ];

        for (const selector of contentSelectors) {
            const paragraphs = $(selector);
            if (paragraphs.length > 0) {
                content = paragraphs
                    .map((i, el) => $(el).text().trim())
                    .get()
                    .join(" ");
                break;
            }
        }

        if (!content) {
            content = $("p")
                .map((i, el) => $(el).text().trim())
                .get()
                .join(" ");
        }

        return content.substring(0, 2000);
    } catch (error) {
        throw new Error(`Failed to fetch article content: ${error.message}`);
    }
};

export const extractSourceName = (feedUrl) => {
    try {
        const url = new URL(feedUrl);
        const hostname = url.hostname.toLowerCase();

        if (hostname.includes("bbc")) return "BBC News";
        if (hostname.includes("cnn")) return "CNN";
        if (hostname.includes("reuters")) return "Reuters";
        if (hostname.includes("nbc")) return "NBC News";
        if (hostname.includes("abc")) return "ABC News";

        return hostname.replace("www.", "").replace(".com", "").toUpperCase();
    } catch {
        return "Unknown Source";
    }
};
