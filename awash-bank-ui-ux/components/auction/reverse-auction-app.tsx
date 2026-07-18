"use client"

import { AppProvider, useApp } from "./app-context"
import { AwashLogo } from "./logo"
import { BrandPanel } from "./brand-panel"
import { HomeScreen } from "./screens/home"
import { AuctionsScreen } from "./screens/auctions"
import { MyBidsScreen } from "./screens/my-bids"
import { ProductScreen } from "./screens/product"
import { PayFeeScreen } from "./screens/pay-fee"
import { PlaceBidScreen } from "./screens/place-bid"
import { BidConfirmedScreen } from "./screens/bid-confirmed"
import { MonitorScreen } from "./screens/monitor"
import { ClosedScreen } from "./screens/closed"
import { WinnerScreen } from "./screens/winner"
import { PayWinningScreen } from "./screens/pay-winning"
import { PaymentConfirmedScreen } from "./screens/payment-confirmed"
import { DeliveryScreen } from "./screens/delivery"

function ScreenRouter() {
  const { view } = useApp()
  switch (view) {
    case "home":
      return <HomeScreen />
    case "auctions":
      return <AuctionsScreen />
    case "my-bids":
      return <MyBidsScreen />
    case "product":
      return <ProductScreen />
    case "pay-fee":
      return <PayFeeScreen />
    case "place-bid":
      return <PlaceBidScreen />
    case "bid-confirmed":
      return <BidConfirmedScreen />
    case "monitor":
      return <MonitorScreen />
    case "closed":
      return <ClosedScreen />
    case "winner":
      return <WinnerScreen />
    case "pay-winning":
      return <PayWinningScreen />
    case "payment-confirmed":
      return <PaymentConfirmedScreen />
    case "delivery":
      return <DeliveryScreen />
    default:
      return <HomeScreen />
  }
}

function DeviceFrame() {
  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-card min-h-[100dvh] lg:h-[864px] lg:min-h-0 lg:w-[410px] lg:rounded-[2.75rem] lg:border-[11px] lg:border-[#0d1533] lg:shadow-2xl lg:shadow-black/40">
      {/* notch on desktop */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-[#0d1533] lg:block" />
      <ScreenRouter />
    </div>
  )
}

export function ReverseAuctionApp() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-muted lg:bg-gradient-to-br lg:from-[#141d47] lg:via-navy lg:to-[#0d1533]">
        {/* mobile top strip */}
        <div className="flex items-center justify-between bg-navy px-4 py-2 lg:hidden">
          <AwashLogo variant="dark" />
        </div>

        <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row lg:items-center lg:gap-12 lg:px-10 lg:py-12">
          <BrandPanel className="hidden lg:flex" />
          <div className="flex justify-center lg:flex-shrink-0">
            <DeviceFrame />
          </div>
        </div>
      </div>
    </AppProvider>
  )
}
