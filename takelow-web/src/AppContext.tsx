import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react"
import type { ReactNode } from "react"
import { api, setApiToken, setRefreshToken, getApiToken, getRefreshToken, getUserFriendlyMessage } from "./api"
import { toast } from "./store/toast.store"
import { useAuctionSocket, applySocketUpdate } from "./hooks/useAuctionSocket"
import type { Auction } from "./mockDataV0"

export type View =
  | "login" | "register" | "home" | "auctions" | "my-bids"
  | "product" | "pay-fee" | "place-bid" | "bid-confirmed"
  | "monitor" | "closed" | "winner" | "pay-winning" | "payment-confirmed" | "payment-verifying" | "delivery"
  | "admin-dashboard" | "admin-auctions" | "admin-products" | "admin-users" | "admin-transactions" | "admin-audit" | "admin-monitor" | "admin-auction-monitor" | "deposit"
  | "payment-success" | "payment-failed"
  | "closed-auctions"
  | "sikina-pay-checkout"

export type UserRole = "admin" | "user"

export type User = {
  id: string
  name: string
  phone: string
  role: UserRole
}

export type PlacedBid = {
  auctionId: string
  amount: number
  placedAt: number
  userId?: string
  userName?: string
  ticketNumber?: string
}

type AppState = {
  view: View
  selectedId: string | null
  userBid: number | null
  bidTicketNumber: string | null
  feePaid: boolean
  walletBalance: number
  paymentMethod: 'SIKINAPAY' | 'AWASH' | 'WALLET'
  lastPaymentMethod: 'SIKINAPAY' | 'AWASH' | 'WALLET' | null
  paymentContext: 'bid-fee' | 'winning' | null
  sikinaPayUrl: string | null
  setSikinaPayUrl: (url: string | null) => void
  myBids: PlacedBid[]
  user: User | null
  allBids: PlacedBid[]
  auctions: Auction[]
  auctionsLoading: boolean
  authError: string | null
  go: (view: View) => void
  selectAuction: (id: string) => void
  selectAuctionForMonitor: (id: string) => void
  setSelectedIdOnly: (id: string) => void
  setFeePaid: (paid: boolean) => void
  payFee: (fee: number, paymentMethod?: 'SIKINAPAY' | 'AWASH') => Promise<void>
  submitBid: (amount: number) => Promise<void>
  payWinning: (amount: number, paymentMethod?: 'SIKINAPAY' | 'AWASH' | 'WALLET', customerPhone?: string) => Promise<void>
  setPaymentMethod: (method: 'SIKINAPAY' | 'AWASH' | 'WALLET') => void
  checkPaymentStatus: () => Promise<boolean>
  reset: () => void
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  addAuction: (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number }) => Promise<void>
  updateAuction: (id: string, data: Partial<Pick<Auction, "name" | "category" | "marketPrice" | "description" | "highlights" | "images">> & { startTime?: string; endTime?: string; minBid?: number; maxBid?: number }) => Promise<void>
  deleteAuction: (id: string) => Promise<void>
  closeAuction: (id: string) => Promise<void>
  refreshAuctions: () => Promise<void>
  refreshWallet: () => Promise<void>
  fetchAuctionById: (id: string) => Promise<Auction | undefined>
  getAuction: (id: string | null | undefined) => Auction | undefined
}

const AppContext = createContext<AppState | null>(null)

const INITIAL_BALANCE = 0
const STORAGE_KEY = "takelow_data"

function mapAuction(apiAuction: any): Auction {
  const timeLeft = Math.max(0, Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000))
  return {
    id: apiAuction.id,
    productId: apiAuction.product_id,
    name: apiAuction.product?.name || 'Unknown Product',
    category: apiAuction.product?.brand || '',
    images: apiAuction.product?.image_urls || [],
    marketPrice: Number(apiAuction.product?.current_market_price || 0),
    bidFee: 1,
    bidders: apiAuction.stats?.total_bids ?? 0,
    uniqueBidders: apiAuction.stats?.unique_bidders ?? 0,
    totalBids: apiAuction.stats?.total_bids ?? 0,
    timeLeft,
    endTime: apiAuction.end_time,
    status: (apiAuction.status === 'ACTIVE' ? (timeLeft < 3600 ? 'ending-soon' : 'live') : 'closed') as Auction['status'],
    description: apiAuction.product?.description || '',
    highlights: [],
    minBid: apiAuction.min_bid ?? undefined,
    maxBid: apiAuction.max_bid ?? undefined,
    winners: apiAuction.winners?.map((w: any) => ({
      user_id: w.user_id,
      amount: w.amount,
      rank: w.rank,
      payment_status: w.payment_status,
      payment_deadline: w.payment_deadline,
      name: w.name,
      phone: w.phone,
    })),
    winnersCount: apiAuction.winners_count ?? apiAuction.winners?.length ?? 0,
    winning_bid_amount: apiAuction.winning_bid_amount ?? null,
    winner_user_id: apiAuction.winner_user_id ?? null,
    payment_status: apiAuction.payment_status,
    total_revenue: apiAuction.total_revenue,
  }
}

