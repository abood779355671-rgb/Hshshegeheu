# Telegram Media Downloader Bot

## متغيرات البيئة المطلوبة
- `BOT_TOKEN` - توكن البوت من BotFather
- `DATABASE_URL` - رابط قاعدة البيانات PostgreSQL
- `ADMIN_IDS` - معرفات المسؤولين مفصولة بفواصل

## تشغيل البوت
```
npm install
npm start
```

## تفعيل Webhook
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/bot
```
