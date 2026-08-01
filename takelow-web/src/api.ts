const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1"
const IDENTITY_API = (import.meta.env.VITE_IDENTITY_API_BASE_URL as string | undefined) || API_BASE
const ENGINE_API = (import.meta.env.VITE_ENGINE_API_BASE_URL as string | undefined) || API_BASE
const QUERY_API = (import.meta.env.VITE_QUERY_API_BASE_URL as string | undefined) || API_BASE

let _token: string | null = null
let _refreshToken: string | null = null

export function setApiToken(token: string | null) { _token = token }
export function getApiToken() { return _token }
export function setRefreshToken(token: string | null) { _refreshToken = token }
export function getRefreshToken() { return _refreshToken }

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

async function refreshAuth(): Promise<void> {
  if (!_refreshToken) {
    window.dispatchEvent(new CustomEvent('session-expired'))
    throw new Error('No refresh token')
  }
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
      window.dispatchEvent(new CustomEvent('session-expired'))
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
  rank: number
  payment_status?: string
  payment_deadline?: string
  name?: string
  phone?: string
}

export type ApiAuction = {
  id: string
  product_id: string
  product: ApiProduct | null
  start_time: string
  end_time: string
  status: "ACTIVE" | "CLOSED" | "EXPIRED"
  winner_user_id: string | null
  winning_bid_amount: number | null
  winners?: ApiWinnerInfo[]
  winners_count?: number
  created_at: string
  stats?: { total_bids: number; unique_bidders: number }
}

export type ApiBid = {
  id: string
  user_id: string
  user_name?: string | null
  auction_id: string
  amount: number
  encrypted_amount?: string | null
  amount_encrypted?: boolean
  bid_time: string
  service_fee_paid: boolean
  ticket_number?: string
}

export type ApiWinnerResult = {
  id: string
  product: ApiProduct | null
  status: string
  start_time: string
  end_time: string
  winner_user_id: string | null
  winning_bid_amount: number | null
  total_bids: number
  lowest_unique_bid: number | null
  bids: ApiBid[]
  created_at: string
  winner_name?: string
  winner_phone?: string
  unique_bidders?: number
  payment_status?: string
  payment_deadline?: string
}

