import { useEffect, useCallback, useState } from "react"
import { useApp, AppProvider } from "./AppContext"
import { LoginScreen } from "./screens/LoginScreen"
import { RegisterScreen } from "./screens/RegisterScreen"
import { HomeScreen } from "./screens/HomeScreen"
import { AuctionsScreen } from "./screens/AuctionsScreen"
import { MyBidsScreen } from "./screens/MyBidsScreen"
import { ProductScreen } from "./screens/ProductScreen"
import { PayFeeScreen } from "./screens/PayFeeScreen"
import { PlaceBidScreen } from "./screens/PlaceBidScreen"
import { BidConfirmedScreen } from "./screens/BidConfirmedScreen"
import { MonitorScreen } from "./screens/MonitorScreen"
import { ClosedScreen } from "./screens/ClosedScreen"
import { ClosedAuctionsScreen } from "./screens/ClosedAuctionsScreen"
import { WinnerScreen } from "./screens/WinnerScreen"
import { PayWinningScreen } from "./screens/PayWinningScreen"
import { PaymentConfirmedScreen } from "./screens/PaymentConfirmedScreen"
import { PaymentResultScreen } from "./screens/PaymentResultScreen"
import { PaymentVerifyingScreen } from "./screens/PaymentVerifyingScreen"
import { DeliveryScreen } from "./screens/DeliveryScreen"
import { DepositScreen } from "./screens/DepositScreen"
import { AdminDashboardScreen } from "./screens/AdminDashboardScreen"
import { AdminAuctionsScreen } from "./screens/AdminAuctionsScreen"
import { AdminProductsScreen } from "./screens/AdminProductsScreen"
import { AdminUsersScreen } from "./screens/AdminUsersScreen"
import { AwashMark, BottomTabBar } from "./components/AuctionUI"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ToastContainer } from "./components/Toast"
import { ShimmerProvider } from "./components/SkeletonLoader"
import { Gavel, Wallet, PiggyBank, TicketCheck, Shield, LogOut, Trophy, Menu, X } from "lucide-react"

function ScreenRouter() {
  const { view, user } = useApp()
  const isAdmin = user?.role === "admin"
  switch (view) {
    case "login": return <LoginScreen />
    case "register": return <RegisterScreen />
    case "home": return <HomeScreen />
    case "auctions": return <AuctionsScreen />
    case "my-bids": return <MyBidsScreen />
    case "product": return <ProductScreen />
    case "pay-fee": return <PayFeeScreen />
    case "place-bid": return <PlaceBidScreen />
    case "bid-confirmed": return <BidConfirmedScreen />
    case "monitor": return isAdmin ? <MonitorScreen /> : <HomeScreen />
    case "closed": return <ClosedScreen />
    case "closed-auctions": return <ClosedAuctionsScreen />
    case "winner": return <WinnerScreen />
    case "pay-winning": return <PayWinningScreen />
    case "payment-confirmed": return <PaymentConfirmedScreen />
    case "delivery": return <DeliveryScreen />
    case "payment-verifying": return <PaymentVerifyingScreen />
    case "payment-success": return <PaymentResultScreen />
    case "deposit": return <DepositScreen />
    case "payment-failed": return <PaymentResultScreen />
    case "admin-dashboard": return isAdmin ? <AdminDashboardScreen /> : <HomeScreen />
    case "admin-auctions": return isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />
    case "admin-products": return isAdmin ? <AdminProductsScreen /> : <HomeScreen />
    case "admin-users": return isAdmin ? <AdminUsersScreen /> : <HomeScreen />
    default: return user ? <HomeScreen /> : <LoginScreen />
  }
}

