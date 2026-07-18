import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
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
import { DeliveryScreen } from './src/screens/DeliveryScreen'
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen'
import { AdminAuctionsScreen } from './src/screens/AdminAuctionsScreen'
import { AdminUsersScreen } from './src/screens/AdminUsersScreen'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { ToastProvider } from './src/components/Toast'
import { colors } from './src/theme'

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="light" />
        <ToastProvider>
          <ScreenRouter />
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

function ScreenRouter() {
  const { view, user, go, logout } = useApp()
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
      case 'monitor': return <MonitorScreen />
      case 'closed': return <ClosedScreen />
      case 'winner': return <WinnerScreen />
      case 'pay-winning': return <PayWinningScreen />
      case 'payment-confirmed': return <PaymentConfirmedScreen />
      case 'delivery': return <DeliveryScreen />
      case 'admin-dashboard': return isAdmin ? <AdminDashboardScreen /> : <HomeScreen />
      case 'admin-auctions': return isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />
      case 'admin-users': return isAdmin ? <AdminUsersScreen /> : <HomeScreen />
      default: return user ? <HomeScreen /> : <LoginScreen />
    }
  })()

  const showTabBar = ['home', 'auctions', 'my-bids'].includes(view)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {user && !['login', 'register', 'admin-dashboard', 'admin-auctions', 'admin-users'].includes(view) && (
        <View style={s.userStrip}>
          <Text style={s.userName}>{user.name}</Text>
          {isAdmin && <Text style={s.adminBadge}>Admin</Text>}
          <TouchableOpacity onPress={() => go('admin-dashboard')}><Text style={s.adminLink}>Admin</Text></TouchableOpacity>
          <TouchableOpacity onPress={logout}><Text style={s.logoutBtn}>Exit</Text></TouchableOpacity>
        </View>
      )}
      <View style={{ flex: 1 }}>{screen}</View>
      {showTabBar && <BottomTabBar />}
    </View>
  )
}

function BottomTabBar() {
  const { view, go } = useApp()
  const tabs = [
    { key: 'home', label: 'Home' },
    { key: 'auctions', label: 'Auctions' },
    { key: 'my-bids', label: 'My Bids' },
  ] as const

  return (
    <View style={s.bar}>
      {tabs.map((tab) => {
        const active = view === tab.key
        return (
          <TouchableOpacity key={tab.key} style={s.tab} onPress={() => go(tab.key as any)}>
            <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  userStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 },
  userName: { fontSize: 11, fontWeight: '600', color: colors.navyForeground + 'CC' },
  adminBadge: { fontSize: 9, fontWeight: '700', color: colors.primary, backgroundColor: colors.primary + '33', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  adminLink: { fontSize: 11, fontWeight: '600', color: colors.primary, marginLeft: 'auto' },
  logoutBtn: { fontSize: 11, fontWeight: '600', color: colors.destructive + 'CC' },
  bar: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 20, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
})
