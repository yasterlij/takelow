import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { Gavel, Clock, TicketCheck, Trophy, ChevronRight } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, CTAButton } from '../components/AuctionUI'
import { useCountdown } from '../components/Countdown'
import { CURRENCY, formatETB, formatCountdown } from '../mockDataV0'
import { colors, borderRadius, fontSize } from '../theme'

function TimeLeft({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const { h, m, s } = formatCountdown(t)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Clock size={12} color={colors.navy} />
      <Text style={{ fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.navy }}>{h}:{m}:{s} left</Text>
    </View>
  )
}

export function MyBidsScreen() {
  const { go, myBids, selectAuction, getAuction } = useApp()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="My Bids" onBack={() => go('auctions')} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>Your Active Bids</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>Track every auction you&apos;ve entered.</Text>
          </View>
          <Badge tone="navy"><TicketCheck size={12} /> {myBids.length} placed</Badge>
        </View>

        {myBids.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Gavel size={28} color={colors.navy} /></View>
            <Text style={s.emptyTitle}>No bids yet</Text>
            <Text style={s.emptySub}>Browse the live auctions and place your first unique lowest bid.</Text>
            <CTAButton onPress={() => go('auctions')} style={{ marginTop: 8, paddingHorizontal: 24 }}>Browse Auctions</CTAButton>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {myBids.map((bid) => {
              const auction = getAuction(bid.auctionId)
              if (!auction) return null
              return (
                <TouchableOpacity key={bid.auctionId} onPress={() => selectAuction(bid.auctionId)} style={s.bidRow} activeOpacity={0.8}>
                  <View style={s.bidImg}><Image source={{ uri: auction.image }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }} numberOfLines={1}>{auction.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Your bid</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] }}>{CURRENCY} {formatETB(bid.amount)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <TimeLeft seconds={auction.timeLeft} />
                      <Badge tone="green"><Trophy size={12} /> In the running</Badge>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}
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
  empty: { marginTop: 40, alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 24, paddingVertical: 48 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  emptySub: { fontSize: 12, color: colors.mutedForeground, textAlign: 'center' },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12 },
  bidImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.secondary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
})
