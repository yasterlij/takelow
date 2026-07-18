const { execSync } = require('child_process');

const DB_URL = process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db';
const PROXY = 'http://localhost:3333/api/v1';

const PRODUCTS = [
  { name: 'iPhone 15 Pro Max', market_price: 1599, brand: 'Apple', description: '256GB Natural Titanium. A17 Pro chip, 48MP camera system, titanium design.', images: ['https://picsum.photos/seed/iphone15/400/400','https://picsum.photos/seed/iphone15b/400/400','https://picsum.photos/seed/iphone15c/400/400']},
  { name: 'Samsung Galaxy S24 Ultra', market_price: 1399, brand: 'Samsung', description: '512GB Titanium Gray. Galaxy AI, S Pen, 200MP camera, Snapdragon 8 Gen 3.', images: ['https://picsum.photos/seed/galaxys24/400/400','https://picsum.photos/seed/galaxys24b/400/400']},
  { name: 'Sony WH-1000XM5', market_price: 399, brand: 'Sony', description: 'Industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery life.', images: ['https://picsum.photos/seed/sonyxm5/400/400','https://picsum.photos/seed/sonyxm5b/400/400']},
  { name: 'MacBook Air M3', market_price: 1299, brand: 'Apple', description: '15-inch, 16GB RAM, 512GB SSD. Midnight finish. Up to 18 hours of battery life.', images: ['https://picsum.photos/seed/macbookair/400/400','https://picsum.photos/seed/macbookairb/400/400']},
  { name: 'PlayStation 5 Slim', market_price: 499, brand: 'Sony', description: 'Disc edition. 1TB SSD, DualSense wireless controller, 4K gaming.', images: ['https://picsum.photos/seed/ps5slim/400/400','https://picsum.photos/seed/ps5slimb/400/400']},
  { name: 'Apple Watch Ultra 2', market_price: 799, brand: 'Apple', description: '49mm titanium case, Precision dual-frequency GPS, Action button, 36hr battery.', images: ['https://picsum.photos/seed/awultra2/400/400','https://picsum.photos/seed/awultra2b/400/400']},
  { name: 'Dyson V15 Detect', market_price: 749, brand: 'Dyson', description: 'Cordless vacuum with laser slim fluffy cleaner head. Piezo sensor shows particle count.', images: ['https://picsum.photos/seed/dysonv15/400/400','https://picsum.photos/seed/dysonv15b/400/400']},
  { name: 'Nintendo Switch OLED', market_price: 349, brand: 'Nintendo', description: '7-inch OLED screen, wide adjustable stand, 64GB internal storage, enhanced audio.', images: ['https://picsum.photos/seed/nswitch/400/400','https://picsum.photos/seed/nswitchb/400/400']},
  { name: 'Bose QuietComfort Earbuds II', market_price: 279, brand: 'Bose', description: 'World-class noise cancellation, CustomTune technology, 6hr battery with 24hr case.', images: ['https://picsum.photos/seed/boseqc2/400/400']},
  { name: 'Canon EOS R50', market_price: 899, brand: 'Canon', description: '24.2MP APS-C CMOS sensor, 4K video, RF-S18-45mm lens kit, compact mirrorless.', images: ['https://picsum.photos/seed/canonr50/400/400','https://picsum.photos/seed/canonr50b/400/400']},
];

function psql(sql) {
  try {
    execSync(`psql "${DB_URL}" -q -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function toUuid(seed) {
  const h = require('crypto').createHash('md5').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

async function seedViaApi() {
  console.log('  Trying API...');
  const count = { products: 0, auctions: 0 };

  for (const p of PRODUCTS) {
    try {
      const res = await fetch(`${PROXY}/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token' },
        body: JSON.stringify({ name: p.name, current_market_price: p.market_price, brand: p.brand, description: p.description, image_urls: p.images }),
      });
      if (res.ok) { count.products++; process.stdout.write('.'); }
      else process.stdout.write('x');
    } catch { process.stdout.write('x'); }
  }

  if (count.products > 0) {
    // fetch product IDs and create auctions
    try {
      const list = await fetch(`${PROXY}/admin/products`).then(r => r.json());
      const items = Array.isArray(list) ? list : (list.data || []);
      for (let i = 0; i < items.length; i++) {
        const days = Math.floor(Math.random() * 5) + 1;
        const res = await fetch(`${PROXY}/admin/auctions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token' },
          body: JSON.stringify({ product_id: items[i].id, start_time: new Date(Date.now() - 86400000 * 3).toISOString(), end_time: new Date(Date.now() + 86400000 * days).toISOString() }),
        });
        if (res.ok) count.auctions++;
      }
    } catch {}
  }

  return count;
}

function seedViaDb() {
  console.log('  Trying direct DB...');
  const count = { products: 0, auctions: 0 };

  for (const p of PRODUCTS) {
    const pid = toUuid(`product-${p.name}`);
    const images = JSON.stringify(p.images);
    const ok = psql(`INSERT INTO products (id, name, description, image_urls, current_market_price, brand, created_at) VALUES ('${pid}', '${p.name.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${images.replace(/'/g, "''")}'::jsonb, ${p.market_price}, '${p.brand}', NOW()) ON CONFLICT (id) DO NOTHING`);
    if (ok) count.products++;
    else process.stdout.write('x');
  }

  for (let i = 0; i < PRODUCTS.length; i++) {
    const pid = toUuid(`product-${PRODUCTS[i].name}`);
    const aid = toUuid(`auction-${i}`);
    const days = Math.floor(Math.random() * 5) + 1;
    const ok = psql(`INSERT INTO auctions (id, product_id, start_time, end_time, status, created_at) VALUES ('${aid}', '${pid}', NOW() - INTERVAL '3 days', NOW() + INTERVAL '${days} days', 'ACTIVE', NOW()) ON CONFLICT (id) DO NOTHING`);
    if (ok) count.auctions++;
  }

  return count;
}

async function main() {
  console.log('🌱 Seeding TakeLow database...\n');

  let count;
  if (process.env.DB_DIRECT) {
    count = seedViaDb();
  } else {
    count = await seedViaApi();
    if (count.products === 0) {
      console.log('\n  API unavailable, falling back to direct DB...');
      count = seedViaDb();
    }
  }

  console.log(`\n  Products: ${count.products}/${PRODUCTS.length}`);
  console.log(`  Auctions: ${count.auctions}/${PRODUCTS.length}`);
  console.log('\n✨ Done!\n');
}

main().catch(e => { console.error(e); process.exit(1); });
