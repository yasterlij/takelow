import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

export const UPLOADS_DIR = path.join(process.cwd(), "uploads", "products");

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  private uploadBaseUrl: string;

  constructor(private configService: ConfigService) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    this.uploadBaseUrl = this.configService.get<string>("app.uploadBaseUrl")!;
  }

  isUrl(str: string): boolean {
    return str.startsWith("http://") || str.startsWith("https://");
  }

  isLocalPath(str: string): boolean {
    return str.startsWith("/uploads/") || str.includes("/uploads/");
  }

  private isPrivateIp(hostname: string): boolean {
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1") {
      return true;
    }
    if (net.isIPv4(hostname)) {
      const parts = hostname.split(".").map(Number);
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 127) return true;
      if (parts[0] === 0) return true;
      if (parts[0] === 169 && parts[1] === 254) return true;
    }
    return false;
  }

  private isAllowedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") {
        this.logger.warn(`SSRF blocked: non-HTTPS URL ${url}`);
        return false;
      }
      if (this.isPrivateIp(parsed.hostname)) {
        this.logger.warn(`SSRF blocked: private IP/hostname ${parsed.hostname} in URL ${url}`);
        return false;
      }
      const ext = path.extname(parsed.pathname).toLowerCase();
      if (ext && !ALLOWED_IMAGE_EXTENSIONS.includes(ext) && ext !== "") {
        this.logger.warn(`SSRF blocked: disallowed extension ${ext} in URL ${url}`);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async downloadImage(url: string): Promise<string | null> {
    if (!this.isAllowedUrl(url)) {
      this.logger.warn(`SSRF blocked download for: ${url}`);
      return null;
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        this.logger.warn(`Failed to download ${url}: ${response.status}`);
        return null;
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType.split(";")[0].trim().toLowerCase())) {
        this.logger.warn(`SSRF blocked: disallowed MIME type ${contentType} from ${url}`);
        return null;
      }
      const ext = this.extensionFromMime(contentType) || ".jpg";
      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = `${uuidv4()}${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      this.logger.log(`Downloaded ${url} -> ${filePath}`);
      return `${this.uploadBaseUrl}/uploads/products/${filename}`;
    } catch (e) {
      this.logger.warn(`Failed to download ${url}: ${e.message}`);
      return null;
    }
  }

  async processImageUrls(urls: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const url of urls) {
      if (this.isLocalPath(url)) {
        results.push(url);
      } else if (this.isUrl(url)) {
        const local = await this.downloadImage(url);
        if (local) {
          results.push(local);
        }
      } else {
        results.push(url);
      }
    }
    return results;
  }

  deleteLocalImage(imageUrl: string): void {
    const relativePath = this.extractRelativePath(imageUrl);
    if (!relativePath) return;
    const fullPath = path.join(process.cwd(), relativePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`Deleted local image: ${fullPath}`);
      }
    } catch (e) {
      this.logger.warn(`Failed to delete ${fullPath}: ${e.message}`);
    }
  }

  private extractRelativePath(imageUrl: string): string | null {
    if (imageUrl.startsWith("/uploads/")) return imageUrl;
    const idx = imageUrl.indexOf("/uploads/");
    if (idx !== -1) return imageUrl.slice(idx);
    return null;
  }

  private extensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/bmp": ".bmp",
    };
    const normalized = mime.split(";")[0].trim().toLowerCase();
    return map[normalized] || ".jpg";
  }
}
