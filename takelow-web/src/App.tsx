import { useState } from "react"
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
import { WinnerScreen } from "./screens/WinnerScreen"
import { PayWinningScreen } from "./screens/PayWinningScreen"
import { PaymentConfirmedScreen } from "./screens/PaymentConfirmedScreen"
import { DeliveryScreen } from "./screens/DeliveryScreen"
import { AdminDashboardScreen } from "./screens/AdminDashboardScreen"
import { AdminAuctionsScreen } from "./screens/AdminAuctionsScreen"
import { AdminUsersScreen } from "./screens/AdminUsersScreen"
import { BrandPanel } from "./components/BrandPanel"
import { AwashLogo } from "./components/AuctionUI"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ToastContainer } from "./components/Toast"

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
    case "monitor": return <MonitorScreen />
    case "closed": return <ClosedScreen />
    case "winner": return <WinnerScreen />
    case "pay-winning": return <PayWinningScreen />
    case "payment-confirmed": return <PaymentConfirmedScreen />
    case "delivery": return <DeliveryScreen />
    case "admin-dashboard": return isAdmin ? <AdminDashboardScreen /> : <HomeScreen />
    case "admin-auctions": return isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />
    case "admin-users": return isAdmin ? <AdminUsersScreen /> : <HomeScreen />
    default: return user ? <HomeScreen /> : <LoginScreen />
  }
}

function DeviceFrame() {
  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-card min-h-[100dvh] lg:h-[864px] lg:min-h-0 lg:w-[410px] lg:rounded-[2.75rem] lg:border-[11px] lg:border-[#0d1533] lg:shadow-2xl lg:shadow-black/40">
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-[#0d1533] lg:block" />
      <ScreenRouter />
    </div>
  )
}

function AppContent() {
  const { user, logout } = useApp()
  const isAdmin = user?.role === "admin"
  return (
    <div className="min-h-screen bg-muted lg:bg-gradient-to-br lg:from-[#141d47] lg:via-navy lg:to-[#0d1533]">
      <div className="flex items-center justify-between bg-navy px-4 py-2 lg:hidden">
        <AwashLogo variant="dark" />
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-navy-foreground/60">{user.name}</span>
            {isAdmin && <span className="rounded-full bg-primary/30 px-2 py-0.5 text-[9px] font-bold text-primary">Admin</span>}
            <button onClick={logout} className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-navy-foreground/70">Exit</button>
          </div>
        )}
      </div>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:py-12">
        <BrandPanel className="hidden lg:flex" />
        <div className="flex justify-center lg:flex-shrink-0">
          <DeviceFrame />
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  )
}