export type ApiAuctionResult = ApiWinnerResult & {
  my_bid?: { amount: number; service_fee_paid: boolean }
  all_winners?: ApiWinnerInfo[]
  winners_count?: number
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
    login(phone_number: string, password: string) {
      return request<AuthResponse>('POST', '/auth/login/phone', { phone_number, password }, IDENTITY_API)
    },
    register(phone_number: string, password: string, full_name: string) {
      return request<AuthResponse>('POST', '/auth/register', { phone_number, password, full_name }, IDENTITY_API)
    },
    refresh(refreshToken: string) {
      return request<AuthResponse>('POST', '/auth/refresh', { refresh_token: refreshToken }, IDENTITY_API)
    },
    profile() {
      return request<ApiUser>('GET', '/auth/profile', undefined, IDENTITY_API)
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

  // Queries
  async listAuctions() {
    const data = await request<ApiAuction[]>('GET', '/auctions/active', undefined, QUERY_API)
    return { data, meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 } }
  },
  async listClosedAuctions() {
    const data = await request<ApiAuction[]>('GET', '/auctions/closed', undefined, QUERY_API)
    return { data, meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 } }
  },
  getAuction(id: string) {
    return request<ApiAuction>('GET', `/auctions/${id}`, undefined, QUERY_API)
  },
  getAuctionResult(id: string) {
    return request<ApiAuctionResult>('GET', `/auctions/${id}/result`, undefined, ENGINE_API)
  },

  // Admin (engine)
  adminListAuctions(page = 1, limit = 100) {
    return request<{ data: ApiAuction[]; meta: any }>('GET', `/admin/auctions?page=${page}&limit=${limit}`, undefined, ENGINE_API)
  },
  createAuction(data: { product_id: string; start_time: string; end_time: string; min_bid?: number; max_bid?: number }) {
    return request<ApiAuction>('POST', '/admin/auctions', data, ENGINE_API)
  },
  updateAuction(id: string, data: Partial<{ product_id: string; start_time: string; end_time: string; status: string; min_bid: number; max_bid: number }>) {
    return request<ApiAuction>('PATCH', `/admin/auctions/${id}`, data, ENGINE_API)
  },
  closeAuction(id: string) {
    return request<ApiAuction>('POST', `/admin/auctions/${id}/close`, undefined, ENGINE_API)
  },
  forceCloseAuction(id: string) {
    return request<ApiAuction>('POST', `/admin/auctions/${id}/force-close`, undefined, ENGINE_API)
  },
  deleteAuction(id: string) {
    return request<{ deleted: boolean; id: string }>('DELETE', `/admin/auctions/${id}`, undefined, ENGINE_API)
  },
  drawWinner(id: string) {
    return request<ApiWinnerResult & { all_winners?: ApiWinnerInfo[]; winners_count?: number }>('GET', `/admin/auctions/${id}/winner`, undefined, ENGINE_API)
  },
  getAuctionBids(id: string) {
    return request<ApiBid[]>('GET', `/admin/auctions/${id}/bids`, undefined, ENGINE_API)
  },
  createPaymentLink(auctionId: string, paymentMethod?: string, customerPhone?: string) {
    let path = `/payments/${auctionId}/link`
    const params = new URLSearchParams()
    if (paymentMethod) params.set('payment_method', paymentMethod)
    if (customerPhone) params.set('customer_phone', customerPhone)
    const qs = params.toString()
    if (qs) path += `?${qs}`
    return request<{ payment_url: string; proxy_url: string; transaction_id: string; gateway: string }>('POST', path, undefined, ENGINE_API)
  },
  getPaymentLinkStatus(auctionId: string) {
    return request<{ status: string; payment_url: string | null; gateway?: string }>('GET', `/payments/${auctionId}/status`, undefined, ENGINE_API)
  },
  confirmPayment(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/${auctionId}/confirm`, undefined, ENGINE_API)
  },
    createBidFeePaymentLink(auctionId: string, paymentMethod?: 'SIKINAPAY' | 'AWASH') {
      const path = paymentMethod ? `/payments/bid-fee/${auctionId}/link?payment_method=${paymentMethod}` : `/payments/bid-fee/${auctionId}/link`
      return request<{ payment_url: string; proxy_url: string; transaction_id: string }>('POST', path, undefined, ENGINE_API)
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
  payWinningWithWallet(auctionId: string) {
    return request<{ paid: boolean }>('POST', `/payments/${auctionId}/wallet-pay`, undefined, ENGINE_API)
  },

  // Admin (products)
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

  // Admin (identity)
  adminListUsers(page = 1, limit = 100, search?: string) {
    const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`
    return request<{ data: ApiUser[]; meta: any }>('GET', `/admin/users?${query}`, undefined, IDENTITY_API)
  },
  getUser(id: string) {
    return request<ApiUser>('GET', `/admin/users/${id}`, undefined, IDENTITY_API)
  },
  getUserDetail(id: string) {
    return request<ApiUser & { bids: any[]; auctions: any[] }>('GET', `/admin/users/${id}/detail`, undefined, IDENTITY_API)
  },
  getUserTransactions(id: string) {
    return request<any[]>('GET', `/admin/users/${id}/transactions`, undefined, IDENTITY_API)
  },
  updateUser(id: string, data: Partial<{ role: string; full_name: string; phone_number: string }>) {
    return request<ApiUser>('PATCH', `/admin/users/${id}`, data, IDENTITY_API)
  },
  updateUserRole(id: string, role: 'user' | 'admin') {
    return request<ApiUser>('PATCH', `/admin/users/${id}/role`, { role }, IDENTITY_API)
  },
  toggleUserBan(id: string) {
    return request<ApiUser>('PATCH', `/admin/users/${id}/ban`, {}, IDENTITY_API)
  },
  bulkUpdateUserRole(ids: string[], role: 'user' | 'admin') {
    return request<any>('POST', '/admin/users/bulk/role', { ids, role }, IDENTITY_API)
  },
  bulkToggleUserBan(ids: string[], banned: boolean) {
    return request<any>('POST', '/admin/users/bulk/ban', { ids, banned }, IDENTITY_API)
  },
  adminListTransactions(page = 1, limit = 50) {
    return request<{ data: any[]; meta: any }>('GET', `/admin/users/transactions/all?page=${page}&limit=${limit}`, undefined, IDENTITY_API)
  },
  adminListAuditLogs(page = 1, limit = 50) {
    return request<{ data: any[]; meta: any }>('GET', `/admin/users/audit/list?page=${page}&limit=${limit}`, undefined, IDENTITY_API)
  },
  adminExportUsersCsv() {
    return request<string>('GET', '/admin/users/export/csv', undefined, IDENTITY_API)
  },
  adminExportTransactionsCsv() {
    return request<string>('GET', '/admin/users/transactions/export/csv', undefined, IDENTITY_API)
  },
  // Admin (engine) exports + bulk
  adminExportAuctionsCsv() {
    return request<string>('GET', '/admin/auctions/export/csv', undefined, ENGINE_API)
  },
  adminExportProductsCsv() {
    return request<string>('GET', '/admin/products/export/csv', undefined, ENGINE_API)
  },
  adminBulkDeleteAuctions(ids: string[]) {
    return request<any>('POST', '/admin/auctions/bulk-delete', { ids }, ENGINE_API)
  },
  adminBulkDeleteProducts(ids: string[]) {
    return request<any>('POST', '/admin/products/bulk-delete', { ids }, ENGINE_API)
  },
  adminDownloadProductImages(id: string) {
    return request<any>('POST', `/admin/products/${id}/download-images`, undefined, ENGINE_API)
  },
  adminGetStats() {
    return request<any>('GET', '/admin/stats', undefined, QUERY_API)
  },

  // Notifications
  getInbox(unreadOnly = false) {
    return request<Array<{ id: string; user_id: string; type: string; title: string; body: string; metadata: any; read: boolean; sent_at: string }>>('GET', `/notify/inbox${unreadOnly ? '?unread=true' : ''}`, undefined, IDENTITY_API)
  },
  markNotificationRead(id: string) {
    return request<{ read: boolean }>('POST', `/notify/inbox/${id}/read`, undefined, IDENTITY_API)
  },
  markAllNotificationsRead() {
    return request<{ read: boolean }>('POST', '/notify/inbox/read-all', undefined, IDENTITY_API)
  },
}

let _sikinaPopup: Window | null = null

export function openSikinaPopup(url: string): Window | null {
  if (_sikinaPopup && !_sikinaPopup.closed) {
    _sikinaPopup.focus()
    return _sikinaPopup
  }
  const w = 520
  const h = 720
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2))
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2))
  _sikinaPopup = window.open(
    url,
    'sikina-pay',
    `popup=1,width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  )
  return _sikinaPopup
}

export function closeSikinaPopup(): void {
  if (_sikinaPopup && !_sikinaPopup.closed) _sikinaPopup.close()
  _sikinaPopup = null
}

export function isSikinaPopupOpen(): boolean {
  return !!(_sikinaPopup && !_sikinaPopup.closed)
}
