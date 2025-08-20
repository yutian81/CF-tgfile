export function getContentType(ext) {
    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg', 
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      icon: 'image/x-icon',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      pdf: 'application/pdf',
      txt: 'text/plain',
      md: 'text/markdown',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      json: 'application/json',
      xml: 'application/xml',
      ini: 'text/plain',
      js: 'application/javascript',
      yml: 'application/yaml',
      yaml: 'application/yaml',
      py: 'text/x-python',
      sh: 'application/x-sh'
    };
    return types[ext] || 'application/octet-stream';
}