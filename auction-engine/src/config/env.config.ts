import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  port: parseInt(process.env.PORT || "3000", 10),
  jwtSecret: process.env.JWT_SECRET || "takelow-jwt-secret",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://admin:secret@localhost:5432/takelow_db",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  bidFee: parseInt(process.env.BID_FEE || "50", 10),
  sikinaSecretKey: process.env.SIKINA_SECRET_KEY || "",
  sikinaWebhookSecret: process.env.SIKINA_WEBHOOK_SECRET || "",
  sikinaBaseUrl: process.env.SIKINA_BASE_URL || "https://sandbox.sikinapay.com",
  sikinaSuccessRedirectUrl: process.env.SIKINA_SUCCESS_REDIRECT_URL || "",
  sikinaFailedRedirectUrl: process.env.SIKINA_FAILED_REDIRECT_URL || "",
  sikinaWebhookUrl: process.env.SIKINA_WEBHOOK_URL || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
  awashMerchantId: process.env.AWASH_MERCHANT_ID || "",
  awashSecretKey: process.env.AWASH_SECRET_KEY || "",
  awashWebhookSecret: process.env.AWASH_WEBHOOK_SECRET || "",
  awashBaseUrl: process.env.AWASH_BASE_URL || "https://sandbox.awashbank.com",
  uploadBaseUrl:
    process.env.UPLOAD_BASE_URL ||
    `http://localhost:${parseInt(process.env.PORT || "3000", 10)}`,
}));
