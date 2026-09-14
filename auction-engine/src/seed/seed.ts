import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const MOCK_AUCTIONS = [
  {
    name: "iPhone 15 Pro Max",
    category: "Smartphones",
    description:
      "6.7-inch Super Retina XDR display, A17 Pro chip, titanium design and a pro camera system. The most advanced iPhone, up for grabs at the lowest unique bid.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/IPhone_15_pro_max.jpg",
    timeLeft: 2 * 3600 + 15 * 60 + 30,
    status: "live",
  },
  {
    name: 'Samsung 55" Smart TV',
    category: "Electronics",
    description:
      "Crystal UHD 4K smart TV with vivid color, slim bezels and built-in streaming. Bring the cinema home for a fraction of the price.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/1d/Samsung_LED_TV.jpg",
    timeLeft: 1 * 3600 + 45 * 60 + 10,
    status: "live",
  },
  {
    name: "Dell XPS Laptop",
    category: "Computers",
    description:
      "Ultra-thin Dell XPS with a stunning InfinityEdge display, Intel Core processor and all-day battery. Built for work and play.",
    image:
      "https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/3405340/dell-xps-0212.0.jpg",
    timeLeft: 3 * 3600 + 30 * 60 + 45,
    status: "live",
  },
  {
    name: "Wireless Headphones Pro",
    category: "Audio",
    description:
      "Premium noise-cancelling over-ear headphones with up to 30 hours of battery and crystal-clear sound.",
    image:
      "https://www.classic-phones.com/cdn/shop/files/image_e0fd1474-6c62-43a8-916f-7c118e375ed6_large.jpg?v=1715270049",
    timeLeft: 40 * 60 + 12,
    status: "ending-soon",
  },
  {
    name: "Next-Gen Game Console",
    category: "Gaming",
    description:
      "Lightning-fast next-generation console with ultra-high-speed SSD, ray tracing and one wireless controller included.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png",
    timeLeft: 5 * 3600 + 5 * 60,
    status: "live",
  },
];

async function seed() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  await prisma.$connect();
  console.log("Connected to database");

  let productsCreated = 0;
  let auctionsCreated = 0;

  for (const item of MOCK_AUCTIONS) {
    let product: any = await prisma.product.findFirst({
      where: { name: item.name, category: item.category },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: item.name,
          description: item.description,
          image_urls: [item.image],
          current_market_price: 0,
          category: item.category,
        },
      });
      productsCreated++;
      console.log(`  Created product: ${item.name}`);
    } else {
      console.log(`  Skipped product (exists): ${item.name}`);
    }

    const existing = await prisma.auction.findFirst({
      where: { product_id: product.id, status: "ACTIVE" },
    });
    if (!existing) {
      const now = new Date();
      const auctionStatus = "ACTIVE";
      const auction = await prisma.auction.create({
        data: {
          product_id: product.id,
          start_time: now,
          end_time: new Date(now.getTime() + item.timeLeft * 1000),
          status: auctionStatus,
        },
      });
      auctionsCreated++;
      console.log(
        `  Created auction for: ${item.name} (ends ${auction.end_time.toISOString()})`,
      );
    } else {
      console.log(`  Skipped auction (active exists): ${item.name}`);
    }
  }

  console.log(
    `\nDone — ${productsCreated} products, ${auctionsCreated} auctions created`,
  );
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
