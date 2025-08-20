import { handleLoginRequest } from './login.js';
import { handleUploadRequest } from './upload.js';
import { authenticate } from '../auth.js';

export async function handleAuthRequest(request, config) {
  if (config.enableAuth) {
    const isAuthenticated = authenticate(request, config);
    if (!isAuthenticated) {
      return handleLoginRequest(request, config);
    }
    return handleUploadRequest(request, config);
  }
  return handleUploadRequest(request, config);
}