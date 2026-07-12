import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getDb } = await import("@/db");
    const { botConfig } = await import("@/db/schema");
    
    const db = getDb();
    const configs = await db.select().from(botConfig).limit(1);
    
    if (configs.length === 0) {
      return NextResponse.json({ config: null });
    }
    
    const config = configs[0];
    return NextResponse.json({
      config: {
        ...config,
        sessionString: config.sessionString ? "***configured***" : null,
        botToken: config.botToken ? "***configured***" : null,
        apiHash: config.apiHash ? "***configured***" : null,
      },
    });
  } catch (error: unknown) {
    console.error("Config GET error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { getDb } = await import("@/db");
    const { botConfig } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDb();
    const body = await request.json();
    const { botToken, apiId, apiHash, sourceChannel, destChannel } = body;

    if (!botToken || !apiId || !apiHash || !sourceChannel || !destChannel) {
      return NextResponse.json({ error: "همه فیلدها الزامی هستند" }, { status: 400 });
    }

    const existing = await db.select().from(botConfig).limit(1);

    if (existing.length > 0) {
      await db
        .update(botConfig)
        .set({
          botToken,
          apiId: parseInt(apiId),
          apiHash,
          sourceChannel,
          destChannel,
          updatedAt: new Date(),
        })
        .where(eq(botConfig.id, existing[0].id));
    } else {
      await db.insert(botConfig).values({
        botToken,
        apiId: parseInt(apiId),
        apiHash,
        sourceChannel,
        destChannel,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Config POST error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
