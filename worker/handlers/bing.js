export async function handleBing() {
    const cache = caches.default;
    const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');
    
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      console.log('Returning cached response');
      return cachedResponse;
    }
    
    try {
      const res = await fetch(cacheKey);
      if (!res.ok) {
        console.error(`Bing API 请求失败，状态码：${res.status}`);
        return new Response('请求 Bing API 失败', { status: res.status });
      }
      
      const bingData = await res.json();
      const images = bingData.images.map(image => ({ url: `https://cn.bing.com${image.url}` }));
      const returnData = { status: true, message: "操作成功", data: images };
      
      const response = new Response(JSON.stringify(returnData), { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=21600',
          'Access-Control-Allow-Origin': '*' 
        }
      });
      
      await cache.put(cacheKey, response.clone());
      console.log('响应数据已缓存');
      return response;
    } catch (error) {
      console.error('请求 Bing API 过程中发生错误:', error);
      return new Response('请求 Bing API 失败', { status: 500 });
    }
  }