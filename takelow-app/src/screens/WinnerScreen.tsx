import React, { useEffect, useRef } from 'react'
import { View, Text, Image, StyleSheet, Animated } from 'react-native'
import { Trophy, CreditCard, PartyPopper } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function WinnerScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const pingAnim = useRef(new Animated.Value(1)).current

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

  const savings = auction.marketPrice - (userBid ?? 0)
  const savingsPct = Math.round((savings / auction.marketPrice) * 100)

  return (
    <View style={{ flex: 1 }}>
      <View style={s.gradient}>
        <StatusBarCustom />
        <View style={s.body}>
          <View style={s.winnerBadge}>
            <PartyPopper size={14} color={colors.primary} />
            <Text style={s.winnerBadgeText}>Winner Announced</Text>
          </View>

          <View style={{ position: 'relative', marginTop: 16 }}>
            <Animated.View
              style={[
                s.pingRing,
                { transform: [{ scale: pingAnim }], opacity: pingAnim.interpolate({ inputRange: [1, 1.6], outputRange: [0.4, 0] }) },
              ]}
            />
            <View style={s.trophyCircle}>
              <Trophy size={48} strokeWidth={1.5} color={colors.white} />
            </View>
          </View>

          <Text style={s.title}>Congratulations!</Text>
          <Text style={s.subtitle}>You placed the lowest unique bid and won!</Text>

          <Card style={{ width: '100%', maxWidth: 320, padding: 20, marginTop: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={s.productImageWrap}>
                <Image source={{ uri: auction.image }} style={{ width: 88, height: 88 }} resizeMode="contain" />
              </View>
              <Text style={s.productName}>{auction.name}</Text>
            </View>
            <View style={s.winningBidBox}>
              <Text style={s.winLabel}>Your Winning Bid</Text>
              <Text style={s.winAmount}>{formatETB(userBid ?? 0)} {CURRENCY}</Text>
            </View>
            <Text style={s.winnerInfo}>Selam T. · 091332****</Text>
            <View style={s.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.rowLabel}>Market Price</Text>
              <Text style={[s.rowValue, { textDecorationLine: 'line-through', color: colors.mutedForeground }]}>{formatETB(auction.marketPrice)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={s.rowLabel}>You Saved</Text>
              <Text style={[s.rowValue, { color: colors.emerald600 }]}>{formatETB(savings)} ({savingsPct}%)</Text>
            </View>
          </Card>
        </View>
      </View>
      <View style={s.bottomCta}>
        <CTAButton onPress={() => go('pay-winning')}>
          <CreditCard size={18} /> Pay Winning Amount
        </CTAButton>
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
  gradient: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  winnerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, backgroundColor: colors.primary + '33',
    paddingHorizontal: 12, paddingVertical: 4,
  },
  winnerBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pingRing: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary + '4D',
  },
  trophyCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.navyForeground, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.white + 'CC', textAlign: 'center', maxWidth: 280, marginTop: 8 },
  productImageWrap: {
    width: 96, height: 96, borderRadius: 16,
    backgroundColor: colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  productName: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 12 },
  winningBidBox: {
    borderRadius: 12, backgroundColor: colors.accent,
    paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center',
    marginTop: 16,
  },
  winLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  winAmount: { fontSize: 28, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  winnerInfo: { fontSize: 13, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  rowLabel: { fontSize: 13, color: colors.navy },
  rowValue: { fontSize: 13, fontWeight: '700' },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
