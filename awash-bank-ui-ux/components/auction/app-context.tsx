"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

export type View =
  | "home"
  | "auctions"
  | "my-bids"
  | "product"
  | "pay-fee"
  | "place-bid"
  | "bid-confirmed"
  | "monitor"
  | "closed"
  | "winner"
  | "pay-winning"
  | "payment-confirmed"
  | "delivery"

export type PlacedBid = {
  auctionId: string
  amount: number
  placedAt: number
}

type AppState = {
  view: View
  selectedId: string | null
  userBid: number | null
  feePaid: boolean
  walletBalance: number
  myBids: PlacedBid[]
  go: (view: View) => void
  selectAuction: (id: string) => void
  payFee: (fee: number) => void
  submitBid: (amount: number) => void
  payWinning: (amount: number) => void
  reset: () => void
}

const AppContext = createContext<AppState | null>(null)

const INITIAL_BALANCE = 4250.75

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userBid, setUserBid] = useState<number | null>(null)
  const [feePaid, setFeePaid] = useState(false)
  const [walletBalance, setWalletBalance] = useState(INITIAL_BALANCE)
  const [myBids, setMyBids] = useState<PlacedBid[]>([])

  const go = useCallback((next: View) => setView(next), [])

  const selectAuction = useCallback((id: string) => {
    setSelectedId(id)
    setFeePaid(false)
    setUserBid(null)
    setView("product")
  }, [])

  const payFee = useCallback((fee: number) => {
    setWalletBalance((b) => Math.max(0, b - fee))
    setFeePaid(true)
    setView("place-bid")
  }, [])

  const submitBid = useCallback(
    (amount: number) => {
      setUserBid(amount)
      if (selectedId) {
        setMyBids((prev) => {
          const withoutCurrent = prev.filter((b) => b.auctionId !== selectedId)
          return [{ auctionId: selectedId, amount, placedAt: Date.now() }, ...withoutCurrent]
        })
      }
      setView("bid-confirmed")
    },
    [selectedId],
  )

  const payWinning = useCallback((amount: number) => {
    setWalletBalance((b) => Math.max(0, b - amount))
    setView("payment-confirmed")
  }, [])

  const reset = useCallback(() => {
    setView("home")
    setSelectedId(null)
    setUserBid(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setMyBids([])
  }, [])

  const value = useMemo(
    () => ({
      view,
      selectedId,
      userBid,
      feePaid,
      walletBalance,
      myBids,
      go,
      selectAuction,
      payFee,
      submitBid,
      payWinning,
      reset,
    }),
    [view, selectedId, userBid, feePaid, walletBalance, myBids, go, selectAuction, payFee, submitBid, payWinning, reset],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
