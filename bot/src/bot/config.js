export const config = {
  botToken: process.env.BOT_TOKEN,
  adminIds: (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id)),
  appUrl: process.env.NEXT_PUBLIC_CREATE_APP_URL,
  webhookPath: "/api/bot",
  databaseUrl: process.env.DATABASE_URL,

  // إعدادات الحماية من السبام
  rateLimits: {
    maxRequestsPerMinute: 10,
    maxRequestsPerHour: 100,
    cooldownSeconds: 3,
  },

  // إعدادات التحميل
  download: {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    timeout: 120000, // 2 دقيقة
    retries: 3,
  },

  platforms: {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    twitter: "X (Twitter)",
    soundcloud: "SoundCloud",
    pinterest: "Pinterest",
  },

  // الرسائل العربية
  messages: {
    welcome: `🎬 *مرحباً بك في بوت تنزيل الوسائط*

📥 *المنصات المدعومة:*
• Instagram (Reels, Posts, Stories)
• TikTok (بدون علامة مائية)
• YouTube (جميع الدقات + MP3)
• X / Twitter
• Pinterest
• SoundCloud

📌 *طريقة الاستخدام:*
فقط أرسل رابط الفيديو أو الصورة وسأقوم بتحميله لك فوراً!

💡 *ملاحظة:* بعض الروابط قد تستغرق وقتاً أطول حسب حجم الملف.`,

    processing: "⏳ جاري المعالجة...",
    downloading: "📥 جاري التحميل...",
    uploading: "📤 جاري الرفع...",

    errors: {
      unsupportedPlatform: "❌ عذراً، هذه المنصة غير مدعومة حالياً.",
      invalidUrl:
        "❌ الرابط غير صحيح. يرجى التأكد من الرابط والمحاولة مرة أخرى.",
      downloadFailed: "❌ فشل التحميل. يرجى المحاولة مرة أخرى لاحقاً.",
      fileTooLarge: "❌ حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت).",
      rateLimited: "⏸️ يرجى الانتظار قليلاً قبل إرسال طلب جديد.",
      banned: "🚫 تم حظرك من استخدام البوت.",
      notSubscribed: "⚠️ *يجب عليك الاشتراك في القنوات التالية لاستخدام البوت:*",
      checkSubscription: "✅ تحقق من الاشتراك",
      notSubscribedYet: "❌ لم تشترك بعد في جميع القنوات المطلوبة.",
      subscriptionVerified:
        "✅ تم التحقق من اشتراكك بنجاح! يمكنك الآن استخدام البوت.",
    },

    admin: {
      unauthorized: "❌ هذا الأمر متاح للمسؤولين فقط.",
      stats: `📊 *إحصائيات البوت*

👥 عدد المستخدمين: {users}
📥 عدد التحميلات: {downloads}
🚫 المحظورين: {banned}
📺 القنوات الإجبارية: {channels}

📈 *أكثر المنصات استخداماً:*
{topPlatforms}`,

      userBanned: "✅ تم حظر المستخدم بنجاح.",
      userUnbanned: "✅ تم إلغاء حظر المستخدم بنجاح.",
      broadcastSent: "✅ تم إرسال الرسالة إلى {count} مستخدم.",

      forceSubAdded: "✅ تم إضافة القناة إلى قائمة الاشتراك الإجباري.",
      forceSubRemoved: "✅ تم إزالة القناة من قائمة الاشتراك الإجباري.",
      forceSubsList: "📋 *قائمة القنوات الإجبارية:*\n\n{channels}",
      noForceSubs: "لا توجد قنوات إجبارية حالياً.",
    },
  },
};

// التحقق من وجود المتغيرات المطلوبة
export function validateConfig() {
  const errors = [];

  if (!config.botToken) {
    errors.push("BOT_TOKEN غير موجود في متغيرات البيئة");
  }

  if (!config.databaseUrl) {
    errors.push("DATABASE_URL غير موجود في متغيرات البيئة");
  }

  if (config.adminIds.length === 0) {
    console.warn("⚠️ تحذير: لم يتم تعيين أي معرفات للمسؤولين (ADMIN_IDS)");
  }

  if (errors.length > 0) {
    throw new Error(`أخطاء في الإعدادات:\n${errors.join("\n")}`);
  }

  return true;
}
