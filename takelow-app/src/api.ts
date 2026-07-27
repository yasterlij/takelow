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

const FRIENDLY_ERRORS: Record<string, string> = {
  ERR_AUTH_INVALID_CREDENTIALS: 'The phone number or password you entered is incorrect. Please try again.',
  ERR_AUTH_FORBIDDEN: 'You do not have permission to perform this action. Please sign in with an admin account.',
  ERR_AUTH_REQUIRED: 'Please sign in to continue.',
  ERR_VALIDATION: 'Please check your input and try again.',
  ERR_NOT_FOUND: 'The requested information could not be found.',
  ERR_CONFLICT: 'This action could not be completed because of a conflict.',
  ERR_RATE_LIMIT: 'You are moving too fast! Please wait a moment.',
  ERR_SERVER: 'Something went wrong on our end. Please try again.',
  ERR_NETWORK: 'Unable to connect to the server. Please check your internet connection.',
  ERR_TIMEOUT: 'The request took too long. Please try again.',
}

export type ErrorCategory = 'auth' | 'validation' | 'network' | 'server' | 'unknown'

class ApiError extends Error {
  status: number
  errorCode: string
  category: ErrorCategory

  constructor(status: number, message: string, errorCode = 'ERR_SERVER') {
    super(message)
    this.status = status
    this.errorCode = errorCode
    this.category = getCategory(status, errorCode)
  }
}

function getCategory(status: number, errorCode: string): ErrorCategory {
  if ([401, 403].includes(status)) return 'auth'
  if ([400, 409, 422].includes(status)) return 'validation'
  if (status === 429) return 'network'
  if (status >= 500) return 'server'
  if (errorCode.startsWith('ERR_AUTH')) return 'auth'
  if (errorCode.startsWith('ERR_VALIDATION')) return 'validation'
  return 'unknown'
}

export function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return FRIENDLY_ERRORS[err.errorCode] || err.message
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Unable to connect to the server. Please check your internet connection.'
  }
  if (err instanceof Error) {
    if (err.message === 'No refresh token') return 'Your session has expired. Please sign in again.'
    if (err.message === 'Token refresh failed') return 'Your session has expired. Please sign in again.'
    if (err.message.includes('exhausted retries')) return 'The server is not responding. Please try again later.'
    return err.message
  }
  return 'An unexpected error occurred. Please try again.'
}

const MAX_RETRIES = 2
const RETRY_DELAY = 1000

let _refreshing: Promise<void> | null = null
let _sessionExpiredHandler: (() => void) | null = null

export function onSessionExpired(handler: (() => void) | null) {
  _sessionExpiredHandler = handler
}

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
      _sessionExpiredHandler?.()
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

async function parseErrorBody(res: Response): Promise<{ message: string; errorCode: string }> {
  try {
    const json = await res.json()
    return {
      message: json.message || `Request failed (${res.status})`,
      errorCode: json.errorCode || 'ERR_SERVER',
    }
  } catch {
    return {
      message: `Request failed (${res.status})`,
      errorCode: 'ERR_SERVER',
    }
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

      if (res.status === 401 && _refreshToken && attempt < MAX_RETRIES) {
        await refreshAuth()
        if (_token) headers['Authorization'] = `Bearer ${_token}`
        continue
      }

      const { message, errorCode } = await parseErrorBody(res)

      if (res.status < 500) {
        throw new ApiError(res.status, message, errorCode)
      }
      if (attempt === MAX_RETRIES) {
        throw new ApiError(res.status, message, errorCode)
      }
    } catch (e) {
      if (e instanceof ApiError) throw e
      if (e instanceof TypeError) {
        throw new ApiError(0, 'Unable to connect to the server. Please check your internet connection.', 'ERR_NETWORK')
      }
      if (attempt === MAX_RETRIES) throw new ApiError(0, 'The server is not responding. Please try again later.', 'ERR_TIMEOUT')
      await new Promise((r) => setTimeout(r, RETRY_DELAY))
    }
  }

  throw new ApiError(0, 'The server is not responding. Please try again later.', 'ERR_TIMEOUT')
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

export type ApiWinnerInfo = {
  user_id: string
  amount: number
  name: string | null
  phone: string | null
  rank: number
  payment_status: string | null
  payment_deadline: string | null
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
  winners?: ApiWinnerInfo[]
  winnersCount?: number
  payment_status?: string | null
  payment_deadline?: string | null
  num_winners?: number
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
  winner_phone: string | null
  winning_bid_amount: number | null
  total_bids: number
  unique_bidders: number
  lowest_unique_bid: number | null
  all_winners: ApiWinnerInfo[]
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
  winner_phone: string | null
  winning_bid_amount: number | null
  total_bids: number
  unique_bidders: number
  lowest_unique_bid: number | null
  all_winners: ApiWinnerInfo[]
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
  deleteProduct(id: string) {
    return request<{ deleted: boolean; id: string }>('DELETE', `/admin/products/${id}`, undefined, ENGINE_API)
  },
  createAuction(data: { product_id: string; start_time: string; end_time: string; min_bid?: number; max_bid?: number }) {
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
  updateAuction(id: string, data: Partial<{ product_id: string; start_time: string; end_time: string; status: string; min_bid: number; max_bid: number }>) {
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
  adminListUsers(page = 1, limit = 100, search?: string) {
    const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    return request<{ data: ApiUser[]; meta: any }>('GET', `/admin/users?${query}`, undefined, IDENTITY_API)
  },
  getUser(id: string) {
    return request<ApiUser>('GET', `/admin/users/${id}`, undefined, IDENTITY_API)
  },
  updateUser(id: string, data: Partial<{ role: string; full_name: string; phone_number: string }>) {
    return request<ApiUser>('PATCH', `/admin/users/${id}`, data, IDENTITY_API)
  },
  getAuction(id: string) {
    return request<ApiAuction>('GET', `/auctions/${id}`, undefined, QUERY_API)
  },
  createPaymentLink(auctionId: string, paymentMethod?: string, customerPhone?: string) {
    let path = `/payments/${auctionId}/link`
    const params: string[] = []
    if (paymentMethod) params.push(`payment_method=${encodeURIComponent(paymentMethod)}`)
    if (customerPhone) params.push(`customer_phone=${encodeURIComponent(customerPhone)}`)
    const qs = params.join('&')
    if (qs) path += `?${qs}`
    return request<{ payment_url: string; transaction_id: string; gateway: string }>('POST', path, undefined, ENGINE_API)
  },
  getPaymentLinkStatus(auctionId: string) {
    return request<{ status: string; payment_url: string | null; gateway?: string }>('GET', `/payments/${auctionId}/status`, undefined, ENGINE_API)
  },
  confirmPayment(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/${auctionId}/confirm`, undefined, ENGINE_API)
  },
  payWinningWithWallet(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/${auctionId}/wallet-pay`, undefined, ENGINE_API)
  },
  createBidFeePaymentLink(auctionId: string) {
    return request<{ payment_url: string; transaction_id: string }>('POST', `/payments/bid-fee/${auctionId}/link`, undefined, ENGINE_API)
  },
  getBidFeePaymentStatus(auctionId: string) {
    return request<{ status: string; payment_url: string | null }>('GET', `/payments/bid-fee/${auctionId}/status`, undefined, ENGINE_API)
  },
  confirmBidFeePayment(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/bid-fee/${auctionId}/confirm`, undefined, ENGINE_API)
  },
  payBidFeeWithWallet(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/bid-fee/${auctionId}/wallet-pay`, undefined, ENGINE_API)
  },
}
