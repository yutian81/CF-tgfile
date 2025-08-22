// src/handlers/cookie.js

export function authenticate(request, config) {
  const cookies = request.headers.get("Cookie") || "";
  const authToken = cookies.match(/auth_token=([^;]+)/);
  
  if (authToken) {
    try {
      const tokenData = JSON.parse(atob(authToken[1]));
      const now = Date.now();
      
      if (now > tokenData.expiration) {
        console.log("Token已过期");
        return false;
      }
      
      return tokenData.username === config.username;
    } catch (error) {
      console.error("Token验证失败", error);
      return false;
    }
  }
  return false;
}