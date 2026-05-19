import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateMutationRequestOrigin } from "@/lib/api/security";

const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[\w\s&().-]+$/, "Invalid department name"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({
    include: {
      _count: { select: { documents: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof createDepartmentSchema>;
  try {
    const raw = (await req.json()) as unknown;
    const parsed = createDepartmentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const department = await prisma.department.create({
      data: { name: body.name },
    });
    return NextResponse.json(department, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Department already exists" },
      { status: 409 }
    );
  }
}
