// src/config.js
export function getConfig(env) {
  return {
    domain: env.DOMAIN,
    database: env.DATABASE,
    username: env.USERNAME,
    password: env.PASSWORD,
    enableAuth: env.ENABLE_AUTH === 'true',
    tgBotToken: env.TG_BOT_TOKEN,
    tgChatId: env.TG_CHAT_ID,
    cookie: Number(env.COOKIE) || 7,
    maxSizeMB: Number(env.MAX_SIZE_MB) || 20
  };
}
