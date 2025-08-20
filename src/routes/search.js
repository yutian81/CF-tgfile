import { searchFilesService } from '../handlers/file-service.js';
import { authenticate } from '../auth.js';

export async function handleSearchRequest(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  try {
    const { query } = await request.json();
    
    const files = await searchFilesService(config, query);
    
    return new Response(
      JSON.stringify({ files }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Search Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}