import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated } from 'react-native'
import { Bell, Users, Radio, Eye } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { Countdown } from '../components/Countdown'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function MonitorScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bellAnim = useRef(new Animated.Value(1)).current

  const [seconds, setSeconds] = useState(130)
  const [bidders, setBidders] = useState(auction?.bidders ?? 0)

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setBidders(auction?.bidders ?? 0)
  }, [auction])

  useEffect(() => {
    const t = setInterval(() => {
      setBidders((b) => b + (Math.random() > 0.5 ? 1 : 0))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (seconds === 0) {
      const t = setTimeout(() => go('closed'), 1200)
      return () => clearTimeout(t)
    }
  }, [seconds, go])

  useEffect(() => {
    if (seconds > 0 && seconds <= 60) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      )
      loop.start()
      return () => loop.stop()
    } else {
      bellAnim.setValue(1)
    }
  }, [seconds])

  if (!auction) return null

  const endingSoon = seconds <= 60

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Auction in Progress" onBack={() => go('bid-confirmed')} />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Animated.View style={[s.liveBadge, { opacity: pulseAnim }]}>
            <Radio size={14} color={colors.emerald700} />
            <Text style={s.liveText}>LIVE</Text>
          </Animated.View>
        </View>

        <Card style={{ alignItems: 'center', padding: 20, marginTop: 16 }}>
          <View style={s.productImage}>
            <Image source={{ uri: auction.image }} style={{ width: 80, height: 80 }} resizeMode="contain" />
          </View>
          <Text style={s.productName}>{auction.name}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Time Left</Text>
          <View style={{ marginTop: 8 }}>
            <Countdown seconds={seconds} size="lg" />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
            <Users size={20} color={colors.navy} />
            <Text style={s.statNumber}>{bidders}</Text>
            <Text style={s.statLabel}>Bidders</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
            <Text style={s.statLabel}>Your Bid</Text>
            <Text style={s.bidStat}>{formatETB(userBid ?? 0)}</Text>
            <Text style={s.statLabel}>{CURRENCY}</Text>
          </Card>
        </View>

        {endingSoon && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', backgroundColor: colors.accent, padding: 16, marginTop: 16 }}>
            <Animated.View style={[s.alertIcon, { opacity: bellAnim }]}>
              <Bell size={20} color={colors.primaryForeground} />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Auction Ending Soon!</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navy + 'B3' }}>{auction.name} is about to close. Stay tuned!</Text>
            </View>
          </Card>
        )}

        <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '500', color: colors.navy + '99', marginTop: 16 }}>
          Keep watching — you might be the lowest unique bidder!
        </Text>
      </View>

      <View style={s.bottomCta}>
        <CTAButton variant="navy" onPress={() => go('closed')}>
          <Eye size={18} /> View Result Now
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
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: colors.emerald100, paddingHorizontal: 12, paddingVertical: 4 },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.emerald700 },
  productImage: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 18, fontWeight: '800', color: colors.navy, marginTop: 12 },
  statNumber: { fontSize: 24, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, marginTop: 4 },
  bidStat: { fontSize: 24, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