const POLL_INTERVAL = 30000
const LIVE_VIEWS: View[] = ['home', 'auctions', 'product', 'monitor', 'my-bids']

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('login')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userBid, setUserBid] = useState<number | null>(null)
  const [bidTicketNumber, setBidTicketNumber] = useState<string | null>(null)
  const [feePaid, setFeePaid] = useState(false)
  const [walletBalance, setWalletBalance] = useState(INITIAL_BALANCE)
  const [paymentMethod, setPaymentMethodState] = useState<'SIKINAPAY' | 'AWASH' | 'WALLET'>('WALLET')
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'SIKINAPAY' | 'AWASH' | 'WALLET' | null>(null)
  const [paymentContext, setPaymentContext] = useState<'bid-fee' | 'winning' | null>(null)
  const [sikinaPayUrl, setSikinaPayUrl] = useState<string | null>(null)
  const [myBids, setMyBids] = useState<PlacedBid[]>([])
  const [allBids, setAllBids] = useState<PlacedBid[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  useAuctionSocket(selectedId, (payload) => {
    setAuctions((prev) => applySocketUpdate(prev, payload))
  })
  const [user, setUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const refreshing = useRef(false)
  const logoutRef = useRef<() => void>(() => {})

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw)
        if (saved.auctions?.length) {
          const unique = Array.from(new Map<string, Auction>(saved.auctions.map((a: any) => [a.id, a])).values())
          setAuctions(unique)
        }
        if (saved.allBids?.length) setAllBids(saved.allBids)
        if (saved.myBids?.length) setMyBids(saved.myBids)
        if (saved.walletBalance != null) setWalletBalance(saved.walletBalance)
        if (saved.accessToken && saved.refreshToken && saved.user) {
          setApiToken(saved.accessToken)
          setRefreshToken(saved.refreshToken)
          const appUser = saved.user as User
          setUser(appUser)
          setView('home')
        }
      } catch { /* ignore corrupt data */ }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const tokens = user ? { accessToken: getApiToken(), refreshToken: getRefreshToken() } : {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ auctions, allBids, myBids, walletBalance, user, ...tokens }))
  }, [auctions, allBids, myBids, walletBalance, user, hydrated])

  useEffect(() => {
    const onSessionExpired = () => logoutRef.current()
    window.addEventListener('session-expired', onSessionExpired)
    return () => window.removeEventListener('session-expired', onSessionExpired)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    refreshAuctions()
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || !user) return
    if (!LIVE_VIEWS.includes(view)) return
    const interval = setInterval(refreshAuctions, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [hydrated, user, view])

  const go = useCallback((next: View) => {
    const adminViews: View[] = ['admin-dashboard', 'admin-auctions', 'admin-products', 'admin-users', 'admin-transactions', 'admin-audit', 'admin-monitor', 'admin-auction-monitor', 'monitor']
    if (adminViews.includes(next) && user?.role !== 'admin') return
    setView(next)
  }, [user])

  const selectAuction = useCallback((id: string) => {
    setSelectedId(id)
    setFeePaid(false)
    setUserBid(null)
    setBidTicketNumber(null)
    setPaymentContext(null)
    setSikinaPayUrl(null)
    const auction = auctions.find((a) => a.id === id)
    if (auction?.status === 'closed') {
      setView('winner')
    } else {
      setView('product')
    }
  }, [auctions])

  const setSelectedIdOnly = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const selectAuctionForMonitor = useCallback((id: string) => {
    setSelectedId(id)
    setView('admin-auction-monitor')
  }, [])

  const payFee = useCallback(async (fee: number, paymentMethod?: 'SIKINAPAY' | 'AWASH') => {
    if (!selectedId) return
    try {
      setAuthError(null)
      if (paymentMethod === 'AWASH') {
        await api.payBidFeeWithWallet(selectedId)
        setFeePaid(true)
        setView('place-bid')
        return
      }
      setPaymentContext('bid-fee')
      const { payment_url } = await api.createBidFeePaymentLink(selectedId, paymentMethod)
      setSikinaPayUrl(payment_url)
      setView('sikina-pay-checkout')
    } catch (e) {
      const msg = getUserFriendlyMessage(e)
      setAuthError(msg)
      toast(msg, "error")
    }
  }, [selectedId])

  const submitBid = useCallback(async (amount: number) => {
    if (!selectedId || !user) return
    try {
      const res = await api.bid.place(selectedId, amount)
      const ticket = res.ticket_number
      setBidTicketNumber(ticket ?? null)
      const bid: PlacedBid = { auctionId: selectedId, amount, placedAt: Date.now(), userId: user.id, userName: user.name, ticketNumber: ticket }
      setMyBids((prev) => [bid, ...prev])
      setAllBids((prev) => [bid, ...prev])
      setUserBid(amount)
      setAuctions((prev) =>
        prev.map((a) => (a.id === selectedId ? { ...a, bidders: (a.bidders ?? 0) + 1, totalBids: (a.totalBids ?? 0) + 1 } : a)),
      )
      setView('bid-confirmed')
      refreshWallet()
      setTimeout(() => refreshAuctions(), 3000)
      const name = auctions.find((a) => a.id === selectedId)?.name || 'Unknown'
      const smsText = `Your bid of ETB ${amount} on '${name}' has been placed successfully. Your BID ticket: ${ticket || 'N/A'}`
      toast(`📱 SMS: ${smsText}`, "success")
    } catch (e) {
      const msg = getUserFriendlyMessage(e)
      setAuthError(msg)
      toast(msg, "error")
    }
  }, [selectedId, user, auctions])

  const setPaymentMethod = useCallback((method: 'SIKINAPAY' | 'AWASH' | 'WALLET') => {
    setPaymentMethodState(method)
  }, [])

  const payWinning = useCallback(async (amount: number, method?: 'SIKINAPAY' | 'AWASH' | 'WALLET', customerPhone?: string) => {
    if (!selectedId) return
    try {
      setAuthError(null)
      const pm = method || paymentMethod
      if (pm === 'WALLET') {
        await api.payWinningWithWallet(selectedId)
        setLastPaymentMethod('WALLET')
        refreshWallet()
        refreshAuctions()
        setView('payment-confirmed')
        return
      }
      setPaymentContext('winning')
      setLastPaymentMethod(pm)
      const { payment_url } = await api.createPaymentLink(selectedId, pm, customerPhone)
      setSikinaPayUrl(payment_url)
      setView('sikina-pay-checkout')
    } catch (e) {
      const msg = getUserFriendlyMessage(e)
      setAuthError(msg)
      toast(msg, "error")
    }
  }, [selectedId, paymentMethod])

  const checkPaymentStatus = useCallback(async () => {
    if (!selectedId) return false
    try {
      const status = await api.getPaymentLinkStatus(selectedId)
      if (status.status === 'SUCCESSFUL') return true
      return false
    } catch {
      return false
    }
  }, [selectedId])

  const reset = useCallback(() => {
    setView('home')
    setSelectedId(null)
    setUserBid(null)
    setBidTicketNumber(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setPaymentMethodState('SIKINAPAY')
    setPaymentContext(null)
    setSikinaPayUrl(null)
    setMyBids([])
  }, [])

  const refreshAuctions = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    setAuctionsLoading(true)
    try {
      const [activeRes, closedRes] = await Promise.all([
        api.listAuctions(),
        api.listClosedAuctions().catch(() => ({ data: [] })),
      ])
      const allMapped = [...activeRes.data.map(mapAuction), ...closedRes.data.map(mapAuction)]
      const unique = Array.from(new Map(allMapped.map((a) => [a.id, a])).values())
      setAuctions(unique)
    } catch {
      toast("Failed to refresh auctions", "error")
    } finally {
      setAuctionsLoading(false)
      refreshing.current = false
    }
  }, [])

  const refreshWallet = useCallback(async () => {
    try {
      const res = await api.wallet.balance()
      setWalletBalance(res.balance)
    } catch {
      toast("Failed to fetch wallet balance", "error")
    }
  }, [])

  const fetchAuctionById = useCallback(async (id: string): Promise<Auction | undefined> => {
    const cached = auctions.find((a) => a.id === id)
    if (cached) return cached
    try {
      const data = await api.getAuction(id)
      const mapped = mapAuction(data)
      setAuctions((prev) => {
        const exists = prev.find((a) => a.id === mapped.id)
        if (exists) return prev
        return [...prev, mapped]
      })
      return mapped
    } catch {
      return undefined
    }
  }, [auctions])

  const login = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      setAuthError(null)
      const res = await api.auth.login(phone, password)
      setApiToken(res.access_token)
      setRefreshToken(res.refresh_token)
      const appUser: User = {
        id: res.user.id,
        name: '',
        phone: res.user.phone_number,
        role: res.user.role as UserRole,
      }
      try {
        const profile = await api.auth.profile()
        appUser.name = profile.full_name || profile.phone_number
      } catch {
        appUser.name = res.user.phone_number
      }
      setUser(appUser)
      setView('home')
      refreshWallet()
      refreshAuctions()
      return true
    } catch (e: unknown) {
      setAuthError(getUserFriendlyMessage(e))
      return false
    }
  }, [])

  const register = useCallback(async (phone: string, password: string, name: string): Promise<boolean> => {
    try {
      setAuthError(null)
      const res = await api.auth.register(phone, password, name)
      setApiToken(res.access_token)
      setRefreshToken(res.refresh_token)
      const appUser: User = {
        id: res.user.id,
        name,
        phone: res.user.phone_number,
        role: res.user.role as UserRole,
      }
      setUser(appUser)
      setView('home')
      refreshWallet()
      refreshAuctions()
      return true
    } catch (e: unknown) {
      setAuthError(getUserFriendlyMessage(e))
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setApiToken(null)
    setRefreshToken(null)
    setUser(null)
    setSelectedId(null)
    setUserBid(null)
    setBidTicketNumber(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setMyBids([])
    setAllBids([])
    setAuctions([])
    setAuthError(null)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, user: null, accessToken: null, refreshToken: null }))
      } catch { /* ignore */ }
    }
    setView('login')
  }, [])
  logoutRef.current = logout

  const addAuction = useCallback(async (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number }) => {
    if (user?.role !== 'admin') return
    try {
      const product = await api.createProduct({
        name: a.name, description: a.description, current_market_price: a.marketPrice, brand: a.category,
        ...(a.images?.length ? { image_urls: a.images } : {}),
      })
      await api.createAuction({
        product_id: product.id, start_time: a.startTime, end_time: a.endTime,
        min_bid: a.minBid, max_bid: a.maxBid,
      })
      await refreshAuctions()
      toast("Auction created successfully", "success")
    } catch (e: any) {
      toast(e?.message || "Failed to create auction", "error")
    }
    setView('admin-auctions')
  }, [refreshAuctions, user])

  const closeAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.closeAuction(id)
      await refreshAuctions()
      toast("Auction closed successfully", "success")
    } catch (e: any) {
      toast(e?.message || "Failed to close auction", "error")
    }
  }, [refreshAuctions, user])

  const updateAuction = useCallback(async (id: string, data: any) => {
    if (user?.role !== 'admin') return
    try {
      const list = await api.adminListAuctions()
      const auction = list.data.find((a) => a.id === id)
      if (auction?.product?.id) {
        if (data.name || data.marketPrice !== undefined || data.description !== undefined || data.category !== undefined || data.images !== undefined) {
          await api.updateProduct(auction.product.id, {
            ...(data.name ? { name: data.name } : {}),
            ...(data.marketPrice !== undefined ? { current_market_price: data.marketPrice } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.category !== undefined ? { brand: data.category } : {}),
            ...(data.images !== undefined ? { image_urls: data.images } : {}),
          })
        }
        if (data.startTime || data.endTime || data.minBid != null || data.maxBid != null) {
          await api.updateAuction(id, {
            ...(data.startTime ? { start_time: data.startTime } : {}),
            ...(data.endTime ? { end_time: data.endTime } : {}),
            ...(data.minBid != null ? { min_bid: data.minBid } : {}),
            ...(data.maxBid != null ? { max_bid: data.maxBid } : {}),

          })
        }
      }
      await refreshAuctions()
      toast("Auction updated successfully", "success")
    } catch (e: any) {
      toast(e?.message || "Failed to update auction", "error")
    }
  }, [refreshAuctions, user])

  const deleteAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.deleteAuction(id)
      await refreshAuctions()
      toast("Auction deleted successfully", "success")
    } catch (e: any) {
      toast(e?.message || "Failed to delete auction", "error")
    }
  }, [refreshAuctions, user])

  const getAuction = useCallback((id: string | null | undefined): Auction | undefined => {
    if (!id) return undefined
    return auctions.find((a) => a.id === id)
  }, [auctions])

  const value = useMemo(() => ({
    view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, paymentMethod, lastPaymentMethod, paymentContext, sikinaPayUrl, setSikinaPayUrl, myBids, user, allBids,
    auctions, auctionsLoading, authError,
    go, selectAuction, selectAuctionForMonitor, setSelectedIdOnly, setFeePaid, payFee, submitBid, payWinning, setPaymentMethod, checkPaymentStatus, reset,
    login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction,
    refreshAuctions, refreshWallet, fetchAuctionById, getAuction,
  }), [
    view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, paymentMethod, lastPaymentMethod, paymentContext, sikinaPayUrl, setSikinaPayUrl, myBids, user, allBids,
    auctions, auctionsLoading, authError,
    go, selectAuction, selectAuctionForMonitor, setSelectedIdOnly, setFeePaid, payFee, submitBid, payWinning, setPaymentMethod, checkPaymentStatus, reset,
    login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction,
    refreshAuctions, refreshWallet, fetchAuctionById, getAuction,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
