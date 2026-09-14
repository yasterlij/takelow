import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductDto, UpdateProductDto } from "./dto/admin.dto";
import { ImageService } from "./image.service";
import { normalizeProductCategory } from "./product-categories";

@Injectable()
export class ProductAdminService {
  private readonly logger = new Logger(ProductAdminService.name);
  private readonly specKeys = [
    "storage",
    "ram",
    "edition",
    "battery",
    "camera",
    "osVersion",
    "display",
    "chipset",
  ] as const;

  constructor(
    private prisma: PrismaService,
    private imageService: ImageService,
  ) {}

  private isMissingColumnError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("public_code") || message.includes("specs");
  }

  private async listProductsFallback(page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $${params.length}`;
    }
    params.push(limit, offset);
    const rows = await this.prisma.repository("product").query(
      `SELECT id, name, description, image_urls, current_market_price, category, brand, created_at
       FROM products
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countRows = await this.prisma.repository("product").query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      search ? [`%${search}%`] : [],
    );
    const total = countRows[0]?.total || 0;
    return {
      data: rows.map((row: any) => ({
        ...row,
        category: normalizeProductCategory(row.category, row.name),
        specs: null,
      })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  private normalizeSpecs(specs?: Record<string, string>) {
    if (!specs || typeof specs !== "object") return null;
    const normalized = this.specKeys.reduce<Record<string, string>>(
      (acc, key) => {
        const value = specs[key];
        if (typeof value === "string" && value.trim()) acc[key] = value.trim();
        return acc;
      },
      {},
    );
    return Object.keys(normalized).length ? normalized : null;
  }

  async listProducts(page = 1, limit = 20, search?: string) {
    try {
      const where: any = {};
      if (search) where.name = { contains: `%${search}%` };
      const [data, total] = await this.prisma.repository("product").findAndCount({
        where,
        order: { created_at: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data,
        meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      return this.listProductsFallback(page, limit, search);
    }
  }

  async createProduct(dto: CreateProductDto) {
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    data.category = normalizeProductCategory(data.category, data.name);
    data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    try {
      return await this.prisma.repository("product").save(
        this.prisma.repository("product").create(data),
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("product").query(
        `INSERT INTO products (name, description, image_urls, current_market_price, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          data.name,
          data.description || null,
          data.image_urls || null,
          data.current_market_price,
          data.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(rows[0]?.category, data.name),
        specs: null,
      };
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    let product = null as any;
    try {
      product = await this.prisma.repository("product").findOne({ where: { id } });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("product").query(
        `SELECT id, name, description, image_urls, current_market_price, brand, created_at FROM products WHERE id = $1 LIMIT 1`,
        [id],
      );
      product = rows[0] || null;
    }
    if (!product) throw new NotFoundException("Product not found");
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    if (data.category !== undefined) {
      data.category = normalizeProductCategory(
        data.category,
        data.name ?? product.name,
      );
    }
    if (data.specs !== undefined) {
      data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    }
    Object.assign(product, data);
    try {
      return await this.prisma.repository("product").save(product);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("product").query(
        `UPDATE products
         SET name = $2, description = $3, image_urls = $4, current_market_price = $5, category = $6
         WHERE id = $1
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          id,
          product.name,
          product.description || null,
          product.image_urls || null,
          product.current_market_price,
          product.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(product.category, product.name),
        specs: null,
      };
    }
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.repository("product").findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    await this.prisma.repository("product").remove(product);
    return { deleted: true, id };
  }

  async downloadProductImages(id: string) {
    const product = await this.prisma.repository("product").findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.image_urls?.length) {
      return { downloaded: 0, message: "No images to download" };
    }
    const localUrls = await this.imageService.processImageUrls(
      product.image_urls,
    );
    product.image_urls = localUrls;
    await this.prisma.repository("product").save(product);
    const downloaded = localUrls.filter((u) =>
      u.startsWith("/uploads/"),
    ).length;
    return { downloaded, total: product.image_urls.length };
  }

  async downloadAllProductImages() {
    const products = await this.prisma.repository("product").find({});
    let total = 0;
    for (const product of products) {
      if (!product.image_urls?.length) continue;
      const localUrls = await this.imageService.processImageUrls(
        product.image_urls,
      );
      product.image_urls = localUrls;
      await this.prisma.repository("product").save(product);
      total += localUrls.filter((u) => u.startsWith("/uploads/")).length;
    }
    return { downloaded: total, products: products.length };
  }

  async bulkDeleteProducts(ids: string[]) {
    const products = await this.prisma.repository("product").find({
      where: { id: { in: ids } },
    });
    await this.prisma.repository("product").remove(products);
    return { deleted: products.length };
  }

  async approveProduct(productId: string, adminId: string) {
    const product = await this.prisma.repository("product").findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const now = new Date();
    try {
      return await this.prisma.repository("product").update(
        { id: productId },
        {
          approval_status: "APPROVED",
          approved_by: adminId,
          approved_at: now,
        },
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      await this.prisma.repository("product").query(
        `UPDATE products
         SET approval_status = 'APPROVED', approved_by = $2, approved_at = $3
         WHERE id = $1
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at, approval_status, approved_by, approved_at`,
        [productId, adminId, now],
      );
      return { id: productId, approval_status: "APPROVED", approved_by: adminId, approved_at: now };
    }
  }

  async rejectProduct(productId: string, adminId: string, reason?: string) {
    const product = await this.prisma.repository("product").findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const now = new Date();
    try {
      return await this.prisma.repository("product").update(
        { id: productId },
        {
          approval_status: "REJECTED",
          approved_by: adminId,
          approved_at: now,
        },
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      await this.prisma.repository("product").query(
        `UPDATE products
         SET approval_status = 'REJECTED', approved_by = $2, approved_at = $3
         WHERE id = $1
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at, approval_status, approved_by, approved_at`,
        [productId, adminId, now],
      );
      return { id: productId, approval_status: "REJECTED", approved_by: adminId, approved_at: now, reason };
    }
  }

  async listPendingProducts(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    try {
      const [data, total] = await this.prisma.repository("product").findAndCount({
        where: { approval_status: "PENDING" },
        order: { created_at: "DESC" },
        skip: offset,
        take: limit,
      });
      return {
        data,
        meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("product").query(
        `SELECT id, name, description, image_urls, current_market_price, category, brand, created_at
         FROM products
         WHERE approval_status = 'PENDING'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const countRows = await this.prisma.repository("product").query(
        `SELECT COUNT(*)::int AS total FROM products WHERE approval_status = 'PENDING'`,
      );
      const total = countRows[0]?.total || 0;
      return {
        data: rows.map((row: any) => ({
          ...row,
          category: normalizeProductCategory(row.category, row.name),
          specs: null,
          approval_status: "PENDING",
        })),
        meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
      };
    }
  }

  async exportProductsCsv(search?: string) {
    const where: any = {};
    if (search) where.name = { contains: `%${search}%` };
    let products: any[] = [];
    try {
      products = await this.prisma.repository("product").find({
        where,
        order: { created_at: "DESC" },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const fallback = await this.listProductsFallback(1, 100000, search);
      products = fallback.data;
    }
    const header =
      "id,name,description,category,current_market_price,specs,created_at";
    const rows = products.map((p) =>
      [
        p.id,
        p.name,
        (p.description || "").replace(/,/g, ";"),
        p.category || normalizeProductCategory(undefined, p.name),
        p.current_market_price,
        JSON.stringify(p.specs || {}).replace(/,/g, ";"),
        p.created_at,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }
}
