// src/routes/api/check.js

export const path = '/check';

import { authenticate } from '../../middleware/cookie.js';

export async function handle(request, config) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: '方法不允许' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' }
    });
  }

  const loggedIn = config.enableAuth ? authenticate(request, config) : true;

  return new Response(JSON.stringify({
    success: true,
    loggedIn,
    maxSizeMB: config.maxSizeMB,
    enableAuth: config.enableAuth
  }), {
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  });
}
