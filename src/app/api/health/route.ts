import { NextResponse } from "next/server";

export async function GET() {
  const envInfo = {
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    nodeEnv: process.env.NODE_ENV,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    hasWhatsappUrl: !!process.env.WHATSAPP_API_URL,
  };

  let dbStatus = "not tested";
  let dbError = null;

  try {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@prisma/client");
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      dbStatus = "no DATABASE_URL";
    } else {
      const adapter = new PrismaPg(connectionString);
      const prisma = new PrismaClient({ adapter });
      const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");
      dbStatus = "connected";
      await prisma.$disconnect();
    }
  } catch (error: unknown) {
    dbStatus = "error";
    dbError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({ envInfo, dbStatus, dbError });
}
