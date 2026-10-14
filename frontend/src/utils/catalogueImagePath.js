// Never forward CRM credentials to an image URL supplied by an external origin.
export function catalogueImagePath(value, apiBase, frontendOrigin) {
  const base = new URL(apiBase, frontendOrigin);
  const image = new URL(value, base.origin);
  const prefix = base.pathname.replace(/\/$/, '');
  if (image.origin !== base.origin || image.username || image.password
    || !image.pathname.startsWith(prefix + '/files/download/products/')) {
    throw new Error('Catalogue image must use the configured CRM download endpoint');
  }
  for (const segment of image.pathname.split('/')) {
    const decoded = decodeURIComponent(segment);
    if (decoded === '.' || decoded === '..' || /[/\\]/.test(decoded)) throw new Error('Invalid catalogue image path');
  }
  return image.pathname.slice(prefix.length);
}
