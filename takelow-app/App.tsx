import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Home, Gavel, TicketCheck, LogOut } from 'lucide-react-native'
import { AppProvider, useApp } from './src/AppContext'
import { LoginScreen } from './src/screens/LoginScreen'
import { RegisterScreen } from './src/screens/RegisterScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { AuctionsScreen } from './src/screens/AuctionsScreen'
import { MyBidsScreen } from './src/screens/MyBidsScreen'
import { ProductScreen } from './src/screens/ProductScreen'
import { PayFeeScreen } from './src/screens/PayFeeScreen'
import { PlaceBidScreen } from './src/screens/PlaceBidScreen'
import { BidConfirmedScreen } from './src/screens/BidConfirmedScreen'
import { MonitorScreen } from './src/screens/MonitorScreen'
import { ClosedScreen } from './src/screens/ClosedScreen'
import { WinnerScreen } from './src/screens/WinnerScreen'
import { PayWinningScreen } from './src/screens/PayWinningScreen'
import { PaymentConfirmedScreen } from './src/screens/PaymentConfirmedScreen'
import { PaymentResultScreen } from './src/screens/PaymentResultScreen'
import { DeliveryScreen } from './src/screens/DeliveryScreen'
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen'
import { AdminAuctionsScreen } from './src/screens/AdminAuctionsScreen'
import { AdminUsersScreen } from './src/screens/AdminUsersScreen'
import { DepositScreen } from './src/screens/DepositScreen'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { ToastProvider } from './src/components/Toast'
import { ShimmerProvider } from './src/components/SkeletonLoader'
import { colors } from './src/theme'

const TAB_ICONS: Record<string, typeof Home> = { home: Home, auctions: Gavel, 'my-bids': TicketCheck, logout: LogOut }

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ShimmerProvider>
          <AppProvider>
            <StatusBar style="light" />
            <ScreenRouter />
          </AppProvider>
        </ShimmerProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function ScreenRouter() {
  const { view, user, go } = useApp()
  const isAdmin = user?.role === 'admin'

  const screen = (() => {
    switch (view) {
      case 'login': return <LoginScreen />
      case 'register': return <RegisterScreen />
      case 'home': return <HomeScreen />
      case 'auctions': return <AuctionsScreen />
      case 'my-bids': return <MyBidsScreen />
      case 'product': return <ProductScreen />
      case 'pay-fee': return <PayFeeScreen />
      case 'place-bid': return <PlaceBidScreen />
      case 'bid-confirmed': return <BidConfirmedScreen />
      case 'monitor': return isAdmin ? <MonitorScreen /> : <HomeScreen />
      case 'closed': return <ClosedScreen />
      case 'winner': return isAdmin ? <WinnerScreen /> : <HomeScreen />
      case 'pay-winning': return <PayWinningScreen />
      case 'payment-confirmed': return <PaymentConfirmedScreen />
      case 'payment-success': return <PaymentResultScreen />
      case 'payment-failed': return <PaymentResultScreen />
      case 'delivery': return <DeliveryScreen />
      case 'admin-dashboard': return isAdmin ? <AdminDashboardScreen /> : <HomeScreen />
      case 'admin-auctions': return isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />
      case 'admin-users': return isAdmin ? <AdminUsersScreen /> : <HomeScreen />
      case 'deposit': return <DepositScreen />
      default: return user ? <HomeScreen /> : <LoginScreen />
    }
  })()

  const showTabBar = user && ['home', 'auctions', 'my-bids'].includes(view)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>{screen}</View>
      {showTabBar && <BottomTabBar />}
    </View>
  )
}

function BottomTabBar() {
  const { view, go, myBids, logout } = useApp()
  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'auctions', label: 'Auctions' },
    { key: 'my-bids', label: 'My Bids' },
  ] as const

  return (
    <View style={s.bar}>
      {tabs.map((tab) => {
        const active = view === tab.key
        const Icon = TAB_ICONS[tab.key]
        return (
          <TouchableOpacity key={tab.key} style={s.tab} onPress={() => go(tab.key as any)} activeOpacity={0.7}>
            <View style={{ position: 'relative' }}>
              <Icon size={20} color={active ? colors.primary : '#9CA3AF'} strokeWidth={active ? 2.5 : 1.5} />
              {tab.key === 'my-bids' && myBids.length > 0 && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeText}>{myBids.length > 9 ? '9+' : myBids.length}</Text>
                </View>
              )}
            </View>
            <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
      <TouchableOpacity style={s.tab} onPress={logout} activeOpacity={0.7}>
        <LogOut size={20} color={colors.destructive} />
        <Text style={[s.tabLabel, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 24, paddingTop: 8, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  tabBadge: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: colors.primaryForeground },
})