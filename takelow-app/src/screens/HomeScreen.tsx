import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Gavel, Send, Download, Smartphone, Zap, Receipt, CreditCard, Wallet, PiggyBank, Users, Bell, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useApp } from '../AppContext'
import { AwashMark, Badge } from '../components/AuctionUI'
import { colors, spacing, borderRadius, fontSize, CURRENCY } from '../theme'
import { formatETB } from '../mockDataV0'

const quickActions = [
  { icon: Send, label: 'Send' },
  { icon: Download, label: 'Receive' },
  { icon: Smartphone, label: 'Airtime' },
  { icon: Zap, label: 'Pay Bills' },
  { icon: Receipt, label: 'Statement' },
  { icon: CreditCard, label: 'Cards' },
  { icon: Users, label: 'Transfer' },
  { icon: PiggyBank, label: 'Savings' },
]

export function HomeScreen() {
  const { go, walletBalance, user } = useApp()
  const [showBalance, setShowBalance] = useState(true)

  return (
    <View style={s.container}>
      <View style={s.navyHeader}>
        <StatusBarCustom />
        <View style={s.headerRow}>
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <AwashMark size={28} />
            </View>
            <View>
              <Text style={s.greeting}>Welcome back</Text>
              <Text style={s.userName}>{user?.name || 'Selam Tesfaye'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Bell size={18} color={colors.navyForeground} />
            <View style={s.notifDot} />
          </TouchableOpacity>
        </View>
        <View style={s.walletSection}>
          <LinearGradient colors={[colors.primary, '#d9641a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.walletCard}>
            <View style={s.walletHeader}>
              <Text style={s.walletLabel}><Wallet size={16} color="#fff" /> Wallet Balance</Text>
              <TouchableOpacity onPress={() => setShowBalance((s) => !s)}>
                {showBalance ? <Eye size={16} color="#fff" /> : <EyeOff size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
            <Text style={s.balance}>{showBalance ? `${CURRENCY} ${formatETB(walletBalance)}` : '••••••'}</Text>
            <Text style={s.accountLabel}>Account ****091332</Text>
          </LinearGradient>
        </View>
      </View>
      <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
        <TouchableOpacity style={s.featuredBtn} onPress={() => go('auctions')} activeOpacity={0.8}>
          <View style={s.featuredIcon}>
            <Gavel size={24} color={colors.primaryForeground} />
          </View>
          <View style={s.featuredText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.featuredTitle}>Reverse Auction</Text>
              <Badge tone="orange">NEW</Badge>
            </View>
            <Text style={s.featuredSub}>Bid Low. Be Unique. Win Big!</Text>
          </View>
          <ArrowRight size={20} color={colors.primary} />
        </TouchableOpacity>

        {user?.role === 'admin' && (
          <TouchableOpacity style={s.adminBtn} onPress={() => go('admin-dashboard')} activeOpacity={0.8}>
            <View style={s.adminIcon}><Shield size={20} color={colors.primaryForeground} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminBtnTitle}>Admin Panel</Text>
              <Text style={s.adminBtnSub}>Manage auctions, users & bids</Text>
            </View>
            <ArrowRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.label} style={s.quickItem}>
              <View style={s.quickIcon}><a.icon size={18} color={colors.navy} /></View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.promo}>
          <Text style={s.promoTitle}>Live Auctions Now</Text>
          <Text style={s.promoSub}>Premium phones, TVs and laptops waiting for their lowest unique bid.</Text>
          <TouchableOpacity style={s.promoBtn} onPress={() => go('auctions')}>
            <Text style={s.promoBtnText}>Browse Auctions <ArrowRight size={14} color="#fff" /></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function StatusBarCustom() {
  return (
    <View style={s.statusBar}>
      <Text style={s.statusTime}>9:41</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Text style={s.statusIcon}>●●●●○</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navyHeader: { backgroundColor: colors.navy },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  statusTime: { fontSize: 13, fontWeight: '600', color: colors.navyForeground },
  statusIcon: { color: colors.navyForeground, fontSize: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 11, color: colors.white + '99' },
  userName: { fontSize: 14, fontWeight: '700', color: colors.navyForeground },
  notifBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white + '1A', justifyContent: 'center', alignItems: 'center' },
  notifDot: { position: 'absolute', right: 8, top: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  walletSection: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  walletCard: { borderRadius: 16, backgroundColor: colors.primary, padding: 16 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 12, fontWeight: '500', color: '#fff', opacity: 0.8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 8, fontVariant: ['tabular-nums'] },
  accountLabel: { fontSize: 12, color: '#fff', opacity: 0.7, marginTop: 4 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 20 },
  featuredBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '4D', backgroundColor: colors.accent, padding: 16 },
  featuredIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  featuredText: { flex: 1 },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  featuredSub: { fontSize: 12, fontWeight: '500', color: colors.navy + '99' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 28, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem: { width: '22%', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 10 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', color: colors.foreground },
  promo: { marginTop: 28, borderRadius: 16, backgroundColor: colors.navy, padding: 16 },
  promoTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  promoSub: { fontSize: 12, color: colors.white + 'B3', marginTop: 4 },
  promoBtn: { marginTop: 12, borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  promoBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryForeground },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '4D', backgroundColor: colors.primary + '0D', padding: 12, marginBottom: 8 },
  adminIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  adminBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  adminBtnSub: { fontSize: 11, fontWeight: '500', color: colors.muted },
})
