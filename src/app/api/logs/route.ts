import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getDb } = await import("@/db");
    const { botLogs } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    
    const db = getDb();
    const logs = await db
      .select()
      .from(botLogs)
      .orderBy(desc(botLogs.createdAt))
      .limit(100);
      
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    console.error("Logs error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg, logs: [] }, { status: 500 });
  }
}
