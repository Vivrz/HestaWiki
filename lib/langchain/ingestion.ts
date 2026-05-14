import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import FirecrawlApp from "@mendable/firecrawl-js";
import { Document } from "@langchain/core/documents";
import { prisma } from "@/lib/prisma";
import { getVectorStore } from "./vectorstore";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

const HR_SPLITTER = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 150,
  separators: ["\n\n", "\n", ".", " "],
});

const WEB_SPLITTER = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " "],
});

const MIN_CHUNK_LENGTH = 80;
const MIN_PAGE_LENGTH  = 200;
const BATCH_SIZE       = 5;
const BATCH_DELAY_MS   = 300;
const RETRY_DELAY_MS   = 2000;
const MAX_RETRIES      = 2;

const SERVICE_SLUGS = [
  "mobile-app", "web-app", "hybrid-app", "android", "ios",
  "artificial-intelligence", "machine-learning", "blockchain",
  "digital-transformation", "ar-vr", "devops", "cloud",
  "staff-augment", "recruitment", "sap", "vision-intelligence",
  "ai-agent", "ai-secure", "data-security", "management-consultancy",
  "underwater", "enterprises", "convocraft", "legal-tech",
];

const EXCLUDED_URL_PATTERNS = [
  "/cdn-cgi/", "/wp-admin/", "/wp-login", "/login", "/logout",
  "/register", "/cart", "/checkout", "/account", "/sitemap",
  "/robots.txt", "/feed", "/rss", "/.well-known", "/privacy-policy",
  "/terms", "/cookie-policy", "/tag/", "/author/", "?s=", "#",
];

const NOISE_PATTERNS: RegExp[] = [
  /recaptcha[\s\S]{0,200}?verification[\s\S]{0,100}?/gi,
  /protected by \*\*reCAPTCHA\*\*[\s\S]{0,200}?/gi,
  /opens chat[\s\S]{0,100}?/gi,
  /opens the chat window[\s\S]{0,100}?/gi,
  /this icon opens[\s\S]{0,100}?/gi,
  /tap to unmute[\s\S]{0,100}?/gi,
  /\[.*?youtube\.com.*?\]/gi,
  /we use cookies[\s\S]{0,400}?accept/gi,
  /cookie policy[\s\S]{0,300}?/gi,
  /gdpr[\s\S]{0,300}?/gi,
  /\[home\]\(.*?\)[\s\S]{0,50}?\[about\]\(.*?\)/gi,
  /https?:\/\/10\.\d+\.\d+\.\d+:\d+[^\s)]*/gi,
  /https?:\/\/192\.168\.\d+\.\d+[^\s)]*/gi,
  /https?:\/\/localhost[^\s)]*/gi,
  /https?:\/\/127\.0\.0\.1[^\s)]*/gi,
  /share this (page|post|article)[\s\S]{0,200}?/gi,
  /\[\s*\]\([^)]*\)/g,
  /\n{3,}/g,
];

function cleanMarkdown(raw: string): string {
  let cleaned = raw;
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(
      pattern,
      pattern.source.includes("\\n{3") ? "\n\n" : " "
    );
  }
  return cleaned.replace(/ {3,}/g, "  ").trim();
}

function isExcludedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return EXCLUDED_URL_PATTERNS.some(p => lower.includes(p));
}

function isInternalUrl(url: string): boolean {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    /https?:\/\/10\.\d+\.\d+\.\d+/.test(url) ||
    /https?:\/\/192\.168\./.test(url)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

export function getSectionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path === "/" || path === "")                      return "Home";
    if (path.includes("about"))                          return "About";
    if (path.includes("service"))                        return "Services";
    if (path.includes("staff-augment"))                  return "Staff Augmentation";
    if (path.includes("success"))                        return "Success Stories";
    if (path.includes("blog"))                           return "Blog";
    if (path.includes("contact"))                        return "Contact";
    if (path.includes("career"))                         return "Careers";
    if (path.includes("product"))                        return "Products";
    if (path.includes("industr"))                        return "Industries";
    if (path.includes("award"))                          return "Awards";
    if (SERVICE_SLUGS.some(slug => path.includes(slug))) return "Services";
    return "General";
  } catch {
    return "General";
  }
}

