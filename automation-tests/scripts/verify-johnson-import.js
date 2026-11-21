const { request } = require('@playwright/test');

async function main() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:80/api/' });
  const login = await ctx.post('auth/login', { data: { username: 'admin', password: 'admin123' } });
  const { token } = await login.json();
  const auth = await request.newContext({ baseURL: 'http://localhost:80/api/', extraHTTPHeaders: { Authorization: 'Bearer ' + token } });
  
  const sampleSkus = ['L0102PGM', 'L0145PGM', 'L0101PGM', 'L0166PGM', 'L0105PGM', 'L0178PGM', 'L0129PGM'];
  console.log('--- Sample Products Verification ---');
  for (const sku of sampleSkus) {
    const res = await auth.get(`products?query=${sku}&brandId=59`);
    const data = await res.json();
    const p = data.content.find(x => x.sku === sku);
    if (p) {
      console.log(`✓ SKU: ${p.sku.padEnd(10)} | Name: ${p.name.padEnd(45)} | MRP: ₹${p.mrp.toString().padEnd(6)} | Images: ${p.imageUrls.length} | ImgURL: ${p.imageUrls[0] || 'NONE'}`);
    } else {
      console.log(`✗ Product ${sku} not found`);
    }
  }

  // Count total products for brand 59
  const allBrandRes = await auth.get('products?brandId=59&size=1');
  const allBrandData = await allBrandRes.json();
  console.log(`\nTotal products for brand Johnson (ID 59): ${allBrandData.totalElements}`);
}

main().catch(console.error);
