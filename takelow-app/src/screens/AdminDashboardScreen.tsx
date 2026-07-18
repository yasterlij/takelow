import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Gavel, Users, TrendingUp, DollarSign } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Badge } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function AdminDashboardScreen() {
  const { go, allBids, user, users, auctions } = useApp()
  const stats = [
    { icon: Gavel, label: 'Active Auctions', value: auctions.filter((a) => a.status !== 'closed').length, color: colors.primary },
    { icon: Users, label: 'Users', value: users.length, color: colors.navy },
    { icon: TrendingUp, label: 'Total Bids', value: allBids.length, color: colors.emerald600 },
    { icon: DollarSign, label: 'Revenue', value: `${CURRENCY} ${formatETB(allBids.length * 10)}`, color: colors.primary },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navyForeground }}>Admin Panel</Text>
          <Badge tone="orange">Admin</Badge>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {stats.map((s) => (
            <View key={s.label} style={s2.statCard}>
              <Text style={{ color: s.color }}>{s.icon({ size: 20 })}</Text>
              <Text style={s2.statValue}>{s.value}</Text>
              <Text style={s2.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={s2.section}>
          <Text style={s2.sectionTitle}>All Auctions ({auctions.length})</Text>
          {auctions.map((a) => (
            <View key={a.id} style={s2.auctionRow}>
              <View>
                <Text style={s2.auctionName}>{a.name}</Text>
                <Text style={s2.auctionMeta}>{a.bidders} bidders · {CURRENCY} {formatETB(a.marketPrice)}</Text>
              </View>
              <Badge tone={a.status === 'ending-soon' ? 'orange' : a.status === 'live' ? 'green' : 'muted'}>{a.status}</Badge>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1 }}><CTAButton variant="navy" onPress={() => go('admin-auctions')}>Manage Auctions</CTAButton></View>
          <View style={{ flex: 1 }}><CTAButton variant="outline" onPress={() => go('admin-users')}>Manage Users</CTAButton></View>
        </View>
        <View style={{ marginTop: 12 }}><CTAButton variant="outline" onPress={() => go('home')}>Back to App</CTAButton></View>
      </ScrollView>
    </View>
  )
}

const s2 = StyleSheet.create({
  statCard: { width: '47%', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 },
  section: { marginTop: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  auctionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, backgroundColor: colors.secondary + '99', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  auctionName: { fontSize: 13, fontWeight: '600', color: colors.navy },
  auctionMeta: { fontSize: 10, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
})
