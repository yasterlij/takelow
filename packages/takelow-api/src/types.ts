export type SessionExpireReason =
  | "expired"
  | "idle"
  | "absolute"
  | "refresh-failed"
  | "logout";

export type ErrorCategory =
  | "auth"
  | "validation"
  | "network"
  | "server"
  | "unknown";

export type ApiProduct = {
  id: string;
  name: string;
  description: string | null;
  image_urls: string[] | null;
  current_market_price: number;
  category: string | null;
  brand: string | null;
  specs?: Record<string, string> | null;
  created_at: string;
};

export type ApiWinnerInfo = {
  user_id: string;
  amount: number;
  rank: number;
  payment_status?: string | null;
  payment_deadline?: string | null;
  name?: string;
  phone?: string;
};

export type ApiAuction = {
  id: string;
  public_code?: string;
  product_id: string;
  product: ApiProduct | null;
  start_time: string;
  end_time: string;
  status: "ACTIVE" | "CLOSED" | "EXPIRED";
  winner_user_id: string | null;
  winning_bid_amount: number | null;
  winners?: ApiWinnerInfo[];
  winners_count?: number;
  created_at: string;
  stats?: { total_bids: number; unique_bidders: number };
};

export type ReopenAuctionPayload = {
  start_time: string;
  end_time: string;
  min_bid?: number;
  max_bid?: number;
  bid_fee?: number;
  name?: string;
  category?: string;
  description?: string;
  image_urls?: string[];
  current_market_price?: number;
};

export type ApiBid = {
  id: string;
  user_id: string;
  user_name?: string | null;
  auction_id: string;
  amount: number;
  encrypted_amount?: string | null;
  amount_encrypted?: boolean;
  bid_time: string;
  service_fee_paid: boolean;
  ticket_number?: string;
};

export type ApiWinnerResult = {
  id: string;
  product: ApiProduct | null;
  status: string;
  start_time: string;
  end_time: string;
  winner_user_id: string | null;
  winning_bid_amount: number | null;
  total_bids: number;
  lowest_unique_bid: number | null;
  bids: ApiBid[];
  created_at: string;
  winner_name?: string | null;
  winner_phone?: string | null;
  unique_bidders?: number;
  all_winners?: ApiWinnerInfo[];
  winners_count?: number;
  payment_status?: string | null;
  payment_deadline?: string | null;
};

export type ApiAuctionResult = ApiWinnerResult & {
  my_bid?: { amount: number; service_fee_paid: boolean };
  all_winners?: ApiWinnerInfo[];
  winners_count?: number;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: string; phone_number: string };
};

export type ApiUser = {
  id: string;
  phone_number: string;
  full_name: string;
  role: string;
  wallet_balance: number;
  avatar_url: string | null;
};

export type ApiNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  sent_at: string;
};

export type ApiFavorite = {
  user_id: string;
  auction_id: string;
  created_at: string;
};

export type ApiSettlementReport = {
  start_date: string;
  end_date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
  transaction_count: number;
  details: ApiSettlementRow[];
};

export type ApiSettlementRow = {
  auction_id: string;
  product_name: string;
  winning_amount: number;
  participation_fee_revenue: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_to_seller: number;
  payment_status: string;
  settled_at: string | null;
};

export type ApiDailySettlement = {
  date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
};

export type ApiPendingWinner = {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: string | null;
  created_at: string;
  user?: {
    id: string;
    phone_number: string;
    full_name: string | null;
    email: string | null;
  };
  auction?: {
    id: string;
    public_code: string;
    payment_deadline: string | null;
    product?: { id: string; name: string };
  };
};

export type ApiWinnerStats = {
  total_winners: number;
  paid_winners: number;
  pending_winners: number;
  expired_winners: number;
  average_payment_time_hours?: number;
};

export type ApiDispute = {
  id: string;
  user_id: string;
  auction_id: string | null;
  type: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  resolution: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    phone_number: string;
    full_name: string | null;
  };
  auction?: {
    id: string;
    title?: string;
    public_code?: string;
  };
};

export type ApiRbacOverride = {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, string[]>;
  reason: string;
  expires_at: string | null;
  active: boolean;
};

export type ApiAccessDecision = {
  id: string;
  user_id: string;
  action: string;
  subject: string;
  granted: boolean;
  timestamp: string;
};
