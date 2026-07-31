import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, ArrowLeft, Crown, Sparkles, ArrowRight, Gavel, Timer, CreditCard, Users } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { Badge, Card } from '../components/AuctionUI'
import { colors, CURRENCY } from '../theme'
import { formatETB } from '../mockDataV0'

export function WinnersListScreen() {
  const { go, auctions, refreshAuctions, selectAuction } = useApp()
  const [refreshing, setRefreshing] = useState(false)

  const closedAuctions = auctions.filter((a) => a.status === 'closed')

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      <LinearGradient colors={['#002B5C', '#001F3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: 12, paddingBottom: 20, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => go('home')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <ArrowLeft size={18} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Crown size={20} color={colors.primary} />
            <Text style={{ fontFamily: 'System', fontSize: 18, fontWeight: '800', color: '#FFF' }}>Winners</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          {closedAuctions.length} closed auction{closedAuctions.length !== 1 ? 's' : ''} with winners
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {closedAuctions.length === 0 ? (
          <View style={s.empty}>
            <Trophy size={48} color={colors.neutralGray300} />
            <Text style={s.emptyTitle}>No winners yet</Text>
            <Text style={s.emptySub}>Closed auctions and their winners will appear here.</Text>
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Gavel size={16} color={colors.primaryForeground} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>Browse Live Auctions</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '20' }}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: 'System', fontSize: 15, fontWeight: '700', color: colors.primary }}>Recent Winners</Text>
            </View>

            {closedAuctions.map((a) => {
              const savings = a.winning_bid_amount != null ? Math.round((1 - a.winning_bid_amount / a.marketPrice) * 100) : 0
              const winnerCount = a.winnersCount ?? a.winners?.length ?? 0
              const paidCount = a.winners?.filter((w) => w.payment_status === 'PAID').length ?? 0
              return (
                <TouchableOpacity key={a.id} onPress={() => selectAuction(a.id)} activeOpacity={0.85}>
                  <Card style={s.card}>
                    <View style={s.cardImgWrap}>
                      {a.images?.[0] ? (
                        <Image source={{ uri: a.images[0] }} style={s.cardImgFull} resizeMode="cover" />
                      ) : (
                        <View style={[s.cardImgFull, { backgroundColor: colors.neutralGray200, justifyContent: 'center', alignItems: 'center' }]}>
                          <Trophy size={32} color={colors.neutralGray400} />
                        </View>
                      )}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.cardImgOverlay} />
                      <View style={s.cardImgTop}>
                        <Badge tone="gold"><Crown size={10} /> Winner</Badge>
                        <Badge tone="gold"><Trophy size={9} /> -{savings}%</Badge>
                      </View>
                      <View style={s.cardImgBottom}>
                        <Text style={s.cardName} numberOfLines={1}>{a.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800' }}>
                            {CURRENCY} {formatETB(a.winning_bid_amount ?? a.bidFee)}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '500', textDecorationLine: 'line-through' }}>
                            {CURRENCY} {formatETB(a.marketPrice)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' }}>
                            <Timer size={12} color={colors.primary} />
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>
                            {a.totalBids || a.bidders} bids
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>View Details</Text>
                          <ArrowRight size={12} color={colors.primary} />
                        </View>
                      </View>
                      {winnerCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Users size={10} color={colors.mutedForeground} />
                            <Text style={{ fontSize: 9, fontWeight: '600', color: colors.mutedForeground }}>
                              {winnerCount} winner{winnerCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                          {paidCount > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <CreditCard size={10} color={colors.emerald600} />
                              <Text style={{ fontSize: 9, fontWeight: '600', color: colors.emerald600 }}>
                                {paidCount} paid
                              </Text>
                            </View>
                          )}
                          {a.winners?.slice(0, 2).map((w) => (
                            <Text key={w.user_id} style={{ fontSize: 8, color: colors.mutedForeground }} numberOfLines={1}>
                              {formatETB(w.amount)}
                            </Text>
                          ))}
                          {winnerCount > 2 && (
                            <Text style={{ fontSize: 8, color: colors.mutedForeground }}>+{winnerCount - 2}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              )
            })}

            <View style={{ height: 20 }} />
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Gavel size={16} color={colors.primaryForeground} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>Browse Live Auctions</Text>
                <ArrowRight size={14} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: 'System', fontSize: 17, fontWeight: '700', color: colors.foreground, marginTop: 16 },
  emptySub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  card: {
    marginBottom: 14,
    overflow: 'hidden',
    borderRadius: 16,
  },
  cardImgWrap: { width: '100%', height: 160, position: 'relative' },
  cardImgFull: { width: '100%', height: '100%' },
  cardImgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  cardImgTop: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  cardImgBottom: { position: 'absolute', bottom: 10, left: 12, right: 12 },
  cardName: { fontFamily: 'System', fontSize: 16, fontWeight: '800', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
})
