const { execSync } = require('child_process');
const bcrypt = require(require('path').resolve(__dirname, '../identity-service/node_modules/bcryptjs'));

const DB_URL = process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db';
const PROXY = 'http://localhost:3333/api/v1';
const USE_DOCKER = !process.env.DB_URL && process.env.USE_DOCKER !== 'false';

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

const USERS = [
  // Admins
  { name: 'Admin Awash', phone: '0911111111', role: 'admin', balance: 50000 },
  { name: 'Abebech Ayele', phone: '0912222222', role: 'admin', balance: 75000 },
  // Regular users (28)
  { name: 'Selam Tesfaye', phone: '0913320001', role: 'user', balance: 4250.75 },
  { name: 'Abebe Kebede', phone: '0913320002', role: 'user', balance: 3120.50 },
  { name: 'Meron Tadesse', phone: '0913320003', role: 'user', balance: 5800.00 },
  { name: 'Yonas Alemu', phone: '0913320004', role: 'user', balance: 2100.25 },
  { name: 'Hanna Wondimu', phone: '0913320005', role: 'user', balance: 6750.00 },
  { name: 'Dawit Hailu', phone: '0913320006', role: 'user', balance: 890.50 },
  { name: 'Saron Girmay', phone: '0913320007', role: 'user', balance: 15000.00 },
  { name: 'Biruk Assefa', phone: '0913320008', role: 'user', balance: 3200.00 },
  { name: 'Tigist Woldie', phone: '0913320009', role: 'user', balance: 4950.75 },
  { name: 'Henok Desta', phone: '0913320010', role: 'user', balance: 11000.00 },
  { name: 'Betelhem Amanuel', phone: '0913320011', role: 'user', balance: 780.25 },
  { name: 'Ephrem Teshome', phone: '0913320012', role: 'user', balance: 2340.00 },
  { name: 'Ruth Mekonnen', phone: '0913320013', role: 'user', balance: 6050.00 },
  { name: 'Nahom Wolde', phone: '0913320014', role: 'user', balance: 4180.50 },
  { name: 'Makeda Haile', phone: '0913320015', role: 'user', balance: 999.99 },
  { name: 'Kaleb Zerihun', phone: '0913320016', role: 'user', balance: 8400.00 },
  { name: 'Tsion Bekele', phone: '0913320017', role: 'user', balance: 2750.00 },
  { name: 'Samuel Girma', phone: '0913320018', role: 'user', balance: 3500.00 },
  { name: 'Frehiwot Abate', phone: '0913320019', role: 'user', balance: 12000.00 },
  { name: 'Mintesinot Desalegn', phone: '0913320020', role: 'user', balance: 540.00 },
  { name: 'Birtukan Fikre', phone: '0913320021', role: 'user', balance: 7120.50 },
  { name: 'Fikadu Tesfaye', phone: '0913320022', role: 'user', balance: 4600.00 },
  { name: 'Sisay Demissie', phone: '0913320023', role: 'user', balance: 1890.25 },
  { name: 'Yetnayet Abraha', phone: '0913320024', role: 'user', balance: 9500.00 },
  { name: 'Tewodros Shiferaw', phone: '0913320025', role: 'user', balance: 320.75 },
  { name: 'Blen Ashenafi', phone: '0913320026', role: 'user', balance: 13500.00 },
  { name: 'Liyu Lemma', phone: '0913320027', role: 'user', balance: 2800.00 },
  { name: 'Amanuel Berhane', phone: '0913320028', role: 'user', balance: 6075.00 },
];

const { writeFileSync, unlinkSync } = require('fs');
const { join } = require('path');
let seq = 0;
function psql(sql) {
  try {
    if (USE_DOCKER) {
      const tmp = join(__dirname, `.seed-tmp-${seq++}.sql`);
      writeFileSync(tmp, sql);
      const result = execSync(`cat "${tmp}" | docker compose exec -T postgres-primary psql -U admin -d takelow_db -q 2>/dev/null`, { stdio: 'pipe', shell: '/bin/bash' });
      try { unlinkSync(tmp); } catch {}
      return result !== null;
    } else {
      execSync(`psql "${DB_URL}" -q -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
      return true;
    }
  } catch { return false; }
}

function toUuid(seed) {
  const h = require('crypto').createHash('md5').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

function seedUsers() {
  console.log('  Seeding users...');
  const userPinHash = bcrypt.hashSync('0000', 10);
  const adminPinHash = bcrypt.hashSync('1234', 10);
  let count = 0;

  for (const u of USERS) {
    const id = toUuid(`user-${u.phone}`);
    const pinHash = u.role === 'admin' ? adminPinHash : userPinHash;
    const name = u.name.replace(/'/g, "''");
    const ok = psql(`INSERT INTO users (id, phone_number, full_name, password_hash, wallet_pin_hash, wallet_balance, role, phone_verified, auth_provider, pin_attempts, created_at) VALUES ('${id}', '${u.phone}', '${name}', '${pinHash}', '${pinHash}', ${u.balance}, '${u.role}', true, 'LOCAL', 0, NOW()) ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, wallet_pin_hash = EXCLUDED.wallet_pin_hash, wallet_balance = EXCLUDED.wallet_balance, role = EXCLUDED.role, phone_verified = EXCLUDED.phone_verified, pin_attempts = 0, pin_locked_until = NULL`);
    if (ok) count++;
  }
  // Recover any users whose data was corrupted (password_hash, balance, etc. set to NULL) and reset pin lockouts
  psql(`UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE pin_attempts > 0 OR pin_locked_until IS NOT NULL`);
  return count;
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

  let userCount = seedUsers();
  console.log(`  Users: ${userCount}/${USERS.length}`);

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

  console.log(`  Products: ${count.products}/${PRODUCTS.length}`);
  console.log(`  Auctions: ${count.auctions}/${PRODUCTS.length}`);
  console.log('\n✨ Done!\n');
}

main().catch(e => { console.error(e); process.exit(1); });
