const templateCache = new Map();

export async function loadTemplate(name) {
  if (templateCache.has(name)) return templateCache.get(name);
  
  const response = await fetch(`/html/${name}`);
  const html = await response.text();
  templateCache.set(name, html);
  return html;
}

export function render(template, data) {
  return Object.entries(data).reduce((result, [key, val]) => 
    result.replace(new RegExp(`{{${key}}}`, 'g'), val), 
  template);
}