function Navbar() {
  const { go, view, user, logout } = useApp()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isAuthed = !!user
  if (!isAuthed) return null

  const navItems = [
    { id: "home", label: "Home", icon: Wallet },
    { id: "auctions", label: "Auctions", icon: Gavel },
    { id: "closed-auctions", label: "Winners", icon: Trophy },
    { id: "my-bids", label: "My Bids", icon: TicketCheck },
    ...(user?.role === "admin" ? [{ id: "admin-dashboard", label: "Admin", icon: Shield }] : []),
  ]

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <button onClick={() => go("home")} className="flex items-center gap-2 sm:gap-3 group">
              <div className="transition-transform duration-300 group-hover:scale-105">
                <AwashMark size={26} />
              </div>
              <div className="leading-tight">
                <div className="font-display text-sm sm:text-base font-extrabold tracking-tight text-awash-blue">
                  Awash Bank
                </div>
                <div className="text-[9px] sm:text-[10px] font-semibold tracking-wide text-gradient-gold">
                  Reverse Auction
                </div>
              </div>
            </button>
            <div className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id as any)}
                  className={`nav-btn flex items-center gap-1.5 ${
                    view === item.id ? "active" : ""
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-medium text-neutral-500 sm:block">
              {user?.name || user?.phone}
            </span>
            <button
              onClick={logout}
              className="sm:flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-neutral-500 transition-all duration-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:shadow-sm hidden"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="flex sm:hidden items-center justify-center size-9 rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              {drawerOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-14 w-64 max-w-[85vw] bg-white border-l border-border/50 shadow-2xl rounded-bl-2xl p-4 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-border/50">
              <div className="flex size-10 items-center justify-center rounded-full bg-awash-blue/10 text-awash-blue font-bold text-sm">
                {(user?.name || user?.phone)?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-awash-blue truncate">{user?.name || "User"}</div>
                <div className="text-xs text-neutral-400 truncate">{user?.phone}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { go(item.id as any); setDrawerOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    view === item.id
                      ? "bg-awash-blue text-white shadow-md"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <button
                onClick={() => { logout(); setDrawerOpen(false) }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function RedirectHandler() {
  const { go, setSelectedIdOnly } = useApp()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const path = window.location.pathname
    const clientRef = params.get("clientReferenceId") || params.get("client_reference_id")
    const type = params.get("type") || params.get("payment")

    if (path.includes("/payment/success") || type === "success") {
      if (window.opener) {
        window.opener.postMessage({ type: "PAYMENT_SUCCESS", clientReferenceId: clientRef }, window.location.origin)
        window.close()
        return
      }
      if (clientRef) setSelectedIdOnly(clientRef)
      go("payment-success")
      window.history.replaceState({}, "", window.location.pathname)
    } else if (path.includes("/payment/failed") || type === "failed") {
      if (window.opener) {
        window.opener.postMessage({ type: "PAYMENT_FAILED", clientReferenceId: clientRef }, window.location.origin)
        window.close()
        return
      }
      if (clientRef) setSelectedIdOnly(clientRef)
      go("payment-failed")
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [go, setSelectedIdOnly])
  return null
}

function BottomNav() {
  const { go, view, user } = useApp()
  if (!user) return null

  const showBottomBar = [
    "home", "auctions", "closed-auctions", "my-bids",
    "admin-dashboard", "admin-auctions", "admin-products", "admin-users",
  ].includes(view)

  if (!showBottomBar) return null

  const items = [
    { id: "home", label: "Home", icon: Wallet },
    { id: "auctions", label: "Auctions", icon: Gavel },
    { id: "closed-auctions", label: "Winners", icon: Trophy },
    { id: "my-bids", label: "My Bids", icon: TicketCheck },
    ...(user?.role === "admin" ? [{ id: "admin-dashboard", label: "Admin", icon: Shield }] : []),
  ]

  return (
    <div className="block sm:hidden">
      <BottomTabBar
        items={items}
        activeTab={view}
        onTabChange={(id) => go(id as any)}
      />
    </div>
  )
}

function AppContent() {
  const { go, setSelectedIdOnly } = useApp()

  const handlePaymentMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === "PAYMENT_SUCCESS") {
      if (event.data.clientReferenceId) setSelectedIdOnly(event.data.clientReferenceId)
      go("payment-success")
    } else if (event.data?.type === "PAYMENT_FAILED") {
      if (event.data.clientReferenceId) setSelectedIdOnly(event.data.clientReferenceId)
      go("payment-failed")
    }
  }, [go, setSelectedIdOnly])

  useEffect(() => {
    window.addEventListener("message", handlePaymentMessage)
    return () => window.removeEventListener("message", handlePaymentMessage)
  }, [handlePaymentMessage])

  return (
    <div className="flex min-h-screen flex-col bg-dots">
      <RedirectHandler />
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6 pb-[88px] sm:pb-6">
        <div className="animate-fade-in flex-1 flex flex-col">
          <ScreenRouter />
        </div>
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ShimmerProvider>
          <AppContent />
        </ShimmerProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}
