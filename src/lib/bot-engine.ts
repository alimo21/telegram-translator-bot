import { getDb } from "@/db";
import { botConfig, processedMessages, botLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { translateArabicToPersian } from "./translate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let userClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bot: any = null;
let isRunning = false;

async function addLog(level: string, message: string, details?: string) {
  try {
    const db = getDb();
    await db.insert(botLogs).values({ level, message, details: details || null });
  } catch (e) {
    console.error("Log error:", e);
  }
}

export function getBotStatus() {
  return {
    isRunning,
    userClientConnected: userClient?.connected || false,
  };
}

export async function stopBot() {
  isRunning = false;
  if (userClient) {
    try {
      await userClient.disconnect();
    } catch (_e) { /* ignore */ }
    userClient = null;
  }
  bot = null;
  console.log("Bot stopped");
}

export async function startBot() {
  if (isRunning) {
    return { success: false, message: "ربات در حال اجراست" };
  }

  try {
    const db = getDb();

    const configs = await db.select().from(botConfig).limit(1);
    if (configs.length === 0) {
      return { success: false, message: "تنظیمات ربات یافت نشد" };
    }

    const config = configs[0];

    if (!config.sessionString) {
      return { success: false, message: "ابتدا احراز هویت کنید" };
    }

    // Dynamic imports
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
    const { NewMessage } = await import("telegram/events");
    const { Api } = await import("telegram/tl");
    const TelegramBotApi = (await import("node-telegram-bot-api")).default;

    // Initialize Bot API
    bot = new TelegramBotApi(config.botToken, { polling: false });

    // Initialize MTProto client
    const session = new StringSession(config.sessionString);
    userClient = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
    });

    await userClient.connect();
    await addLog("info", "متصل به تلگرام شد");

    const sourceChannel = config.sourceChannel;
    const destChannel = config.destChannel;

    const sourceEntity = await userClient.getEntity(sourceChannel);
    await addLog("info", `در حال نظارت بر کانال: ${sourceChannel}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userClient.addEventHandler(async (event: any) => {
      try {
        const message = event.message;
        if (!message) return;

        const db = getDb();

        // Check duplicate
        const existing = await db
          .select()
          .from(processedMessages)
          .where(
            and(
              eq(processedMessages.sourceMessageId, message.id),
              eq(processedMessages.sourceChannel, sourceChannel)
            )
          )
          .limit(1);

        if (existing.length > 0) return;

        await addLog("info", `پیام جدید: ${message.id}`);

        // Translate
        const originalText = message.text || message.message || "";
        const translatedText = originalText ? await translateArabicToPersian(originalText) : "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let sentMessage: any = undefined;

        if (message.media) {
          const buffer = await userClient.downloadMedia(message.media, {});

          if (buffer) {
            const mediaBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);

            if (message.media instanceof Api.MessageMediaPhoto) {
              sentMessage = await bot.sendPhoto(destChannel, mediaBuffer, {
                caption: translatedText || undefined,
              });
            } else if (message.media instanceof Api.MessageMediaDocument) {
              const doc = message.media.document;
              if (doc instanceof Api.Document) {
                const mimeType = doc.mimeType || "";

                if (mimeType.startsWith("video/")) {
                  sentMessage = await bot.sendVideo(destChannel, mediaBuffer, {
                    caption: translatedText || undefined,
                  });
                } else if (mimeType.startsWith("audio/")) {
                  sentMessage = await bot.sendAudio(destChannel, mediaBuffer, {
                    caption: translatedText || undefined,
                  });
                } else if (mimeType === "image/gif") {
                  sentMessage = await bot.sendAnimation(destChannel, mediaBuffer, {
                    caption: translatedText || undefined,
                  });
                } else {
                  sentMessage = await bot.sendDocument(destChannel, mediaBuffer, {
                    caption: translatedText || undefined,
                  });
                }
              }
            }
          } else if (translatedText) {
            sentMessage = await bot.sendMessage(destChannel, translatedText);
          }
        } else if (translatedText) {
          sentMessage = await bot.sendMessage(destChannel, translatedText);
        }

        await db.insert(processedMessages).values({
          sourceMessageId: message.id,
          sourceChannel,
          destMessageId: sentMessage?.message_id || null,
        });

        await addLog("info", `ارسال شد: ${message.id}`);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await addLog("error", "خطا در پردازش پیام", errMsg);
        console.error("Message error:", error);
      }
    }, new NewMessage({ chats: [sourceEntity] }));

    isRunning = true;
    await addLog("info", "ربات شروع به کار کرد", `${sourceChannel} → ${destChannel}`);

    return { success: true, message: "ربات شروع به کار کرد" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Start bot error:", error);
    await addLog("error", "خطا در شروع ربات", errMsg);
    return { success: false, message: errMsg };
  }
}
