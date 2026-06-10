import { db } from "./database.js";
import { keyboards } from "./keyboards.js";
import { downloader } from "./downloader.js";
import { config } from "./config.js";

const getTelegramAPI = () => `https://api.telegram.org/bot${config.botToken}`;

// Rate limiting cache (in-memory for serverless)
const rateLimitCache = new Map();

async function api(method, params = {}) {
  const response = await fetch(`${getTelegramAPI()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return await response.json();
}

// Rate limiting helper
function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimitCache.get(userId) || {
    requests: [],
    lastRequest: 0,
  };

  // Clean old requests (older than 1 hour)
  userLimits.requests = userLimits.requests.filter(
    (time) => now - time < 3600000,
  );

  // Check cooldown
  if (now - userLimits.lastRequest < config.rateLimits.cooldownSeconds * 1000) {
    return false;
  }

  // Check hourly limit
  if (userLimits.requests.length >= config.rateLimits.maxRequestsPerHour) {
    return false;
  }

  // Update limits
  userLimits.requests.push(now);
  userLimits.lastRequest = now;
  rateLimitCache.set(userId, userLimits);

  return true;
}

export const handlers = {
  async handleStart(chatId, from) {
    await db.createUser(
      from.id,
      from.username,
      from.first_name,
      from.language_code,
    );

    // Check force subscription
    const isSubscribed = await this.checkSubscription(from.id);
    if (!isSubscribed) {
      return await this.sendForceSubMessage(chatId);
    }

    await api("sendMessage", {
      chat_id: chatId,
      text: config.messages.welcome,
      parse_mode: "Markdown",
      reply_markup: keyboards.main,
    });
  },

  async checkSubscription(userId) {
    const channels = await db.getForceSubs();
    if (channels.length === 0) return true;

    for (const channel of channels) {
      try {
        const res = await api("getChatMember", {
          chat_id: channel.channel_id,
          user_id: userId,
        });

        if (
          !res.ok ||
          !["member", "administrator", "creator"].includes(res.result?.status)
        ) {
          return false;
        }
      } catch (error) {
        console.error(
          `Error checking subscription for channel ${channel.channel_id}:`,
          error,
        );
        // Continue checking other channels
      }
    }
    return true;
  },

  async sendForceSubMessage(chatId) {
    const channels = await db.getForceSubs();
    await api("sendMessage", {
      chat_id: chatId,
      text: config.messages.errors.notSubscribed,
      parse_mode: "Markdown",
      reply_markup: keyboards.forceSub(channels),
    });
  },

  async handleCheckSubscription(chatId, userId) {
    const isSubscribed = await this.checkSubscription(userId);

    if (isSubscribed) {
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.subscriptionVerified,
      });
      // Resend welcome message
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.welcome,
        parse_mode: "Markdown",
        reply_markup: keyboards.main,
      });
    } else {
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.notSubscribedYet,
      });
    }
  },

  async handleAdminCommands(chatId, text, userId) {
    if (!config.adminIds.includes(userId)) {
      return await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.unauthorized,
      });
    }

    if (text === "/admin" || text === "/stats") {
      return await this.handleAdminStats(chatId);
    }

    if (text === "/forcesubs") {
      const subs = await db.getForceSubs();
      if (subs.length === 0) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: config.messages.admin.noForceSubs,
        });
      }

      let channelsList = subs
        .map(
          (s, i) =>
            `${i + 1}. ${s.channel_title}\n   ID: \`${s.channel_id}\`\n   الرابط: ${s.invite_link}`,
        )
        .join("\n\n");

      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.forceSubsList.replace(
          "{channels}",
          channelsList,
        ),
        parse_mode: "Markdown",
      });
    } else if (text.startsWith("/setforce ")) {
      const parts = text.split(" ");
      if (parts.length < 4) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: "⚠️ الاستخدام الصحيح:\n`/setforce [معرف_القناة] [اسم_القناة] [رابط_الدعوة]`\n\nمثال:\n`/setforce -1001234567890 قناتي https://t.me/mychannel`",
          parse_mode: "Markdown",
        });
      }

      const channelId = parts[1];
      const channelTitle = parts[2];
      const inviteLink = parts[3];

      await db.addForceSub(channelId, channelTitle, inviteLink);
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.forceSubAdded,
      });
    } else if (text.startsWith("/removeforce ")) {
      const channelId = text.split(" ")[1];
      if (!channelId) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: "⚠️ الاستخدام: `/removeforce [معرف_القناة]`",
          parse_mode: "Markdown",
        });
      }

      await db.removeForceSub(channelId);
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.forceSubRemoved,
      });
    } else if (text.startsWith("/ban ")) {
      const targetId = text.split(" ")[1];
      if (!targetId) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: "⚠️ الاستخدام: `/ban [معرف_المستخدم]`",
          parse_mode: "Markdown",
        });
      }

      await db.banUser(targetId);
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.userBanned,
      });
    } else if (text.startsWith("/unban ")) {
      const targetId = text.split(" ")[1];
      if (!targetId) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: "⚠️ الاستخدام: `/unban [معرف_المستخدم]`",
          parse_mode: "Markdown",
        });
      }

      await db.unbanUser(targetId);
      await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.admin.userUnbanned,
      });
    } else if (text.startsWith("/broadcast ")) {
      const message = text.substring(11).trim();
      if (!message) {
        return await api("sendMessage", {
          chat_id: chatId,
          text: "⚠️ الاستخدام: `/broadcast [الرسالة]`",
          parse_mode: "Markdown",
        });
      }

      await this.handleBroadcast(chatId, message);
    }
  },

  async handleBroadcast(chatId, message) {
    const users = await db.getAllUsers();
    let successCount = 0;

    await api("sendMessage", {
      chat_id: chatId,
      text: `📢 جاري إرسال الرسالة إلى ${users.length} مستخدم...`,
    });

    for (const user of users) {
      try {
        await api("sendMessage", {
          chat_id: user.telegram_id,
          text: message,
          parse_mode: "Markdown",
        });
        successCount++;

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error(
          `Failed to send broadcast to ${user.telegram_id}:`,
          error,
        );
      }
    }

    await api("sendMessage", {
      chat_id: chatId,
      text: config.messages.admin.broadcastSent.replace(
        "{count}",
        successCount,
      ),
    });
  },

  async handleDownload(chatId, url, userId) {
    // Check if user is banned
    const isBanned = await db.isBanned(userId);
    if (isBanned) {
      return await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.banned,
      });
    }

    // Check subscription
    const isSubscribed = await this.checkSubscription(userId);
    if (!isSubscribed) {
      return await this.sendForceSubMessage(chatId);
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.rateLimited,
      });
    }

    // Validate URL
    if (!downloader.isValidUrl(url)) {
      return await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.invalidUrl,
      });
    }

    const platform = downloader.detectPlatform(url);
    if (!platform) {
      return await api("sendMessage", {
        chat_id: chatId,
        text: config.messages.errors.unsupportedPlatform,
      });
    }

    const waitMsg = await api("sendMessage", {
      chat_id: chatId,
      text: config.messages.processing,
    });

    try {
      const result = await downloader.extract(url, platform);

      if (result.status === "error") {
        return await api("editMessageText", {
          chat_id: chatId,
          message_id: waitMsg.result.message_id,
          text: config.messages.errors.downloadFailed,
        });
      }

      // Handle single URL response
      if (result.url) {
        await api("deleteMessage", {
          chat_id: chatId,
          message_id: waitMsg.result.message_id,
        });

        await api("sendMessage", {
          chat_id: chatId,
          text: config.messages.downloading,
        });

        const sendMethod =
          platform === "soundcloud" || result.url.includes(".mp3")
            ? "sendAudio"
            : result.url.includes(".mp4") ||
                ["youtube", "tiktok", "instagram", "twitter"].includes(platform)
              ? "sendVideo"
              : "sendPhoto";

        const res = await api(sendMethod, {
          chat_id: chatId,
          [sendMethod === "sendVideo"
            ? "video"
            : sendMethod === "sendAudio"
              ? "audio"
              : "photo"]: result.url,
          caption: `✅ تم التحميل من ${config.platforms[platform]}`,
        });

        if (res.ok) {
          await db.logDownload(userId, platform, url);
        } else {
          // Fallback to sending link if file too large
          await api("sendMessage", {
            chat_id: chatId,
            text: `🔗 الملف كبير جداً للإرسال عبر تيليجرام.\nالرابط المباشر:\n${result.url}`,
          });
        }
      } else if (result.picker) {
        // Handle YouTube quality picker
        await api("editMessageText", {
          chat_id: chatId,
          message_id: waitMsg.result.message_id,
          text: "📺 اختر الجودة المطلوبة:",
          reply_markup: keyboards.ytOptions(
            url,
            "Video",
            downloader.getYouTubeQualities(),
          ),
        });
      }
    } catch (error) {
      console.error(`Download error for ${platform}:`, error);
      await api("editMessageText", {
        chat_id: chatId,
        message_id: waitMsg.result.message_id,
        text: config.messages.errors.downloadFailed,
      });
    }
  },

  async handleAdminStats(chatId) {
    const stats = await db.getStats();

    const topPlatformsText =
      stats.topPlatforms.length > 0
        ? stats.topPlatforms
            .map(
              (p, i) =>
                `${i + 1}. ${config.platforms[p.platform] || p.platform}: ${p.count}`,
            )
            .join("\n")
        : "لا توجد بيانات";

    const text = config.messages.admin.stats
      .replace("{users}", stats.totalUsers)
      .replace("{downloads}", stats.totalDownloads)
      .replace("{banned}", stats.bannedUsers)
      .replace("{channels}", stats.forceSubsCount)
      .replace("{topPlatforms}", topPlatformsText);

    await api("sendMessage", {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      reply_markup: keyboards.admin,
    });
  },
};
