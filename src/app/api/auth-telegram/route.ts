import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Store auth state in memory
const authStates = new Map<string, { client: unknown; phoneCodeHash: string }>();

export async function POST(request: Request) {
  try {
    const { getDb } = await import("@/db");
    const { botConfig } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    
    const db = getDb();
    const body = await request.json();
    const { action, phoneNumber, code, password } = body;

    const configs = await db.select().from(botConfig).limit(1);
    if (configs.length === 0) {
      return NextResponse.json({ error: "ابتدا تنظیمات ربات رو ذخیره کنید" }, { status: 400 });
    }
    const config = configs[0];

    // Dynamic imports for telegram
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");

    if (action === "sendCode") {
      const session = new StringSession("");
      const client = new TelegramClient(session, config.apiId, config.apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      const result = await client.sendCode(
        { apiId: config.apiId, apiHash: config.apiHash },
        phoneNumber
      );

      authStates.set(phoneNumber, {
        client,
        phoneCodeHash: result.phoneCodeHash,
      });

      await db
        .update(botConfig)
        .set({ phoneNumber })
        .where(eq(botConfig.id, config.id));

      return NextResponse.json({ success: true, step: "enterCode" });
    }

    if (action === "verifyCode") {
      const state = authStates.get(phoneNumber);
      if (!state) {
        return NextResponse.json({ error: "سشن منقضی شده. دوباره کد بگیرید." }, { status: 400 });
      }

      try {
        const { Api } = await import("telegram/tl");
        const client = state.client as InstanceType<typeof TelegramClient>;
        
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash: state.phoneCodeHash,
            phoneCode: code,
          })
        );

        const sessionString = client.session.save() as unknown as string;
        await db
          .update(botConfig)
          .set({ sessionString })
          .where(eq(botConfig.id, config.id));

        authStates.delete(phoneNumber);

        return NextResponse.json({ success: true, step: "done" });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("SESSION_PASSWORD_NEEDED")) {
          return NextResponse.json({ success: true, step: "enterPassword" });
        }
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    if (action === "verifyPassword") {
      const state = authStates.get(phoneNumber);
      if (!state) {
        return NextResponse.json({ error: "سشن منقضی شده. دوباره کد بگیرید." }, { status: 400 });
      }

      try {
        const client = state.client as InstanceType<typeof TelegramClient>;
        
        await client.signInWithPassword(
          { apiId: config.apiId, apiHash: config.apiHash },
          {
            password: () => Promise.resolve(password),
            onError: (err: Error) => { throw err; },
          }
        );

        const sessionString = client.session.save() as unknown as string;
        await db
          .update(botConfig)
          .set({ sessionString })
          .where(eq(botConfig.id, config.id));

        authStates.delete(phoneNumber);

        return NextResponse.json({ success: true, step: "done" });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Auth error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
