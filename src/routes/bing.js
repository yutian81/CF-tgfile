// src/routes/bing.js

export const path = '/bing';

export async function handle(request, config) {
  const cache = caches.default;
  const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');

  // 缓存处理
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log('Returning cached response');
    return cachedResponse;
  }

  try {
    const res = await fetch(cacheKey);
    if (!res.ok) {
      console.error(`Bing API 请求失败，状态码：${res.status}`);
      return new Response(JSON.stringify({ error: '请求 Bing API 失败', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' }
      });
    }

    const bingData = await res.json();
    const images = bingData.images.map(image => ({ url: `https://cn.bing.com${image.url}` }));
    const returnData = { status: true, message: "操作成功", data: images };

    const response = new Response(JSON.stringify(returnData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Cache-Control': 'public, max-age=21600',
        'Access-Control-Allow-Origin': '*'
      }
    });

    await cache.put(cacheKey, response.clone());
    console.log('响应数据已缓存');
    return response;

  } catch (error) {
    console.error('请求 Bing API 过程中发生错误:', error);
    return new Response(JSON.stringify({ error: '请求 Bing API 失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' }
    });
  }
}
