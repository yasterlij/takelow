import type { VercelRequest, VercelResponse } from '@vercel/node';

const USERS = [
  { name: 'Admin Awash', phone: '0911111111', role: 'admin', password: '1234' },
  { name: 'Abebech Ayele', phone: '0912222222', role: 'admin', password: '1234' },
  { name: 'Selam Tesfaye', phone: '0913320001', role: 'user', password: '0000' },
  { name: 'Abebe Kebede', phone: '0913320002', role: 'user', password: '0000' },
  { name: 'Meron Tadesse', phone: '0913320003', role: 'user', password: '0000' },
  { name: 'Yonas Alemu', phone: '0913320004', role: 'user', password: '0000' },
  { name: 'Hanna Wondimu', phone: '0913320005', role: 'user', password: '0000' },
  { name: 'Dawit Hailu', phone: '0913320006', role: 'user', password: '0000' },
  { name: 'Saron Girmay', phone: '0913320007', role: 'user', password: '0000' },
  { name: 'Biruk Assefa', phone: '0913320008', role: 'user', password: '0000' },
  { name: 'Tigist Woldie', phone: '0913320009', role: 'user', password: '0000' },
  { name: 'Henok Desta', phone: '0913320010', role: 'user', password: '0000' },
  { name: 'Betelhem Amanuel', phone: '0913320011', role: 'user', password: '0000' },
  { name: 'Ephrem Teshome', phone: '0913320012', role: 'user', password: '0000' },
  { name: 'Ruth Mekonnen', phone: '0913320013', role: 'user', password: '0000' },
  { name: 'Nahom Wolde', phone: '0913320014', role: 'user', password: '0000' },
  { name: 'Makeda Haile', phone: '0913320015', role: 'user', password: '0000' },
  { name: 'Kaleb Zerihun', phone: '0913320016', role: 'user', password: '0000' },
  { name: 'Tsion Bekele', phone: '0913320017', role: 'user', password: '0000' },
  { name: 'Samuel Girma', phone: '0913320018', role: 'user', password: '0000' },
  { name: 'Frehiwot Abate', phone: '0913320019', role: 'user', password: '0000' },
  { name: 'Mintesinot Desalegn', phone: '0913320020', role: 'user', password: '0000' },
  { name: 'Birtukan Fikre', phone: '0913320021', role: 'user', password: '0000' },
  { name: 'Fikadu Tesfaye', phone: '0913320022', role: 'user', password: '0000' },
  { name: 'Sisay Demissie', phone: '0913320023', role: 'user', password: '0000' },
  { name: 'Yetnayet Abraha', phone: '0913320024', role: 'user', password: '0000' },
  { name: 'Tewodros Shiferaw', phone: '0913320025', role: 'user', password: '0000' },
  { name: 'Blen Ashenafi', phone: '0913320026', role: 'user', password: '0000' },
  { name: 'Liyu Lemma', phone: '0913320027', role: 'user', password: '0000' },
  { name: 'Amanuel Berhane', phone: '0913320028', role: 'user', password: '0000' },
];

const PRODUCTS = [
  { name: 'iPhone 15 Pro Max', market_price: 1599, brand: 'Apple', description: '256GB Natural Titanium. A17 Pro chip, 48MP camera system, titanium design.', images: ['https://upload.wikimedia.org/wikipedia/commons/a/a7/IPhone_15_pro_max.jpg'] },
  { name: 'Samsung Galaxy S24 Ultra', market_price: 1399, brand: 'Samsung', description: '512GB Titanium Gray. Galaxy AI, S Pen, 200MP camera, Snapdragon 8 Gen 3.', images: ['https://upload.wikimedia.org/wikipedia/commons/8/8e/Samsung_Galaxy_S24_Ultra.jpg'] },
  { name: 'Sony WH-1000XM5', market_price: 399, brand: 'Sony', description: 'Industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery life.', images: ['https://www.classic-phones.com/cdn/shop/files/image_e0fd1474-6c62-43a8-916f-7c118e375ed6_large.jpg?v=1715270049'] },
  { name: 'MacBook Air M3', market_price: 1299, brand: 'Apple', description: '15-inch, 16GB RAM, 512GB SSD. Midnight finish. Up to 18 hours of battery life.', images: ['https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/25317236/Apple_MacBook_Air_lifestyle_display_support_240304.jpg'] },
  { name: 'PlayStation 5 Slim', market_price: 499, brand: 'Sony', description: 'Disc edition. 1TB SSD, DualSense wireless controller, 4K gaming.', images: ['https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png'] },
  { name: 'Apple Watch Ultra 2', market_price: 799, brand: 'Apple', description: '49mm titanium case, Precision dual-frequency GPS, Action button, 36hr battery.', images: ['https://upload.wikimedia.org/wikipedia/commons/3/33/Apple_Watch_Ultra_2.jpg'] },
  { name: 'Dyson V15 Detect', market_price: 749, brand: 'Dyson', description: 'Cordless vacuum with laser slim fluffy cleaner head. Piezo sensor shows particle count.', images: ['https://cdn.mos.cms.futurecdn.net/hwLcUhuTrjQgVVonHTjafM.jpg'] },
  { name: 'Nintendo Switch OLED', market_price: 349, brand: 'Nintendo', description: '7-inch OLED screen, wide adjustable stand, 64GB internal storage, enhanced audio.', images: ['https://upload.wikimedia.org/wikipedia/commons/f/fe/Nintendo_Switch_OLED.png'] },
  { name: 'Bose QuietComfort Earbuds II', market_price: 279, brand: 'Bose', description: 'World-class noise cancellation, CustomTune technology, 6hr battery with 24hr case.', images: ['https://upload.wikimedia.org/wikipedia/commons/7/75/Bose_QuietComfort_Earbuds_II.jpg'] },
  { name: 'Canon EOS R50', market_price: 899, brand: 'Canon', description: '24.2MP APS-C CMOS sensor, 4K video, RF-S18-45mm lens kit, compact mirrorless.', images: ['https://upload.wikimedia.org/wikipedia/commons/d/dd/Canon_EOS_R50_%2852694437103%29.jpg'] },
];

