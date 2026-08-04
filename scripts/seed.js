const { execSync } = require('child_process');
const bcrypt = require(require('path').resolve(__dirname, '../identity-service/node_modules/bcryptjs'));

const DB_URL = process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db';
const PROXY = 'http://localhost:3333/api/v1';
const ADMIN_PHONE = '0911111111';
const ADMIN_PASSWORD = '1234';

const PRODUCTS = [
  { name: 'iPhone 15 Pro Max', bid_fee: 5, brand: 'Apple', category: 'Smartphones', description: '256GB Natural Titanium. A17 Pro chip, 48MP camera system, titanium design.', images: ['https://upload.wikimedia.org/wikipedia/commons/a/a7/IPhone_15_pro_max.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/IPhone_15_pro_max.jpg/800px-IPhone_15_pro_max.jpg'], specs: { storage: '256GB', chip: 'A17 Pro', camera: '48MP', display: '6.1" Super Retina XDR' } },
  { name: 'Samsung Galaxy S24 Ultra', bid_fee: 4, brand: 'Samsung', category: 'Smartphones', description: '512GB Titanium Gray. Galaxy AI, S Pen, 200MP camera, Snapdragon 8 Gen 3.', images: ['https://upload.wikimedia.org/wikipedia/commons/8/8e/Samsung_Galaxy_S24_Ultra.jpg'], specs: { storage: '512GB', chip: 'Snapdragon 8 Gen 3', camera: '200MP', display: '6.8" QHD+' } },
  { name: 'Sony WH-1000XM5', bid_fee: 3, brand: 'Sony', category: 'Audio', description: 'Industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery life.', images: ['https://www.classic-phones.com/cdn/shop/files/image_e0fd1474-6c62-43a8-916f-7c118e375ed6_large.jpg?v=1715270049'], specs: { type: 'Over-ear wireless', battery: '30h', noise_cancelling: 'Yes' } },
  { name: 'MacBook Air M3', bid_fee: 8, brand: 'Apple', category: 'Computers', description: '15-inch, 16GB RAM, 512GB SSD. Midnight finish. Up to 18 hours of battery life.', images: ['https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/25317236/Apple_MacBook_Air_lifestyle_display_support_240304.jpg'], specs: { screen: '15"', ram: '16GB', storage: '512GB SSD', chip: 'M3' } },
  { name: 'PlayStation 5 Slim', bid_fee: 5, brand: 'Sony', category: 'Gaming', description: 'Disc edition. 1TB SSD, DualSense wireless controller, 4K gaming.', images: ['https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png'], specs: { edition: 'Disc', storage: '1TB SSD', resolution: '4K' } },
  { name: 'Apple Watch Ultra 2', bid_fee: 2, brand: 'Apple', category: 'Electronics', description: '49mm titanium case, Precision dual-frequency GPS, Action button, 36hr battery.', images: ['https://upload.wikimedia.org/wikipedia/commons/3/33/Apple_Watch_Ultra_2.jpg'], specs: { case: '49mm titanium', gps: 'Precision dual-frequency', battery: '36h' } },
  { name: 'Nintendo Switch OLED', bid_fee: 1, brand: 'Nintendo', category: 'Gaming', description: '7-inch OLED screen, wide adjustable stand, 64GB internal storage, enhanced audio.', images: ['https://upload.wikimedia.org/wikipedia/commons/f/fe/Nintendo_Switch_OLED.png'], specs: { screen: '7" OLED', storage: '64GB', battery: '4.5-9h' } },
  { name: 'Bose QuietComfort Earbuds II', bid_fee: 1, brand: 'Bose', category: 'Audio', description: 'World-class noise cancellation, CustomTune technology, 6hr battery with 24hr case.', images: ['https://upload.wikimedia.org/wikipedia/commons/7/75/Bose_QuietComfort_Earbuds_II.jpg'], specs: { type: 'True wireless earbuds', noise_cancelling: 'Yes', battery: '6h + 24h case' } },
  { name: 'Canon EOS R50', bid_fee: 1, brand: 'Canon', category: 'Electronics', description: '24.2MP APS-C CMOS sensor, 4K video, RF-S18-45mm lens kit, compact mirrorless.', images: ['https://upload.wikimedia.org/wikipedia/commons/d/dd/Canon_EOS_R50_%2852694437103%29.jpg'], specs: { sensor: '24.2MP APS-C', video: '4K30', lens: 'RF-S18-45mm' } },
  { name: 'iPad Pro 13-inch M4', bid_fee: 2, brand: 'Apple', category: 'Tablets', description: 'Ultra Retina XDR display, M4 chip, Wi-Fi 6E, Apple Pencil Pro support, up to 1TB storage.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/IPad_Pro_13-inch_backside.jpg/500px-IPad_Pro_13-inch_backside.jpg'], specs: { display: 'Ultra Retina XDR', chip: 'M4', storage: 'up to 1TB' } },
  { name: 'AirPods Pro (2nd Gen)', bid_fee: 1, brand: 'Apple', category: 'Audio', description: 'Active noise cancellation, Adaptive Audio, USB-C MagSafe charging case, up to 6hr listening.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/AirPods_Pro_3_with_case.jpg/500px-AirPods_Pro_3_with_case.jpg'], specs: { noise_cancelling: 'Active', case: 'USB-C MagSafe', battery: '6h' } },
  { name: 'Google Pixel 9 Pro', bid_fee: 2, brand: 'Google', category: 'Smartphones', description: '6.3-inch Super Actua display, Tensor G4, 50MP triple camera, 7 years of OS updates.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Google_Pixel_9_%28Obsidian%29_front.svg/500px-Google_Pixel_9_%28Obsidian%29_front.svg.png'], specs: { screen: '6.3" Super Actua', chip: 'Tensor G4', camera: '50MP triple' } },
  { name: 'Xbox Series X', bid_fee: 1, brand: 'Microsoft', category: 'Gaming', description: '1TB SSD, 12 teraflops GPU, 4K 120fps gaming, 8K HDR support, quick resume.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Xbox_Series_X_2_%28transparent_background%29.png/500px-Xbox_Series_X_2_%28transparent_background%29.png'], specs: { storage: '1TB SSD', gpu: '12 TFLOPS', resolution: '4K 120fps' } },
  { name: 'Kindle Paperwhite (2024)', bid_fee: 1, brand: 'Amazon', category: 'Electronics', description: '7-inch 300ppi display, adjustable warm light, 12-week battery, 32GB storage, waterproof.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/2023_Amazon_Kindle_Paperwhite_%281%29.jpg/500px-2023_Amazon_Kindle_Paperwhite_%281%29.jpg'], specs: { display: '7" 300ppi', storage: '32GB', battery: '12 weeks', waterproof: 'IPX8' } },
  { name: 'GoPro HERO12 Black', bid_fee: 1, brand: 'GoPro', category: 'Electronics', description: '5.3K60 video, 27MP photos, HyperSmooth 6.0 stabilization, waterproof to 10m.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/GoPro_Hero_%288009036215%29.jpg/500px-GoPro_Hero_%288009036215%29.jpg'], specs: { video: '5.3K60', photo: '27MP', stabilization: 'HyperSmooth 6.0', waterproof: '10m' } },
  { name: 'DJI Mini 4 Pro', bid_fee: 1, brand: 'DJI', category: 'Electronics', description: 'Under 249g, 4K/60fps HDR, omnidirectional obstacle sensing, up to 34min flight time.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/2024_Dron_DJI_Mini_4_Pro_%2818%29.jpg/500px-2024_Dron_DJI_Mini_4_Pro_%2818%29.jpg'], specs: { weight: '<249g', video: '4K/60fps HDR', obstacle_sensing: 'Omnidirectional', flight_time: '34min' } },
  { name: 'Samsung Galaxy Watch 6', bid_fee: 1, brand: 'Samsung', category: 'Electronics', description: '44mm, AMOLED display, advanced sleep coaching, body composition analysis, 40hr battery.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Samsung_Galaxy_Watch_6.jpg/500px-Samsung_Galaxy_Watch_6.jpg'], specs: { size: '44mm', display: 'AMOLED', battery: '40h' } },
  { name: 'MacBook Pro 14-inch M3 Pro', bid_fee: 2, brand: 'Apple', category: 'Computers', description: 'Liquid Retina XDR display, M3 Pro chip, 18GB RAM, 512GB SSD, up to 18hr battery.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Apple_MacBook_Pro_%28M3%29.jpg/500px-Apple_MacBook_Pro_%28M3%29.jpg'], specs: { display: 'Liquid Retina XDR', chip: 'M3 Pro', ram: '18GB', storage: '512GB SSD' } },
  { name: 'Meta Quest 3', bid_fee: 1, brand: 'Meta', category: 'Electronics', description: 'Mixed reality headset, 4K+ infinite display, Snapdragon XR2 Gen 2, 128GB storage.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Meta_Quest_3_display_unit.jpg/500px-Meta_Quest_3_display_unit.jpg'], specs: { display: '4K+ Infinite', chip: 'Snapdragon XR2 Gen 2', storage: '128GB' } },
  { name: 'Sony Alpha A7 IV', bid_fee: 2, brand: 'Sony', category: 'Electronics', description: '33MP full-frame sensor, 4K60 video, real-time tracking AF, 10fps burst shooting.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Sony_A7_IV_%28ILCE-7M4%29_-_by_Henry_S%C3%B6derlund_%2851739988735%29.jpg/500px-Sony_A7_IV_%28ILCE-7M4%29_-_by_Henry_S%C3%B6derlund_%2851739988735%29.jpg'], specs: { sensor: '33MP full-frame', video: '4K60', burst: '10fps' } },
  { name: 'Fitbit Charge 6', bid_fee: 2.50, brand: 'Fitbit', category: 'Electronics', description: 'AMOLED display, built-in GPS, 40+ exercise modes, 7-day battery, heart rate tracking.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Fitbit_Charge_HR.jpg/500px-Fitbit_Charge_HR.jpg'], specs: { display: 'AMOLED', gps: 'Built-in', battery: '7 days' } },
  { name: 'Anker 737 Power Bank', bid_fee: 1, brand: 'Anker', category: 'Electronics', description: 'PowerCore 24K, 140W USB-C PD fast charging, 24000mAh, charges a laptop in 2 hours.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/2023_Powerbank_Anker_Powercore_5000mAh.jpg/500px-2023_Powerbank_Anker_Powercore_5000mAh.jpg'], specs: { capacity: '24000mAh', output: '140W USB-C PD', laptop_charging: 'Yes' } },
  { name: 'Logitech MX Master 3S', bid_fee: 1, brand: 'Logitech', category: 'Electronics', description: '8K DPI sensor, silent clicks, MagSpeed scroll wheel, USB-C, connects to 3 devices.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Logitech_MX_Master_3S_HS05.jpg/500px-Logitech_MX_Master_3S_HS05.jpg'], specs: { sensor: '8K DPI', scroll: 'MagSpeed', connectivity: 'Bluetooth + USB-C' } },
  { name: 'JBL Flip 6', bid_fee: 1.50, brand: 'JBL', category: 'Audio', description: 'Portable Bluetooth speaker, 12hr playtime, IP67 waterproof, PartyBoost pairing.', images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/JBL_Flip_4.jpg/500px-JBL_Flip_4.jpg'], specs: { type: 'Portable Bluetooth', battery: '12h', waterproof: 'IP67' } },
];

