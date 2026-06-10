import { handlers } from "./handlers.js";
import { db } from "./database.js";
import { config, validateConfig } from "./config.js";

export async function POST(request) {
  try {
    // Validate configuration on first request
    validateConfig();

    const update = await request.json();

    // 1. Message Handling
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const from = update.message.from;

      // Anti-ban check
      if (await db.isBanned(from.id)) {
        return new Response("OK");
      }

      // Commands
      if (text === "/start") {
        await handlers.handleStart(chatId, from);
      } else if (text?.startsWith("/") && config.adminIds.includes(from.id)) {
        // Admin commands
        await handlers.handleAdminCommands(chatId, text, from.id);
      } else if (text?.startsWith("http")) {
        // URL download handling
        await handlers.handleDownload(chatId, text, from.id);
      } else {
        // Check subscription for any other message
        const isSubbed = await handlers.checkSubscription(from.id);
        if (!isSubbed) {
          await handlers.sendForceSubMessage(chatId);
        }
      }
    }

    // 2. Callback Query Handling
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message.chat.id;
      const data = query.data;
      const userId = query.from.id;

      // Answer callback query immediately
      const answerCallback = async (text, showAlert = false) => {
        await fetch(
          `https://api.telegram.org/bot${config.botToken}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: query.id,
              text: text,
              show_alert: showAlert,
            }),
          },
        );
      };

      // Check subscription callback
      if (data === "check_sub") {
        await handlers.handleCheckSubscription(chatId, userId);
        await answerCallback("✅ تم التحقق", false);
      }

      // Help callbacks
      if (data.startsWith("help_")) {
        const platformKey = data.replace("help_", "");
        const platformMap = {
          insta: "Instagram",
          tiktok: "TikTok",
          yt: "YouTube",
          x: "X (Twitter)",
          sc: "SoundCloud",
          pin: "Pinterest",
        };

        const platform = platformMap[platformKey] || platformKey;

        await fetch(
          `https://api.telegram.org/bot${config.botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `💡 *طريقة التحميل من ${platform}:*\n\nفقط أرسل رابط الفيديو أو المنشور مباشرة وسأقوم بتحميله لك بأعلى جودة متاحة.\n\n📌 تأكد أن الحساب عام وليس خاص.`,
              parse_mode: "Markdown",
            }),
          },
        );

        await answerCallback("ℹ️ معلومات المنصة", false);
      }

      // YouTube quality selection callback
      if (data.startsWith("dl_yt_")) {
        const parts = data.split("_");
        const type = parts[2]; // 'v' for video, 'a' for audio
        const videoUrl = parts[3];
        const qualityId = parts[4];

        await answerCallback("⏳ جاري التحميل...", false);

        // Re-extract with specific quality
        const result = await handlers.handleDownload(chatId, videoUrl, userId);
        // The download will be handled by the handleDownload method
      }

      // Admin stats callback
      if (data === "admin_stats") {
        if (config.adminIds.includes(userId)) {
          await handlers.handleAdminStats(chatId);
          await answerCallback("📊 الإحصائيات", false);
        } else {
          await answerCallback(config.messages.admin.unauthorized, true);
        }
      }
    }

    return new Response("OK");
  } catch (error) {
    console.error("Bot Error:", error);
    // Log error to database or monitoring service in production
    return new Response("OK"); // Always return OK to Telegram to avoid retries
  }
}

// GET endpoint for webhook verification
export async function GET(request) {
  return Response.json({
    status: "active",
    bot: "Media Downloader Bot",
    webhook: `${config.appUrl}${config.webhookPath}`,
    platforms: Object.values(config.platforms),
  });
}