const API_BASE = process.env.VITE_API_BASE_URL || '';
const SETUP_KEY = process.env.SETUP_KEY || '';

async function api(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (SETUP_KEY && req.headers['x-setup-key'] !== SETUP_KEY) {
    return res.status(401).json({ error: 'Invalid setup key' });
  }

  if (!API_BASE) {
    return res.status(400).json({ error: 'VITE_API_BASE_URL not configured' });
  }

  const results = { users: 0, products: 0, auctions: 0, errors: [] as string[] };

  try {
    for (const u of USERS) {
      try {
        const regRes = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ phone_number: u.phone, password: u.password, full_name: u.name }),
        });
        if (regRes.ok || regRes.status === 409) {
          results.users++;
        } else {
          const body = await regRes.text();
          results.errors.push(`User ${u.phone}: ${regRes.status} ${body}`);
        }
      } catch (e) {
        results.errors.push(`Failed to create user ${u.phone}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    const adminLogin = await api('/auth/login/phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number: '0911111111', password: '1234' }),
    });

    if (!adminLogin.ok) {
      return res.status(500).json({ error: 'Admin login failed after seeding users', results });
    }

    const adminData = await adminLogin.json();
    const adminToken = adminData.access_token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    const userListRes = await api('/admin/users', { headers: adminHeaders });
    if (userListRes.ok) {
      const userList = await userListRes.json();
      const userArr = Array.isArray(userList) ? userList : (userList.data || []);

      for (const u of USERS.filter((u) => u.role === 'admin')) {
        const found = userArr.find((x: any) => x.phone_number === u.phone);
        if (found) {
          await api(`/admin/users/${found.id}/role`, {
            method: 'PATCH',
            headers: adminHeaders,
            body: JSON.stringify({ role: 'admin' }),
          });
        }
      }
    }

    for (const p of PRODUCTS) {
      try {
        const prodRes = await api('/admin/products', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            name: p.name,
            current_market_price: p.market_price,
            brand: p.brand,
            description: p.description,
            image_urls: p.images,
          }),
        });
        if (prodRes.ok) results.products++;
        else {
          const body = await prodRes.text();
          results.errors.push(`Product ${p.name}: ${prodRes.status} ${body}`);
        }
      } catch (e) {
        results.errors.push(`Failed to create product ${p.name}`);
      }
    }

    try {
      const listRes = await api('/admin/products', { headers: adminHeaders });
      if (listRes.ok) {
        const list = await listRes.json();
        const items = Array.isArray(list) ? list : (list.data || []);
        for (let i = 0; i < items.length; i++) {
          const days = Math.floor(Math.random() * 5) + 1;
          const aucRes = await api('/admin/auctions', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
              product_id: items[i].id,
              start_time: new Date(Date.now() - 86400000 * 3).toISOString(),
              end_time: new Date(Date.now() + 86400000 * days).toISOString(),
            }),
          });
          if (aucRes.ok) results.auctions++;
        }
      }
    } catch {
      results.errors.push('Failed to create auctions');
    }

    return res.status(200).json({
      message: 'Seed complete',
      results,
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Seed failed',
      message: e instanceof Error ? e.message : 'Unknown error',
      results,
    });
  }
}