const USERS = [
  // Admins
  { name: 'Admin', phone: '0911111111', role: 'admin', balance: 50000 },
  { name: 'Admin2', phone: '0912222222', role: 'admin', balance: 75000 },
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

function psql(sql) {
  try {
    execSync(`psql "${DB_URL}" -q -v ON_ERROR_STOP=1`, {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (e) {
    console.error('  ✗ DB error:', e.stderr?.toString().trim() || e.message);
    return false;
  }
}

function toUuid(seed) {
  const h = require('crypto').createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginAsAdmin(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${PROXY}/auth/login/phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: ADMIN_PHONE, password: ADMIN_PASSWORD }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data?.access_token) {
        throw new Error('Missing access_token in login response');
      }
      return data.access_token;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * attempt);
    }
  }
  throw new Error('Unable to login as admin');
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
  const adminToken = await loginAsAdmin();

  for (const p of PRODUCTS) {
    try {
      const res = await fetch(`${PROXY}/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ name: p.name, current_market_price: 0, category: p.category, brand: p.brand, description: p.description, image_urls: p.images, specs: p.specs }),
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
          body: JSON.stringify({ product_id: items[i].id, start_time: new Date(Date.now() - 86400000 * 3).toISOString(), end_time: new Date(Date.now() + 86400000 * days).toISOString(), bid_fee: PRODUCTS[i]?.bid_fee || 1 }),
        });
        if (res.ok) count.auctions++;
      }
    } catch { }
  }

  return count;
}

function seedViaDb() {
  console.log('  Trying direct DB...');
  const count = { products: 0, auctions: 0 };

  for (const p of PRODUCTS) {
    const pid = toUuid(`product-${p.name}`);
    const images = JSON.stringify(p.images).replace(/'/g, "''");
    const specs = JSON.stringify(p.specs || {}).replace(/'/g, "''");
    const ok = psql(`INSERT INTO products (id, name, description, image_urls, current_market_price, category, brand, specs) VALUES ('${pid}', '${p.name.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${images}'::jsonb, 0, '${p.category}', '${(p.brand || '').replace(/'/g, "''")}', '${specs}'::jsonb) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_urls = EXCLUDED.image_urls, current_market_price = EXCLUDED.current_market_price, category = EXCLUDED.category, brand = EXCLUDED.brand, specs = EXCLUDED.specs`);
    if (ok) count.products++;
    else process.stdout.write('x');
  }

  for (let i = 0; i < PRODUCTS.length; i++) {
    const pid = toUuid(`product-${PRODUCTS[i].name}`);
    const aid = toUuid(`auction-${i}`);
    const days = Math.floor(Math.random() * 5) + 1;
    const ok = psql(`INSERT INTO auctions (id, product_id, start_time, end_time, status, bid_fee, created_at) VALUES ('${aid}', '${pid}', NOW() - INTERVAL '3 days', NOW() + INTERVAL '${days} days', 'ACTIVE', ${PRODUCTS[i]?.bid_fee || 1}, NOW()) ON CONFLICT (id) DO NOTHING`);
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
    try {
      count = await seedViaApi();
    } catch (e) {
      console.log(`\n  API unavailable (${e?.cause?.code || e?.message || 'error'}), falling back to direct DB...`);
      count = seedViaDb();
    }
    if (count.products === 0) {
      console.log('\n  API returned no products, falling back to direct DB...');
      count = seedViaDb();
    }
  }

  console.log(`  Products: ${count.products}/${PRODUCTS.length}`);
  console.log(`  Auctions: ${count.auctions}/${PRODUCTS.length}`);
  console.log('\n✨ Done!\n');
}

main().catch(e => { console.error(e); process.exit(1); });
