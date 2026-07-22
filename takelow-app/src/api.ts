import { Platform } from 'react-native'

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
const IDENTITY_API = `http://${HOST}:3001/api/v1`
const QUERY_API = `http://${HOST}:3003/api/v1`
const ENGINE_API = `http://${HOST}:3002/api/v1`

let _token: string | null = null
let _refreshToken: string | null = null

export function setApiToken(token: string | null) {
  _token = token
}

export function getApiToken() {
  return _token
}

export function setRefreshToken(token: string | null) {
  _refreshToken = token
}

export function getRefreshToken() {
  return _refreshToken
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const MAX_RETRIES = 2
const RETRY_DELAY = 1000

let _refreshing: Promise<void> | null = null

async function refreshAuth(): Promise<void> {
  if (!_refreshToken) throw new Error('No refresh token')
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    const res = await fetch(`${IDENTITY_API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    })
    if (!res.ok) {
      _token = null
      _refreshToken = null
      throw new Error('Token refresh failed')
    }
    const data = await res.json()
    _token = data.access_token
    _refreshToken = data.refresh_token
  })()
  try {
    await _refreshing
  } finally {
    _refreshing = null
  }
}

async function request<T>(method: string, path: string, body?: unknown, base?: string, extraHeaders?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  if (extraHeaders) Object.assign(headers, extraHeaders)
  const url = `${base || IDENTITY_API}${path}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
      if (res.ok) return res.json()
      const text = await res.text()
      if (res.status === 401 && _refreshToken && attempt < MAX_RETRIES) {
        await refreshAuth()
        if (_token) headers['Authorization'] = `Bearer ${_token}`
        continue
      }
      if (res.status < 500) {
        throw new ApiError(res.status, `API ${method} ${path} ${res.status}: ${text}`)
      }
      if (attempt === MAX_RETRIES) {
        throw new Error(`API ${method} ${path} ${res.status}: ${text}`)
      }
    } catch (e) {
      if (e instanceof ApiError) throw e
      if (attempt === MAX_RETRIES) throw e
      await new Promise((r) => setTimeout(r, RETRY_DELAY))
    }
  }

  throw new Error(`API ${method} ${path}: exhausted retries`)
}

export type ApiProduct = {
  id: string
  name: string
  description: string | null
  image_urls: string[] | null
  current_market_price: number
  brand: string | null
  created_at: string
}

export type ApiAuction = {
  id: string
  product_id: string
  product: ApiProduct | null
  start_time: string
  end_time: string
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED'
  winner_user_id: string | null
  winning_bid_amount: number | null
  created_at: string
}

export type ApiBid = {
  id: string
  user_id: string
  auction_id: string
  amount: number
  bid_time: string
  service_fee_paid: boolean
}

export type ApiWinnerResult = {
  id: string
  product: ApiProduct | null
  status: string
  start_time: string
  end_time: string
  winner_user_id: string | null
  winner_name: string | null
  winning_bid_amount: number | null
  total_bids: number
  unique_bidders: number
  lowest_unique_bid: number | null
  all_winners: { user_id: string; amount: number; name: string | null }[]
  bids: ApiBid[]
  created_at: string
  payment_status: string | null
  payment_deadline: string | null
}

export type ApiAuctionResult = {
  id: string
  product: ApiProduct | null
  status: string
  winner_user_id: string | null
  winner_name: string | null
  winning_bid_amount: number | null
  total_bids: number
  unique_bidders: number
  lowest_unique_bid: number | null
  all_winners: { user_id: string; amount: number; name: string | null }[]
  my_bid: { amount: number; bid_time: string; service_fee_paid: boolean } | null
  created_at: string
  payment_status: string | null
  payment_deadline: string | null
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
  user: { id: string; role: string; phone_number: string }
}

export type ApiUser = {
  id: string
  phone_number: string
  full_name: string
  role: string
  wallet_balance: number
  avatar_url: string | null
}