export async function ingestDocument(documentId: string): Promise<void> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { department: true },
    });

    if (!document) throw new Error(`Document ${documentId} not found`);

    const vectorStore = await getVectorStore();

    if (document.type === "url" && document.sourceUrl) {

      if (isInternalUrl(document.sourceUrl)) {
        throw new Error(`Refusing to crawl internal URL: ${document.sourceUrl}`);
      }

      console.log(`🔥 Starting crawl: ${document.sourceUrl}`);

      const crawlResult = await firecrawl.crawl(document.sourceUrl, {
        limit: 50,
        scrapeOptions: {
          formats: ["markdown"],
          waitFor: 2000,
          onlyMainContent: true,
        },
      });

      if (
        crawlResult.status === "failed" ||
        crawlResult.status === "cancelled"
      ) {
        throw new Error(`Crawl ended with status: ${crawlResult.status}`);
      }

      const pages = crawlResult.data ?? [];

      if (pages.length === 0) {
        throw new Error(`Firecrawl returned 0 pages for ${document.sourceUrl}`);
      }

      console.log(`✅ Crawled ${pages.length} pages. Processing...\n`);

      const today          = new Date().toISOString().slice(0, 10);
      let totalChunks      = 0;
      let skippedPages     = 0;
      let skippedChunks    = 0;
      const seenHashes     = new Set<string>();

      for (const page of pages) {
        const url      = page.metadata?.sourceURL;
        const markdown = page.markdown;

        if (!url || !markdown) {
          console.warn(`  ⚠️  Skipping — missing URL or markdown`);
          skippedPages++;
          continue;
        }

        if (isInternalUrl(url)) {
          console.warn(`  ⚠️  Skipping internal URL: ${url}`);
          skippedPages++;
          continue;
        }

        if (isExcludedUrl(url)) {
          console.warn(`  ⚠️  Skipping excluded URL: ${url}`);
          skippedPages++;
          continue;
        }

        const cleanedMarkdown = cleanMarkdown(markdown);

        if (cleanedMarkdown.length < MIN_PAGE_LENGTH) {
          console.warn(`  ⚠️  Skipping thin page (${cleanedMarkdown.length} chars): ${url}`);
          skippedPages++;
          continue;
        }

        const contentHash = cleanedMarkdown.slice(0, 500);
        if (seenHashes.has(contentHash)) {
          console.warn(`  ⚠️  Skipping duplicate content: ${url}`);
          skippedPages++;
          continue;
        }
        seenHashes.add(contentHash);

        const rawDoc = new Document({
          pageContent: cleanedMarkdown,
          metadata: { sourceURL: url },
        });

        const chunks = await WEB_SPLITTER.splitDocuments([rawDoc]);

        const qualityChunks = chunks.filter(chunk => {
          const text = chunk.pageContent.trim();
          if (text.length < MIN_CHUNK_LENGTH)                  { skippedChunks++; return false; }
          if (/^(\[.*?\]\(.*?\)\s*){1,5}$/.test(text))        { skippedChunks++; return false; }
          if (/^#{1,4}\s+.{1,80}$/.test(text))                { skippedChunks++; return false; }
          return true;
        });

        if (qualityChunks.length === 0) {
          console.warn(`  ⚠️  No quality chunks after filtering: ${url}`);
          skippedPages++;
          continue;
        }

        const chunksWithMetadata = qualityChunks.map((chunk, idx) => ({
          ...chunk,
          metadata: {
            source:       "website",
            source_url:   url,
            page_title:   page.metadata?.title ?? url,
            section:      getSectionFromUrl(url),
            chunk_index:  idx,
            total_chunks: qualityChunks.length,
            last_scraped: today,
            docId:        document.id,
            departmentId: document.departmentId,
            isLatest:     true,
          },
        }));

        let attempt = 0;
        let success = false;

        while (attempt <= MAX_RETRIES && !success) {
          try {
            for (let i = 0; i < chunksWithMetadata.length; i += BATCH_SIZE) {
              const batch = chunksWithMetadata.slice(i, i + BATCH_SIZE);
              await vectorStore.addDocuments(batch);
              await sleep(BATCH_DELAY_MS);
            }
            success = true;
          } catch {
            attempt++;
            if (attempt <= MAX_RETRIES) {
              console.warn(`  ⚠️  Embed attempt ${attempt} failed for ${url}, retrying in ${RETRY_DELAY_MS / 1000}s...`);
              await sleep(RETRY_DELAY_MS);
            } else {
              console.error(`  ❌  Skipping after ${MAX_RETRIES} retries: ${url}`);
              skippedPages++;
            }
          }
        }

        if (success) {
          totalChunks += qualityChunks.length;
          console.log(
            `  ✓  [${getSectionFromUrl(url).padEnd(18)}] ${url}\n` +
            `       → ${qualityChunks.length} chunks kept` +
            (chunks.length !== qualityChunks.length
              ? ` (${chunks.length - qualityChunks.length} dropped)`
              : "")
          );
        }
      }

      console.log(`🎉 Ingestion complete | Pages: ${pages.length}, Skipped: ${skippedPages}, Chunks: ${totalChunks}, Dropped: ${skippedChunks}`);

    } else if (
      (document.type === "pdf"  ||
       document.type === "text" ||
       document.type === "md") &&
      document.filePath
    ) {
      const loader =
        document.type === "pdf"
          ? new PDFLoader(document.filePath)
          : new TextLoader(document.filePath);

      const rawDocs = await loader.load();
      const chunks  = await HR_SPLITTER.splitDocuments(rawDocs);

      const chunksWithMetadata = chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          source:       "document",
          docId:        document.id,
          docName:      document.name,
          departmentId: document.departmentId,
          department:   document.department?.name ?? "",
          version:      document.version ?? 1,
          isLatest:     true,
          chunkIndex:   index,
        },
      }));

      for (let i = 0; i < chunksWithMetadata.length; i += BATCH_SIZE) {
        const batch = chunksWithMetadata.slice(i, i + BATCH_SIZE);
        await vectorStore.addDocuments(batch);
        await sleep(BATCH_DELAY_MS);
      }

      console.log(`✅ Ingested ${chunks.length} chunks from: ${document.name}`);

    } else {
      throw new Error(
        `Cannot ingest: invalid type "${document.type}" or missing path/url`
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data:  { status: "ready" },
    });

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown ingestion error";

    console.error(`❌ Ingestion failed:`, errorMessage);

    await prisma.document.update({
      where: { id: documentId },
      data:  { status: "failed", errorMessage },
    });
  }
}