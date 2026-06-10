export const keyboards = {
  main: {
    inline_keyboard: [
      [
        { text: "📸 Instagram", callback_data: "help_insta" },
        { text: "🎬 TikTok", callback_data: "help_tiktok" },
      ],
      [
        { text: "📺 YouTube", callback_data: "help_yt" },
        { text: "🐦 X (Twitter)", callback_data: "help_x" },
      ],
      [
        { text: "🎵 SoundCloud", callback_data: "help_sc" },
        { text: "📌 Pinterest", callback_data: "help_pin" },
      ],
      [{ text: "👨‍💻 المطور", url: "https://t.me/CreateBotSupport" }],
    ],
  },

  forceSub: (channels) => ({
    inline_keyboard: [
      ...channels.map((c) => [
        { text: `📢 ${c.channel_title}`, url: c.invite_link },
      ]),
      [{ text: "✅ تم الاشتراك", callback_data: "check_sub" }],
    ],
  }),

  ytOptions: (videoId, title, formats) => {
    // formats should be an array of { quality: '720p', size: '20MB', id: '...' }
    const rows = [];
    for (let i = 0; i < formats.length; i += 2) {
      const row = [];
      row.push({
        text: `📹 ${formats[i].quality} (${formats[i].size})`,
        callback_data: `dl_yt_v_${videoId}_${formats[i].id}`,
      });
      if (formats[i + 1]) {
        row.push({
          text: `📹 ${formats[i + 1].quality} (${formats[i + 1].size})`,
          callback_data: `dl_yt_v_${videoId}_${formats[i + 1].id}`,
        });
      }
      rows.push(row);
    }
    rows.push([
      { text: "🎵 تحميل كصوت MP3", callback_data: `dl_yt_a_${videoId}` },
    ]);
    return { inline_keyboard: rows };
  },

  admin: {
    inline_keyboard: [
      [{ text: "📊 الإحصائيات", callback_data: "admin_stats" }],
      [{ text: "📢 إذاعة", callback_data: "admin_broadcast" }],
      [{ text: "🚫 حظر مستخدم", callback_data: "admin_ban" }],
    ],
  },
};
