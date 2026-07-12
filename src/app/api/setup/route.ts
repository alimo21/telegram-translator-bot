import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { getDb } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    
    const db = getDb();
    
    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bot_config (
        id SERIAL PRIMARY KEY,
        bot_token TEXT NOT NULL,
        api_id INTEGER NOT NULL,
        api_hash TEXT NOT NULL,
        phone_number TEXT,
        session_string TEXT,
        source_channel TEXT NOT NULL,
        dest_channel TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS processed_messages (
        id SERIAL PRIMARY KEY,
        source_message_id INTEGER NOT NULL,
        source_channel TEXT NOT NULL,
        dest_message_id INTEGER,
        processed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bot_logs (
        id SERIAL PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    return NextResponse.json({ success: true, message: "Database ready!" });
  } catch (error: unknown) {
    console.error("Setup error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getDb } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    
    const db = getDb();
    
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bot_config', 'processed_messages', 'bot_logs')
    `);
    
    const configured = result.rows.length === 3;
    
    return NextResponse.json({ 
      success: true, 
      configured,
      tables: result.rows.length
    });
  } catch (error: unknown) {
    console.error("Setup check error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      configured: false,
      error: errMsg 
    });
  }
}
