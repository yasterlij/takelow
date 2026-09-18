import { Platform } from "react-native";
import {
  createTakelowApi,
  ApiError,
  type SessionExpireReason,
  type ErrorCategory,
  type ApiProduct,
  type ApiWinnerInfo,
  type ApiAuction,
  type ReopenAuctionPayload,
  type ApiBid,
  type ApiWinnerResult,
  type ApiAuctionResult,
  type AuthResponse,
  type ApiUser,
  type ApiNotification,
  type ApiFavorite,
  type ApiSettlementReport,
  type ApiSettlementRow,
  type ApiDailySettlement,
  type ApiPendingWinner,
  type ApiWinnerStats,
  type ApiDispute,
  type ApiRbacOverride,
  type ApiAccessDecision,
} from "@takelow/api";

export type {
  SessionExpireReason,
  ErrorCategory,
  ApiProduct,
  ApiWinnerInfo,
  ApiAuction,
  ReopenAuctionPayload,
  ApiBid,
  ApiWinnerResult,
  ApiAuctionResult,
  AuthResponse,
  ApiUser,
  ApiNotification,
  ApiFavorite,
  ApiSettlementReport,
  ApiSettlementRow,
  ApiDailySettlement,
  ApiPendingWinner,
  ApiWinnerStats,
  ApiDispute,
  ApiRbacOverride,
  ApiAccessDecision,
};
export { ApiError };

const PROD_HOST = "196.189.237.158";
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const USE_PROD = true;

const HOST = USE_PROD ? PROD_HOST : DEV_HOST;
const IDENTITY_API = `http://${HOST}${USE_PROD ? "" : ":3001"}/api/v1`;
const QUERY_API = `http://${HOST}${USE_PROD ? "" : ":3003"}/api/v1`;
const ENGINE_API = `http://${HOST}${USE_PROD ? "" : ":3002"}/api/v1`;

export const API_HOST = HOST;

const client = createTakelowApi({
  identityBaseUrl: IDENTITY_API,
  engineBaseUrl: ENGINE_API,
  queryBaseUrl: QUERY_API,
  requestTimeoutMs: 15_000,
});

export const {
  api,
  setApiToken,
  getApiToken,
  setRefreshToken,
  getRefreshToken,
  getAccessTokenExpiry,
  getUserFriendlyMessage,
  onSessionExpired,
} = client;
