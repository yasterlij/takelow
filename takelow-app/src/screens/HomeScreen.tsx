import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable, RefreshControl, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Gavel, Send, Download, Smartphone, Zap, Receipt, CreditCard, Wallet, PiggyBank, Users, ArrowRight, Eye, EyeOff, Shield, LogOut, User, Sparkles } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashMark, Badge } from '../components/AuctionUI'
import { colors, spacing, borderRadius, fontSize, CURRENCY } from '../theme'
import { formatETB } from '../mockDataV0'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

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
  const { go, walletBalance, user, logout, auctions, auctionsLoading, refreshAuctions } = useApp()
  const isAdmin = user?.role === 'admin'
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  const activeAuctions = auctions.filter((a) => a.status !== 'closed').length

  return (
    <View style={s.container}>
      <View style={s.navyHeader}>
        <View style={s.headerRow}>
          <View style={s.logoBtn}>
            <LinearGradient colors={['#ffffff', '#ffffff']} style={s.logoCircle}>
              <AwashMark size={24} />
            </LinearGradient>
          </View>

          <View style={s.welcomeSection}>
            <Text style={s.greeting}>Welcome back</Text>
            <Text style={s.userName} numberOfLines={1} ellipsizeMode="tail">{user?.name || user?.phone || 'User'}</Text>
          </View>

          <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.avatarBtn}>
            <Text style={s.avatarText}>{getInitials(user?.name || '?')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient colors={[colors.primary, '#d9641a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.walletCard}>
        <View style={s.walletHeader}>
          <Text style={s.walletLabel}><Wallet size={16} color="#fff" /> Wallet Balance</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => go('deposit')}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>+ Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBalance((s) => !s)}>
              {showBalance ? <Eye size={16} color="#fff" /> : <EyeOff size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.balance}>{showBalance ? `${CURRENCY} ${formatETB(walletBalance)}` : '••••••'}</Text>
        <Text style={s.accountLabel}>Account ****091332</Text>
      </LinearGradient>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <TouchableOpacity style={s.featuredBtn} onPress={() => go('auctions')} activeOpacity={0.8}>
          <View style={s.featuredIcon}>
            <Gavel size={24} color={colors.primaryForeground} />
          </View>
          <View style={s.featuredText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.featuredTitle}>Reverse Auction</Text>
              <Badge tone="orange">NEW</Badge>
            </View>
            <Text style={s.featuredSub}>
              {auctionsLoading ? 'Loading auctions...' : `${activeAuctions} live auctions — Bid Low. Be Unique. Win Big!`}
            </Text>
          </View>
          <ArrowRight size={20} color={colors.primary} />
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={s.adminBtn} onPress={() => go('admin-dashboard')} activeOpacity={0.8}>
            <View style={s.adminIcon}><Shield size={20} color={colors.primaryForeground} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminBtnTitle}>Admin Panel</Text>
              <Text style={s.adminBtnSub}>Manage auctions, users & bids</Text>
            </View>
            <ArrowRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity key={a.label} style={s.quickItem}>
              <View style={s.quickIcon}><a.icon size={18} color={colors.navy} /></View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.promo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={s.promoTitle}>Live Auctions Now</Text>
          </View>
          <Text style={s.promoSub}>Premium phones, TVs and laptops waiting for their lowest unique bid.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={s.promoBtn} onPress={() => go('auctions')}>
              <Text style={s.promoBtnText}>Browse Auctions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.promoOutlineBtn} onPress={() => go('my-bids')}>
              <Text style={s.promoOutlineBtnText}>My Bids</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View />
        </Pressable>
        <View style={s.dropdown}>
          <View style={s.menuHeader}>
            <View style={s.menuAvatar}>
              <Text style={s.menuAvatarText}>{getInitials(user?.name || '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuName}>{user?.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {isAdmin ? <Shield size={12} color={colors.primary} /> : <User size={12} color={colors.mutedForeground} />}
                <Text style={[s.menuRole, { color: isAdmin ? colors.primary : colors.mutedForeground }]}>
                  {isAdmin ? 'Admin' : 'User'}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          {isAdmin && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); go('admin-dashboard') }}>
              <Shield size={16} color={colors.navy} />
              <Text style={s.menuItemText}>Admin Panel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); logout() }}>
            <LogOut size={16} color={colors.destructive} />
            <Text style={[s.menuItemText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

function StatusBarCustom() {
  return null
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navyHeader: { backgroundColor: colors.navy, paddingTop: 4, paddingBottom: 8, paddingHorizontal: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', shadowColor: colors.white, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  logoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  welcomeSection: { marginRight: 12, flex: 1 },
  greeting: { fontSize: 11, fontWeight: '400', color: colors.navyForeground + '99' },
  userName: { fontSize: 14, fontWeight: '700', color: colors.navyForeground },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.white },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.destructive + '20', justifyContent: 'center', alignItems: 'center' },
  walletSection: { marginTop: 12, paddingHorizontal: 16 },
  walletCard: { borderRadius: 16, padding: 16, overflow: 'hidden' },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 12, fontWeight: '600', color: colors.white + 'CC', flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 28, fontWeight: '800', color: colors.white, marginTop: 8, fontVariant: ['tabular-nums'] },
  accountLabel: { fontSize: 11, color: colors.white + 'B3', marginTop: 4 },
  body: { flex: 1, backgroundColor: colors.background },
  bodyContent: { paddingHorizontal: 20, paddingBottom: 100 },
  featuredBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '4D', backgroundColor: colors.accent, padding: 16 },
  featuredIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  featuredText: { flex: 1 },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: colors.navy, flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredSub: { fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', marginTop: 2 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '4D', backgroundColor: colors.primary + '0D', padding: 12, marginBottom: 8 },
  adminIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  adminBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  adminBtnSub: { fontSize: 11, fontWeight: '500', color: colors.muted },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickItem: { width: '48%', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: colors.navy, textAlign: 'center' },
  promo: { marginTop: 24, borderRadius: 16, backgroundColor: colors.navy, padding: 16 },
  promoTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  promoSub: { fontSize: 12, color: colors.white + 'B3', marginTop: 4 },
  promoBtn: { flex: 1, borderRadius: 8, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  promoBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryForeground },
  promoOutlineBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.white + '4D', paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  promoOutlineBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dropdown: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 16 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 20 },
  menuAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  menuAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  menuName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  menuRole: { fontSize: 12, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: colors.navy },
})