export const api = {
  auth: {
    register(phone_number: string, password: string, full_name: string) {
      return request<AuthResponse>('POST', '/auth/register', { phone_number, password, full_name })
    },
    login(phone_number: string, password: string) {
      return request<AuthResponse>('POST', '/auth/login/phone', { phone_number, password })
    },
    refresh(refreshToken: string) {
      return request<AuthResponse>('POST', '/auth/refresh', { refresh_token: refreshToken })
    },
    profile() {
      return request<ApiUser>('GET', '/auth/profile')
    },
    registerPushToken(token: string, platform: 'android' | 'ios') {
      return request<{ registered: boolean }>('POST', '/auth/fcm-token', { token, platform })
    },
  },

  wallet: {
    balance() {
      return request<{ balance: number }>('GET', '/wallet/balance', undefined, IDENTITY_API)
    },
    deposit(amount: number) {
      return request<{ balance: number }>('POST', '/wallet/deposit', { amount }, IDENTITY_API)
    },
    setPin(pin: string) {
      return request<{ set: boolean }>('POST', '/wallet/set-pin', { pin }, IDENTITY_API)
    },
    verifyPin(pin: string) {
      return request<{ valid: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: string | null }>('POST', '/wallet/verify-pin', { pin }, IDENTITY_API)
    },
    hasPin() {
      return request<{ hasPin: boolean }>('GET', '/wallet/has-pin', undefined, IDENTITY_API)
    },
    pinStatus() {
      return request<{ hasPin: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: string | null }>('GET', '/wallet/pin-status', undefined, IDENTITY_API)
    },
  },

  bid: {
    place(auctionId: string, amount: number) {
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const timestamp = Date.now().toString()
      return request<{ message: string; new_total_bids: number; ticket_number?: string }>(
        'POST', `/auctions/${auctionId}/bid`, { amount },
        ENGINE_API,
        { 'x-bid-nonce': nonce, 'x-bid-timestamp': timestamp },
      )
    },
  },

  createProduct(data: { name: string; description?: string; image_urls?: string[]; current_market_price: number; brand?: string }) {
    return request<ApiProduct>('POST', '/admin/products', data, ENGINE_API)
  },
  updateProduct(id: string, data: Partial<{ name: string; description: string; image_urls: string[]; current_market_price: number; brand: string }>) {
    return request<ApiProduct>('PATCH', `/admin/products/${id}`, data, ENGINE_API)
  },
  listProducts(page = 1, limit = 20) {
    return request<{ data: ApiProduct[]; meta: any }>('GET', `/admin/products?page=${page}&limit=${limit}`, undefined, ENGINE_API)
  },
  createAuction(data: { product_id: string; start_time: string; end_time: string; min_bid?: number; max_bid?: number; num_winners?: number }) {
    return request<ApiAuction>('POST', '/admin/auctions', data, ENGINE_API)
  },
  async listAuctions() {
    const data = await request<ApiAuction[]>('GET', '/auctions/active', undefined, QUERY_API)
    return { data, meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 } }
  },
  async listClosedAuctions() {
    const data = await request<ApiAuction[]>('GET', '/auctions/closed', undefined, QUERY_API)
    return { data, meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 } }
  },
  adminListAuctions(page = 1, limit = 100) {
    return request<{ data: ApiAuction[]; meta: any }>('GET', `/admin/auctions?page=${page}&limit=${limit}`, undefined, ENGINE_API)
  },
  updateAuction(id: string, data: Partial<{ product_id: string; start_time: string; end_time: string; status: string; min_bid: number; max_bid: number; num_winners: number }>) {
    return request<ApiAuction>('PATCH', `/admin/auctions/${id}`, data, ENGINE_API)
  },
  deleteAuction(id: string) {
    return request<{ deleted: boolean; id: string }>('DELETE', `/admin/auctions/${id}`, undefined, ENGINE_API)
  },
  closeAuction(id: string) {
    return request<ApiAuction>('POST', `/admin/auctions/${id}/close`, undefined, ENGINE_API)
  },
  drawWinner(id: string) {
    return request<ApiWinnerResult>('GET', `/admin/auctions/${id}/winner`, undefined, ENGINE_API)
  },
  getAuctionResult(id: string) {
    return request<ApiAuctionResult>('GET', `/auctions/${id}/result`, undefined, ENGINE_API)
  },
  getAuctionBids(id: string) {
    return request<ApiBid[]>('GET', `/admin/auctions/${id}/bids`, undefined, ENGINE_API)
  },
  getAuction(id: string) {
    return request<ApiAuction>('GET', `/auctions/${id}`, undefined, QUERY_API)
  },
  createPaymentLink(auctionId: string) {
    return request<{ payment_url: string; transaction_id: string }>('POST', `/payments/${auctionId}/link`, undefined, ENGINE_API)
  },
  getPaymentLinkStatus(auctionId: string) {
    return request<{ status: string; payment_url: string | null }>('GET', `/payments/${auctionId}/status`, undefined, ENGINE_API)
  },
  confirmPayment(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/${auctionId}/confirm`, undefined, ENGINE_API)
  },
}
