import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { Clock, Users, Flame, ChevronRight, TicketCheck, ShieldCheck, Trophy, Sparkles, PiggyBank } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge } from '../components/AuctionUI'
import { useCountdown } from '../components/Countdown'
import type { Auction } from '../mockDataV0'
import { CURRENCY, formatETB, formatCountdown } from '../mockDataV0'
import { colors, spacing, borderRadius, fontSize } from '../theme'

function TimePill({ seconds, endingSoon }: { seconds: number; endingSoon: boolean }) {
  const t = useCountdown(seconds)
  const { h, m, s: secStr } = formatCountdown(t)
  return (
    <View style={[s.timePill, { backgroundColor: endingSoon ? colors.primary + '26' : colors.navy + '1A' }]}>
      <Clock size={12} color={endingSoon ? colors.primary : colors.navy} />
      <Text style={[s.timePillText, { color: endingSoon ? colors.primary : colors.navy }]}>{h}:{m}:{secStr}</Text>
    </View>
  )
}

function AuctionRow({ auction, onOpen }: { auction: Auction; onOpen: () => void }) {
  const endingSoon = auction.status === 'ending-soon'
  return (
    <TouchableOpacity onPress={onOpen} style={s.row} activeOpacity={0.8}>
      <View style={s.rowImage}>
        <Image source={{ uri: auction.image }} style={s.rowImg} resizeMode="contain" />
      </View>
      <View style={s.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.rowName} numberOfLines={1}>{auction.name}</Text>
          {endingSoon && <Badge tone="orange"><Flame size={12} /> Hot</Badge>}
        </View>
        <Text style={s.rowMarket}>Market: {CURRENCY} {formatETB(auction.marketPrice)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
          <Text style={s.rowBidders}><Users size={12} /> {auction.bidders} bidders</Text>
        </View>
      </View>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  )
}

const loveItems = [
  { icon: Trophy, label: 'Win premium products for the lowest price' },
  { icon: ShieldCheck, label: 'Fair & transparent — lowest unique bid wins' },
  { icon: Sparkles, label: 'Simple, secure and trusted payments' },
  { icon: PiggyBank, label: 'Big savings, big rewards' },
]

export function AuctionsScreen() {
  const { go, selectAuction, myBids, auctions } = useApp()
  const [category, setCategory] = useState('All')

  const categories = useMemo(() => ['All', ...Array.from(new Set(auctions.map((a) => a.category)))], [])
  const filtered = useMemo(() => (category === 'All' ? auctions : auctions.filter((a) => a.category === category)), [category])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar
          title="Live Auctions"
          onBack={() => go('home')}
          right={
            <TouchableOpacity onPress={() => go('my-bids')} style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
              <TicketCheck size={20} color={colors.navyForeground} />
              {myBids.length > 0 && (
                <View style={s.badgeCount}>
                  <Text style={s.badgeCountText}>{myBids.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={s.pageTitle}>Reverse Auctions</Text>
            <Text style={s.pageSub}>Lowest unique bid wins. Bid low, be unique!</Text>
          </View>
          <Badge tone="green">
            <View style={s.greenDot} />
            {' '}{auctions.length} Live
          </Badge>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 }}>
          {categories.map((c) => {
            const active = c === category
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[s.chip, active ? { backgroundColor: colors.navy, borderColor: colors.navy } : { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[s.chipText, { color: active ? colors.navyForeground : colors.mutedForeground }]}>{c}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={{ gap: 12 }}>
          {filtered.map((a) => <AuctionRow key={a.id} auction={a} onOpen={() => selectAuction(a.id)} />)}
        </View>

        <View style={s.loveBox}>
          <Text style={s.loveTitle}>Why customers love it</Text>
          {loveItems.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <View style={s.loveIcon}><item.icon size={16} color={colors.primary} /></View>
              <Text style={s.loveText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

function StatusBarCustom() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyForeground }}>9:41</Text>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 },
  rowImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  rowImg: { width: '100%', height: '100%' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.navy },
  rowMarket: { fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  rowBidders: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, flexDirection: 'row', alignItems: 'center' },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  timePillText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badgeCount: { position: 'absolute', right: -2, top: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeCountText: { fontSize: 9, fontWeight: '700', color: colors.primaryForeground },
  pageTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  pageSub: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  loveBox: { marginTop: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary + '99', padding: 16 },
  loveTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 4 },
  loveIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  loveText: { fontSize: 12, fontWeight: '500', color: colors.navy + 'CC', flex: 1 },
})
