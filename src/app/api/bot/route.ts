import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory state
let botRunning = false;

export async function GET() {
  return NextResponse.json({
    isRunning: botRunning,
    userClientConnected: false,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      // Lazy import bot engine
      const { startBot } = await import("@/lib/bot-engine");
      const result = await startBot();
      if (result.success) botRunning = true;
      return NextResponse.json(result);
    }

    if (action === "stop") {
      const { stopBot } = await import("@/lib/bot-engine");
      await stopBot();
      botRunning = false;
      return NextResponse.json({ success: true, message: "Bot stopped" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Bot control error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: errMsg }, { status: 500 });
  }
}
