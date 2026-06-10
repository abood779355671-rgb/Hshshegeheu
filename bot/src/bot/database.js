import sql from "./sql.js";

export const db = {
  // Users
  async getUser(telegramId) {
    const rows =
      await sql`SELECT * FROM users WHERE telegram_id = ${telegramId}`;
    return rows[0];
  },

  async createUser(telegramId, username, fullName, languageCode) {
    return await sql`
      INSERT INTO users (telegram_id, username, full_name, language_code)
      VALUES (${telegramId}, ${username}, ${fullName}, ${languageCode})
      ON CONFLICT (telegram_id) DO UPDATE 
      SET username = ${username}, full_name = ${fullName}
      RETURNING *
    `;
  },

  async getAllUsers() {
    return await sql`SELECT telegram_id FROM users WHERE is_banned = FALSE`;
  },

  async banUser(telegramId) {
    return await sql`UPDATE users SET is_banned = TRUE WHERE telegram_id = ${telegramId}`;
  },

  async unbanUser(telegramId) {
    return await sql`UPDATE users SET is_banned = FALSE WHERE telegram_id = ${telegramId}`;
  },

  async isBanned(telegramId) {
    const rows =
      await sql`SELECT is_banned FROM users WHERE telegram_id = ${telegramId}`;
    return rows[0]?.is_banned || false;
  },

  async getUsersCount() {
    const rows = await sql`SELECT COUNT(*) as count FROM users`;
    return parseInt(rows[0].count);
  },

  async getBannedUsersCount() {
    const rows =
      await sql`SELECT COUNT(*) as count FROM users WHERE is_banned = TRUE`;
    return parseInt(rows[0].count);
  },

  // Force Subscription
  async getForceSubs() {
    return await sql`SELECT * FROM force_subs`;
  },

  async getForceSubsCount() {
    const rows = await sql`SELECT COUNT(*) as count FROM force_subs`;
    return parseInt(rows[0].count);
  },

  async addForceSub(channelId, channelTitle, inviteLink) {
    return await sql`
      INSERT INTO force_subs (channel_id, channel_title, invite_link)
      VALUES (${channelId}, ${channelTitle}, ${inviteLink})
      ON CONFLICT (channel_id) DO UPDATE SET channel_title = ${channelTitle}, invite_link = ${inviteLink}
    `;
  },

  async removeForceSub(channelId) {
    return await sql`DELETE FROM force_subs WHERE channel_id = ${channelId}`;
  },

  // Downloads
  async logDownload(telegramId, platform, url) {
    return await sql`
      INSERT INTO downloads (user_id, platform, url)
      VALUES (${telegramId}, ${platform}, ${url})
    `;
  },

  async getDownloadsCount() {
    const rows = await sql`SELECT COUNT(*) as count FROM downloads`;
    return parseInt(rows[0].count);
  },

  async getTopPlatforms(limit = 5) {
    return await sql`
      SELECT platform, COUNT(*) as count 
      FROM downloads 
      GROUP BY platform 
      ORDER BY count DESC 
      LIMIT ${limit}
    `;
  },

  async getStats() {
    const totalUsers = await this.getUsersCount();
    const totalDownloads = await this.getDownloadsCount();
    const bannedUsers = await this.getBannedUsersCount();
    const forceSubsCount = await this.getForceSubsCount();
    const topPlatforms = await this.getTopPlatforms(5);

    return {
      totalUsers,
      totalDownloads,
      bannedUsers,
      forceSubsCount,
      topPlatforms,
    };
  },
};
