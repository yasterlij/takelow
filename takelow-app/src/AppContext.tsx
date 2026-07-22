import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Linking } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, setApiToken, setRefreshToken, getApiToken, getRefreshToken } from './api'
import { useToast } from './components/Toast'
import { useAuctionSocket, applySocketUpdate } from './hooks/useAuctionSocket'
import { registerForPushNotifications, useNotificationObserver } from './hooks/usePushNotifications'
import { type Auction } from './mockDataV0'

export type View =
  | 'login' | 'register' | 'home' | 'auctions' | 'my-bids' | 'product'
  | 'pay-fee' | 'place-bid' | 'bid-confirmed' | 'monitor' | 'closed'
  | 'winner' | 'pay-winning' | 'payment-confirmed' | 'delivery'
  | 'admin-dashboard' | 'admin-auctions' | 'admin-users'
  | 'deposit'
  | 'payment-success' | 'payment-failed'

export type UserRole = 'admin' | 'user'

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
  myBids: PlacedBid[]
  user: User | null
  users: User[]
  allBids: PlacedBid[]
  auctions: Auction[]
  auctionsLoading: boolean
  authError: string | null
  go: (view: View) => void
  selectAuction: (id: string) => void
  payFee: (fee: number) => void
  submitBid: (amount: number) => void
  payWinning: () => void
  reset: () => void
  login: (phone: string, password: string) => Promise<boolean>
  register: (name: string, phone: string, password: string) => Promise<boolean>
  logout: () => void
  addAuction: (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number; numWinners?: number }) => Promise<void>
  updateAuction: (id: string, data: Partial<Pick<Auction, "name" | "category" | "marketPrice" | "description" | "highlights" | "images">> & { startTime?: string; endTime?: string; minBid?: number; maxBid?: number; numWinners?: number }) => Promise<void>
  deleteAuction: (id: string) => Promise<void>
  closeAuction: (id: string) => Promise<void>
  refreshAuctions: () => Promise<void>
  refreshWallet: () => Promise<void>
  getAuction: (id: string | null | undefined) => Auction | undefined
  fetchAuctionById: (id: string) => Promise<Auction | undefined>
}

const AppContext = createContext<AppState | null>(null)

const BID_FEE = 50
const STORAGE_KEY = 'takelow_data'
const INITIAL_BALANCE = 0

function mapAuction(apiAuction: any): Auction {
  const timeLeft = Math.max(0, Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000))
  return {
    id: apiAuction.id,
    name: apiAuction.product?.name || 'Unknown Product',
    category: apiAuction.product?.brand || '',
    images: apiAuction.product?.image_urls || [],
    marketPrice: Number(apiAuction.product?.current_market_price || 0),
    bidFee: BID_FEE,
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
    numWinners: apiAuction.num_winners ?? 1,
  }
}

const POLL_INTERVAL = 30000

const LIVE_VIEWS: View[] = ['home', 'auctions', 'product', 'monitor', 'my-bids']

