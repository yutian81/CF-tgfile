// src/utils/escape.js

export function escapeJsString(str) {
  return str
    ? str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(/"/g, '\\"')
         .replace(/\n/g, '\\n')
         .replace(/\r/g, '\\r')
    : '';
}
