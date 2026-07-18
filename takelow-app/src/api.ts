const API_BASE = 'http://localhost:3002'

let _token: string | null = null

export function setApiToken(token: string | null) {
  _token = token
}

export function getApiToken() {
  return _token
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${method} ${path} ${res.status}: ${text}`)
  }
  return res.json()
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

export const api = {
  createProduct(data: { name: string; description?: string; current_market_price: number; brand?: string }) {
    return request<ApiProduct>('POST', '/admin/products', data)
  },
  updateProduct(id: string, data: Partial<{ name: string; description: string; current_market_price: number; brand: string }>) {
    return request<ApiProduct>('PATCH', `/admin/products/${id}`, data)
  },
  listProducts(page = 1, limit = 20) {
    return request<{ data: ApiProduct[]; meta: any }>('GET', `/admin/products?page=${page}&limit=${limit}`)
  },
  createAuction(data: { product_id: string; start_time: string; end_time: string }) {
    return request<ApiAuction>('POST', '/admin/auctions', data)
  },
  listAuctions(page = 1, limit = 20) {
    return request<{ data: ApiAuction[]; meta: any }>('GET', `/admin/auctions?page=${page}&limit=${limit}`)
  },
  updateAuction(id: string, data: Partial<{ product_id: string; start_time: string; end_time: string; status: string }>) {
    return request<ApiAuction>('PATCH', `/admin/auctions/${id}`, data)
  },
  deleteAuction(id: string) {
    return request<{ deleted: boolean; id: string }>('DELETE', `/admin/auctions/${id}`)
  },
  closeAuction(id: string) {
    return request<ApiAuction>('POST', `/admin/auctions/${id}/close`)
  },
}
