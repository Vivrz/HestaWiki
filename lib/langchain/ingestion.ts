import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { prisma } from "@/lib/prisma";
import { getVectorStore } from "./vectorstore";

export async function ingestDocument(documentId: string): Promise<void> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { department: true },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    let loader: PDFLoader | TextLoader | CheerioWebBaseLoader;

    if (document.type === "pdf" && document.filePath) {
      loader = new PDFLoader(document.filePath);
    } else if (
      (document.type === "text" || document.type === "md") &&
      document.filePath
    ) {
      loader = new TextLoader(document.filePath);
    } else if (document.type === "url" && document.sourceUrl) {
      loader = new CheerioWebBaseLoader(document.sourceUrl);
    } else {
      throw new Error(
        `Cannot load document: invalid type or missing path/url`
      );
    }

    const rawDocs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });

    const chunks = await splitter.splitDocuments(rawDocs);

    const chunksWithMetadata = chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        docId: document.id,
        docName: document.name,
        departmentId: document.departmentId,
        department: document.department.name,
        version: document.version,
        isLatest: true,
        chunkIndex: index,
      },
    }));

    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(chunksWithMetadata);

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during ingestion";

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "failed", errorMessage },
    });
  }
}
