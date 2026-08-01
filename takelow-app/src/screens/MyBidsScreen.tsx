import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl } from 'react-native'
import { Gavel, Clock, Trophy, ChevronRight, ImageIcon, Hash } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card } from '../components/AuctionUI'
import { useCountdown } from '../components/Countdown'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRow } from '../components/SkeletonLoader'
import { CURRENCY, formatCurrency, formatETB, formatCountdown } from '../mockDataV0'
import { colors } from '../theme'

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
  const { go, myBids, selectAuction, getAuction, auctionsLoading, refreshAuctions } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshAuctions()
    } finally {
      setRefreshing(false)
    }
  }, [refreshAuctions])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="My Bids" onBack={() => go('home')} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>Your Active Bids</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>Track every auction you&apos;ve entered.</Text>
          </View>
          <Badge tone="navy">{myBids.length} placed</Badge>
        </View>

        {auctionsLoading && myBids.length === 0 ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : myBids.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No bids yet"
            message="Browse the live auctions and place your first unique lowest bid to get started."
            actionLabel="Browse Auctions"
            onAction={() => go('auctions')}
          />
        ) : (
          <View style={{ gap: 12 }}>
            {myBids.map((bid) => {
              const auction = getAuction(bid.auctionId)
              if (!auction) return null
              return (
                <TouchableOpacity key={`${bid.auctionId}-${bid.placedAt}`} onPress={() => selectAuction(bid.auctionId)} activeOpacity={0.8}>
                  <Card style={s.bidRow}>
                    <View style={s.bidImg}>{auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <ImageIcon size={24} color="#94a3b8" />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }} numberOfLines={1}>{auction.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Your bid</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] }}>{formatCurrency(bid.amount)}</Text>
                      </View>
                      {bid.ticketNumber && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                          <Hash size={10} color={colors.mutedForeground} />
                          <Text style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>
                            {bid.ticketNumber}
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        {auction.status === 'closed' ? (
                          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Auction ended</Text>
                        ) : (
                          <TimeLeft seconds={auction.timeLeft} />
                        )}
                        <Badge tone={auction.status === 'closed' ? 'muted' : 'green'}>
                          {auction.status === 'closed' ? 'Ended' : <><Trophy size={12} /> Running</>}
                        </Badge>
                      </View>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </Card>
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
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  bidImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.secondary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
})
