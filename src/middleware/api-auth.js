export function authenticateApi(request, config) {
    // 从Header获取API Key
    const apiKeyFromHeader = request.headers.get('X-API-Key');
    
    // 从URL参数获取API Key
    const url = new URL(request.url);
    const apiKeyFromQuery = url.searchParams.get('api_key');
    
    // 检查API Key是否有效
    const providedApiKey = apiKeyFromHeader || apiKeyFromQuery;
    
    if (!providedApiKey) {
      return { authenticated: false, error: 'API Key is required' };
    }
    
    if (providedApiKey !== config.apiKey) {
      return { authenticated: false, error: 'Invalid API Key' };
    }
    
    return { authenticated: true };
}