export function AppProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [view, setView] = useState<View>('login')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userBid, setUserBid] = useState<number | null>(null)
  const [bidTicketNumber, setBidTicketNumber] = useState<string | null>(null)
  const [feePaid, setFeePaid] = useState(false)
  const [walletBalance, setWalletBalance] = useState(INITIAL_BALANCE)
  const [myBids, setMyBids] = useState<PlacedBid[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [allBids, setAllBids] = useState<PlacedBid[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const users: User[] = []
  const refreshing = useRef(false)

  useAuctionSocket(selectedId, (payload) => {
    setAuctions((prev) => applySocketUpdate(prev, payload))
  })

  useNotificationObserver()

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!raw) return
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
          try {
            const profile = await api.auth.profile()
            setUser({ ...saved.user, name: profile.full_name || profile.phone_number })
            refreshWallet()
            setView('home')
          } catch {
            try {
              const refreshed = await api.auth.refresh(saved.refreshToken)
              setApiToken(refreshed.access_token)
              setRefreshToken(refreshed.refresh_token)
              setUser(saved.user)
              setView('home')
            } catch {
              setApiToken(null)
              setRefreshToken(null)
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const tokens = user ? { accessToken: getApiToken(), refreshToken: getRefreshToken() } : {}
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      auctions, allBids, myBids, walletBalance, user, ...tokens,
    })).catch(() => {})
  }, [auctions, allBids, myBids, walletBalance, user, hydrated])

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
      toast.show('Failed to refresh auctions', 'error')
    } finally {
      setAuctionsLoading(false)
      refreshing.current = false
    }
  }, [toast])

  useEffect(() => {
    if (!hydrated) return
    refreshAuctions()
  }, [hydrated, refreshAuctions])

  useEffect(() => {
    if (!hydrated || !user) return
    const isLiveView = LIVE_VIEWS.includes(view)
    if (!isLiveView) return
    const interval = setInterval(refreshAuctions, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [hydrated, user, view, refreshAuctions])

  const go = useCallback((next: View) => {
    const adminViews: View[] = ['admin-dashboard', 'admin-auctions', 'admin-users', 'monitor', 'winner']
    if (adminViews.includes(next) && user?.role !== 'admin') return
    setView(next)
  }, [user])

  const selectAuction = useCallback((id: string) => {
    setSelectedId(id)
    setFeePaid(false)
    setUserBid(null)
    setBidTicketNumber(null)
    setView('product')
  }, [])

  const payFee = useCallback((fee: number) => {
    if (walletBalance < fee) {
      setAuthError('Insufficient balance to pay bid fee')
      toast.show('Insufficient balance to pay bid fee', 'error')
      return
    }
    setWalletBalance((b) => b - fee)
    setFeePaid(true)
    setView('place-bid')
  }, [walletBalance, toast])

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
    } catch {
      setAuthError('Failed to place bid. Please try again.')
      toast.show('Failed to place bid. Please try again.', 'error')
    }
  }, [selectedId, user, refreshAuctions])

  const payWinning = useCallback(async () => {
    if (!selectedId) return
    try {
      setAuthError(null)
      const { payment_url } = await api.createPaymentLink(selectedId)
      Linking.openURL(payment_url)
      setView('payment-confirmed')
      toast.show('Payment link opened in browser', 'success')
    } catch (e: any) {
      toast.show(e?.message || 'Failed to create payment link', 'error')
    }
  }, [selectedId, toast])

  const reset = useCallback(() => {
    setView('home')
    setSelectedId(null)
    setUserBid(null)
    setBidTicketNumber(null)
    setFeePaid(false)
    setAuthError(null)
  }, [])

  const refreshWallet = useCallback(async () => {
    try {
      const res = await api.wallet.balance()
      setWalletBalance(res.balance)
    } catch {
      toast.show('Failed to fetch wallet balance', 'error')
    }
  }, [toast])

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
      registerForPushNotifications()
      return true
    } catch (e: any) {
      setAuthError(e.message || 'Invalid credentials')
      return false
    }
  }, [])

  const register = useCallback(async (name: string, phone: string, password: string): Promise<boolean> => {
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
    } catch (e: any) {
      setAuthError(e.message || 'Registration failed')
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {}
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, user: null, accessToken: null, refreshToken: null })).catch(() => {})
      })
      .catch(() => {})
    setView('login')
  }, [])

  const addAuction = useCallback(async (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number; numWinners?: number }) => {
    if (user?.role !== 'admin') return
    try {
      const product = await api.createProduct({
        name: a.name,
        description: a.description,
        current_market_price: a.marketPrice,
        brand: a.category,
        ...(a.images?.length ? { image_urls: a.images } : {}),
      })
      await api.createAuction({
        product_id: product.id,
        start_time: a.startTime,
        end_time: a.endTime,
        min_bid: a.minBid,
        max_bid: a.maxBid,
        num_winners: a.numWinners,
      })
      await refreshAuctions()
      toast.show('Auction created successfully', 'success')
    } catch (e: any) {
      toast.show(e?.message || 'Failed to create auction', 'error')
    }
    setView('admin-auctions')
  }, [refreshAuctions, user])

  const closeAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.closeAuction(id)
      await refreshAuctions()
      toast.show('Auction closed successfully', 'success')
    } catch (e: any) {
      toast.show(e?.message || 'Failed to close auction', 'error')
    }
  }, [refreshAuctions, user, toast])

  const updateAuction = useCallback(async (id: string, data: any) => {
    if (user?.role !== 'admin') return
    try {
      const auctionsRes = await api.adminListAuctions()
      const auction = auctionsRes.data.find((a: any) => a.id === id)
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
        if (data.startTime || data.endTime || data.minBid != null || data.maxBid != null || data.numWinners != null) {
          await api.updateAuction(id, {
            ...(data.startTime ? { start_time: data.startTime } : {}),
            ...(data.endTime ? { end_time: data.endTime } : {}),
            ...(data.minBid != null ? { min_bid: data.minBid } : {}),
            ...(data.maxBid != null ? { max_bid: data.maxBid } : {}),
            ...(data.numWinners != null ? { num_winners: data.numWinners } : {}),
          })
        }
      }
      await refreshAuctions()
      toast.show('Auction updated successfully', 'success')
    } catch (e: any) {
      toast.show(e?.message || 'Failed to update auction', 'error')
    }
  }, [refreshAuctions, user, toast])

  const deleteAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.deleteAuction(id)
      await refreshAuctions()
      toast.show('Auction deleted', 'success')
    } catch (e: any) {
      toast.show(e?.message || 'Failed to delete auction', 'error')
    }
  }, [refreshAuctions, user, toast])

  const getAuction = useCallback((id: string | null | undefined): Auction | undefined => {
    if (!id) return undefined
    return auctions.find((a) => a.id === id)
  }, [auctions])

  const fetchAuctionById = useCallback(async (id: string): Promise<Auction | undefined> => {
    const cached = auctions.find((a) => a.id === id)
    if (cached) return cached
    try {
      const res = await api.getAuction(id)
      const mapped = mapAuction(res)
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

  const value = useMemo(
    () => ({
      view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, myBids, user, users, allBids,
      auctions, auctionsLoading, authError,
      go, selectAuction, payFee, submitBid, payWinning, reset,
      login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction, refreshAuctions, refreshWallet, getAuction, fetchAuctionById,
    }),
    [view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, myBids, user, users, allBids,
     auctions, auctionsLoading, authError,
     go, selectAuction, payFee, submitBid, payWinning, reset,
     login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction, refreshAuctions, refreshWallet, getAuction, fetchAuctionById],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
