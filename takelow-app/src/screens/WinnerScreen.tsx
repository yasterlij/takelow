import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated, ScrollView, ActivityIndicator } from 'react-native'
import { Trophy, CreditCard, PartyPopper, AlertTriangle, Users, Clock, ImageIcon } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Card } from '../components/AuctionUI'
import { api, type ApiWinnerResult, type ApiAuctionResult } from '../api'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function WinnerScreen() {
  const { go, selectedId, getAuction, user } = useApp()
  const isAdmin = user?.role === 'admin'
  const auction = getAuction(selectedId)
  const [winner, setWinner] = useState<ApiWinnerResult | ApiAuctionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pingAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    const fetch = isAdmin ? api.drawWinner(selectedId) : api.getAuctionResult(selectedId)
    fetch
      .then(setWinner as any)
      .catch((e) => setError(e.message || 'Failed to load winner'))
      .finally(() => setLoading(false))
  }, [selectedId, isAdmin])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.6, duration: 1000, useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  if (!auction) return null

  const savings = winner?.winning_bid_amount != null ? (auction.marketPrice - winner.winning_bid_amount) : 0
  const savingsPct = auction.marketPrice > 0 ? Math.round((savings / auction.marketPrice) * 100) : 0
  const winnerName = winner?.winner_name || (winner?.winner_user_id ? `User ${winner.winner_user_id.slice(0, 8)}` : null)
  const deadline = winner?.payment_deadline ? new Date(winner.payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : null

  return (
    <View style={{ flex: 1 }}>
      <View style={s.gradient}>
        <StatusBarCustom />
        <View style={s.body}>
          <View style={s.winnerBadge}>
            <PartyPopper size={14} color={colors.primary} />
            <Text style={s.winnerBadgeText}>Winner Results</Text>
          </View>

          <View style={{ position: 'relative', marginTop: 16 }}>
            <Animated.View style={[s.pingRing, { transform: [{ scale: pingAnim }], opacity: pingAnim.interpolate({ inputRange: [1, 1.6], outputRange: [0.4, 0] }) }]} />
            <View style={s.trophyCircle}>
              <Trophy size={48} strokeWidth={1.5} color={colors.white} />
            </View>
          </View>

          {loading ? (
            <View style={{ marginTop: 48, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.subtitle}>Calculating winner...</Text>
            </View>
          ) : error ? (
            <View style={{ marginTop: 40, alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={32} color="#FCD34D" />
              <Text style={s.subtitle}>{error}</Text>
            </View>
          ) : winner ? (
            <>
              <Text style={s.title}>{winner.winner_user_id ? 'Winner Found!' : 'No Winner'}</Text>
              <Text style={s.subtitle}>
                {winner.winner_user_id
                  ? `Lowest unique bid out of ${winner.total_bids} bids.`
                  : `No unique bids among ${winner.total_bids} bids.`}
              </Text>

              {winner.payment_status === 'PAID' && (
                <View style={s.paidBadge}>
                  <CreditCard size={14} color={colors.emerald600} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.emerald600 }}>Payment Complete</Text>
                </View>
              )}

              {winner.winner_user_id && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 20, marginTop: 24 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={s.productImageWrap}>
                      {auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: 88, height: 88 }} resizeMode="contain" /> : <ImageIcon size={32} color="#94a3b8" />}
                    </View>
                    <Text style={s.productName}>{auction.name}</Text>
                  </View>
                  <View style={s.winningBidBox}>
                    <Text style={s.winLabel}>Winning Bid</Text>
                    <Text style={s.winAmount}>{formatETB(winner.winning_bid_amount ?? 0)} {CURRENCY}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Total Bids</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{winner.total_bids}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Unique Bidders</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{winner.unique_bidders}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Winner</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{winnerName || 'Unknown'}</Text>
                  </View>
                  {winner.lowest_unique_bid != null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Lowest Unique Bid</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald600 }}>{CURRENCY} {formatETB(winner.lowest_unique_bid)}</Text>
                    </View>
                  )}
                  {deadlineHrs != null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={deadlineHrs < 6 ? colors.destructive : colors.mutedForeground} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Payment Deadline</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: deadlineHrs < 6 ? colors.destructive : colors.navy }}>
                        {deadlineHrs > 0 ? `${deadlineHrs}h remaining` : 'Expired'}
                      </Text>
                    </View>
                  )}
                  <View style={s.divider} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.navy }}>Market Price</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.mutedForeground, textDecorationLine: 'line-through' }}>{formatETB(auction.marketPrice)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.navy }}>Amount Saved</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.emerald600 }}>{formatETB(savings)} ({savingsPct}%)</Text>
                  </View>
                </Card>
              )}

              {winner.all_winners && winner.all_winners.length > 1 && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Users size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>All Winners ({winner.all_winners.length})</Text>
                  </View>
                  {winner.all_winners.map((w, i) => (
                    <View key={w.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>#{i + 1}</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{w.name || w.user_id.slice(0, 8)}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>{CURRENCY} {formatETB(w.amount)}</Text>
                    </View>
                  ))}
                </Card>
              )}

              {'my_bid' in winner && winner.my_bid && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>Your Bid</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Amount</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{CURRENCY} {formatETB(winner.my_bid.amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Fee Paid</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: winner.my_bid.service_fee_paid ? colors.emerald600 : colors.destructive }}>
                      {winner.my_bid.service_fee_paid ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </Card>
              )}

              {'bids' in winner && winner.bids.length > 0 && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>All Bids ({winner.bids.length})</Text>
                  <ScrollView style={{ maxHeight: 160 }}>
                    {winner.bids.map((b: any) => (
                      <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>{b.user_id.slice(0, 8)}...</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>{CURRENCY} {formatETB(b.amount)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </Card>
              )}
            </>
          ) : null}
        </View>
      </View>
      <View style={s.bottomCta}>
        {winner?.winner_user_id && (isAdmin || winner.winner_user_id === user?.id) ? (
          <CTAButton onPress={() => go('pay-winning')}>
            <CreditCard size={18} /> {winner.payment_status === 'PAID' ? 'View Receipt' : 'Process Payment'}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onPress={() => go('home')}>Back to Dashboard</CTAButton>
        )}
      </View>
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
  gradient: { flex: 1, backgroundColor: colors.navy },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  winnerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: colors.primary + '33', paddingHorizontal: 12, paddingVertical: 4 },
  winnerBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pingRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary + '4D' },
  trophyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.navyForeground, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.white + 'CC', textAlign: 'center', maxWidth: 280, marginTop: 8 },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: colors.emerald600 + '22', paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  productImageWrap: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productName: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 12 },
  winningBidBox: { borderRadius: 12, backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', marginTop: 16 },
  winLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  winAmount: { fontSize: 28, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
