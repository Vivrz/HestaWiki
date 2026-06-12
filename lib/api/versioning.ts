import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function markEmbeddingsAsNotLatest(documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return;

  await prisma.$executeRaw`
    UPDATE langchain_pg_embedding
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{isLatest}', 'false'::jsonb, true)
    WHERE metadata->>'docId' IN (${Prisma.join(documentIds)})
  `;
}

export async function discardStagedEmbeddings(documentId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM langchain_pg_embedding
    WHERE metadata->>'docId' = ${documentId}
  `;
}

export async function publishCompletedDocument(documentId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        name: true,
        departmentId: true,
        version: true,
      },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found during publication`);
    }

    const newerPublishedVersion = await tx.document.findFirst({
      where: {
        name: document.name,
        departmentId: document.departmentId,
        status: "ready",
        isLatest: true,
        version: { gt: document.version },
      },
      select: { id: true },
    });

    if (newerPublishedVersion) {
      await tx.document.update({
        where: { id: document.id },
        data: { status: "ready", isLatest: false, errorMessage: null },
      });
      return false;
    }

    const previousVersions = await tx.document.findMany({
      where: {
        name: document.name,
        departmentId: document.departmentId,
        isLatest: true,
        id: { not: document.id },
      },
      select: { id: true },
    });

    await tx.document.updateMany({
      where: {
        name: document.name,
        departmentId: document.departmentId,
        isLatest: true,
        id: { not: document.id },
      },
      data: { isLatest: false },
    });

    if (previousVersions.length > 0) {
      await tx.$executeRaw`
        UPDATE langchain_pg_embedding
        SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{isLatest}', 'false'::jsonb, true)
        WHERE metadata->>'docId' IN (${Prisma.join(previousVersions.map((entry) => entry.id))})
      `;
    }

    await tx.$executeRaw`
      UPDATE langchain_pg_embedding
      SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{isLatest}', 'true'::jsonb, true)
      WHERE metadata->>'docId' = ${document.id}
    `;

    await tx.document.update({
      where: { id: document.id },
      data: { status: "ready", isLatest: true, errorMessage: null },
    });

    return true;
  });
}
