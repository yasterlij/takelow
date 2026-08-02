import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Trophy, CreditCard, PartyPopper, AlertTriangle, Users, Clock, ImageIcon, CheckCircle2, XCircle, Info } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Card } from '../components/AuctionUI'
import { api, type ApiWinnerResult, type ApiAuctionResult } from '../api'
import { formatCurrency } from '../mockDataV0'
import { colors } from '../theme'

export function WinnerScreen() {
  const { go, selectedId, getAuction, user } = useApp()
  const isAdmin = user?.role === 'admin'
  const auction = getAuction(selectedId)
  const [winner, setWinner] = useState<ApiWinnerResult | ApiAuctionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pingAnim = useRef(new Animated.Value(1)).current
  const [bidsPage, setBidsPage] = useState(0)

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

  const winnerPhone = winner?.winner_phone || null
  const maskPhone = (p: string | null) => p ? p.slice(0, 4) + 'XXXX' + p.slice(-2) : null
  const maskedPhone = winnerPhone ? maskPhone(winnerPhone) : null
  const firstName = winner?.winner_name ? winner.winner_name.split(" ")[0] : null
  const winnerName = firstName && maskedPhone ? `${firstName} ${maskedPhone}` : (firstName || maskedPhone || null)
  const deadline = winner?.payment_deadline ? new Date(winner.payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : null
  const allWinners = 'all_winners' in (winner || {}) ? (winner as any).all_winners as any[] : undefined

  const allBids = 'bids' in (winner || {}) ? (winner as any).bids as any[] : []
  const amountCount = new Map<number, number>()
  allBids.forEach((b: any) => amountCount.set(b.amount, (amountCount.get(b.amount) || 0) + 1))
  const winningAmount = winner?.winning_bid_amount
  const lowerAmounts = winningAmount != null && allBids.length > 0
    ? [...new Set(allBids.filter((b: any) => b.amount < winningAmount).map((b: any) => b.amount))].sort((a: number, b: number) => a - b)
    : []
  const lowerBidsGrouped = lowerAmounts.map((amount: number) => ({ amount, count: amountCount.get(amount) || 1 }))
  const BIDS_PAGE_SIZE = 10
  const pagedBids = lowerBidsGrouped.slice(0, (bidsPage + 1) * BIDS_PAGE_SIZE)
  const hasMore = pagedBids.length < lowerBidsGrouped.length

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

              {(winner.winner_user_id || winner.winning_bid_amount != null) && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 20, marginTop: 24 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={s.productImageWrap}>
                      {auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: 96, height: 96 }} resizeMode="cover" /> : <ImageIcon size={32} color="#94a3b8" />}
                    </View>
                    <Text style={s.productName}>{auction.name}</Text>
                  </View>
                  <View style={s.winningBidBox}>
                    <Text style={s.winLabel}>Winning Bid</Text>
                    <Text style={s.winAmount}>{formatCurrency(winner.winning_bid_amount ?? 0)}</Text>
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
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, textAlign: 'right' }}>
                      {winnerName || 'Unknown'}
                    </Text>
                  </View>
                  {winner.lowest_unique_bid != null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Lowest Unique Bid</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald600 }}>{formatCurrency(winner.lowest_unique_bid ?? 0)}</Text>
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
                </Card>
              )}

              {winner.all_winners && winner.all_winners.length > 0 && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Users size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>All Winners ({winner.all_winners.length})</Text>
                  </View>
                  {winner.all_winners.map((w, i) => {
                    const wDeadline = w.payment_deadline ? new Date(w.payment_deadline) : null
                    const wDeadlineHrs = wDeadline ? Math.max(0, Math.round((wDeadline.getTime() - Date.now()) / 3600000)) : null
                    const isCurrentUser = w.user_id === user?.id
                    return (
                      <View key={w.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>#{w.rank ?? (i + 1)}</Text>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 11, color: colors.mutedForeground }} numberOfLines={1}>
                                {(() => {
                                  const fn = w.name ? w.name.split(" ")[0] : null
                                  const mp = w.phone ? maskPhone(w.phone) : null
                                  return fn && mp ? `${fn} ${mp}` : (fn || mp || `Winner #${i + 1}`)
                                })()}
                              </Text>
                              {isCurrentUser && (
                                <View style={{ borderRadius: 4, backgroundColor: colors.primary + '22', paddingHorizontal: 4, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '700', color: colors.primary }}>You</Text>
                                </View>
                              )}
                            </View>
                            {w.payment_status && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                {w.payment_status === 'PAID' ? (
                                  <CheckCircle2 size={8} color={colors.emerald600} />
                                ) : w.payment_status === 'EXPIRED' ? (
                                  <XCircle size={8} color={colors.destructive} />
                                ) : null}
                                <Text style={{ fontSize: 9, fontWeight: '600', color: w.payment_status === 'PAID' ? colors.emerald600 : w.payment_status === 'EXPIRED' ? colors.destructive : colors.mutedForeground }}>
                                  {w.payment_status}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>{formatCurrency(w.amount ?? 0)}</Text>
                          {wDeadlineHrs != null && w.payment_status !== 'PAID' && (
                            <Text style={{ fontSize: 8, color: wDeadlineHrs < 6 ? colors.destructive : colors.mutedForeground }}>
                              {wDeadlineHrs > 0 ? `${wDeadlineHrs}h left` : 'Expired'}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </Card>
              )}

              {winner.winner_user_id && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16, borderColor: colors.primary + '20', backgroundColor: colors.accent }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Info size={14} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 }}>Next Steps</Text>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>1. </Text>
                          Complete payment before the deadline
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>2. </Text>
                          Collect your item at the designated collection point
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 16 }}>
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>3. </Text>
                          Present payment confirmation for collection
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              )}

              {'my_bid' in winner && winner.my_bid && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 8 }}>Your Bid</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Amount</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{formatCurrency(winner.my_bid.amount ?? 0)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Fee Paid</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: winner.my_bid.service_fee_paid ? colors.emerald600 : colors.destructive }}>
                      {winner.my_bid.service_fee_paid ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </Card>
              )}

              {allBids.length > 0 && (
                <Card style={{ width: '100%', maxWidth: 320, padding: 16, marginTop: 16 }}>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>Bids ({allBids.length})</Text>
                  </View>
                  {/* ── Winning bid always on top ── */}
                  {winningAmount != null && (() => {
                    const winnerBid = allBids.find((b: any) => b.amount === winningAmount)
                    if (!winnerBid) return null
                    return (
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        marginBottom: 10,
                        backgroundColor: colors.emerald600 + '18',
                        borderWidth: 1,
                        borderColor: colors.emerald600 + '30',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald800 }} numberOfLines={1}>
                            {winnerBid.user_name || winnerBid.user_id.slice(0, 8)}
                          </Text>
                          {winnerBid.user_id === user?.id && (
                            <View style={{ borderRadius: 4, backgroundColor: colors.primary + '22', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, fontWeight: '700', color: colors.primary }}>You</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ borderRadius: 4, backgroundColor: colors.emerald600 + '22', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.emerald600 }}>Winner</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald600 }}>
                            {formatCurrency(winningAmount ?? 0)}
                          </Text>
                        </View>
                      </View>
                    )
                  })()}
                  {/* ── Bids below the winning amount ── */}
                  {lowerBidsGrouped.length > 0 && (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        <Text style={{ fontSize: 9, fontWeight: '500', color: colors.mutedForeground }}>Amounts below winner (lowest ↑)</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                      </View>
                      {pagedBids.map(({ amount, count }: { amount: number; count: number }) => (
                        <View key={amount} style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          marginBottom: 2,
                          backgroundColor: colors.card,
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>
                            {count} bidder{count > 1 ? 's' : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {count > 1 && (
                              <Text style={{ fontSize: 9, fontWeight: '500', color: colors.mutedForeground }}>×{count}</Text>
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>
                              {formatCurrency(amount ?? 0)}
                            </Text>
                          </View>
                        </View>
                      ))}
                      {hasMore && (
                        <TouchableOpacity
                          onPress={() => setBidsPage((p: number) => p + 1)}
                          activeOpacity={0.85}
                          style={{
                            marginTop: 8,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.card,
                            paddingVertical: 10,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>
                            Show {Math.min(BIDS_PAGE_SIZE, lowerBidsGrouped.length - pagedBids.length)} more
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </Card>
              )}
            </>
          ) : null}
        </View>
      </View>
      <Card style={s.bottomCta}>
        {winner?.winner_user_id && allWinners?.some((w: any) => w.user_id === user?.id) ? (
          <CTAButton onPress={() => go('pay-winning')}>
            <CreditCard size={18} /> {winner.payment_status === 'PAID' ? 'View Receipt' : 'Process Payment'}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onPress={() => go('home')}>Back to Dashboard</CTAButton>
        )}
      </Card>
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
  productImageWrap: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 12 },
  winningBidBox: { borderRadius: 12, backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', marginTop: 16 },
  winLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  winAmount: { fontSize: 28, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
})
