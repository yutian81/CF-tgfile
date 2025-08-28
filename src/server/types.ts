import type { D1Database } from '@cloudflare/workers-types';

export type Bindings = {
    DATABASE: D1Database;
    DOMAIN: string;
    ENABLE_AUTH: 'true' | 'false';
    COOKIE: string;
    MAX_SIZE_MB: string;
    TG_CHAT_ID: string;
    USERNAME: string;
    PASSWORD: string;
    TG_BOT_TOKEN: string;
};