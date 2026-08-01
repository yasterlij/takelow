import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Check, Download, Truck, ArrowRight, Home } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Card, AwashMark } from '../components/AuctionUI'
import { formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function PaymentConfirmedScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const pingAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  if (!auction) return null

  const ref = `RCT${Date.now().toString(36).toUpperCase().slice(-6)}`
  const paidAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBarCustom />
      <View style={s.body}>
        <View style={{ position: 'relative', marginBottom: 8 }}>
          <Animated.View
            style={[
              s.pingRing,
              { transform: [{ scale: pingAnim }], opacity: pingAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.4, 0] }) },
            ]}
          />
          <View style={s.checkInner}>
            <Check size={44} strokeWidth={3} color={colors.white} />
          </View>
        </View>
        <Text style={s.title}>Payment Successful!</Text>
        <Text style={s.subtitle}>Your payment of {formatCurrency(userBid ?? 0)} for {auction.name} has been received.</Text>

        <Card style={{ width: '100%', maxWidth: 300, padding: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AwashMark size={20} />
              <Text style={s.receiptTitle}>Receipt</Text>
            </View>
            <View style={s.paidBadge}>
              <Text style={s.paidText}>PAID</Text>
            </View>
          </View>
          <View style={s.dashedBorder} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={s.receiptLabel}>Reference</Text>
            <Text style={s.receiptValue}>{ref}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.receiptLabel}>Product</Text>
            <Text style={s.receiptValue}>{auction.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.receiptLabel}>Amount</Text>
            <Text style={s.receiptValue}>{formatCurrency(userBid ?? 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.receiptLabel}>Payment</Text>
            <Text style={s.receiptValue}>Mobile Money</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.receiptLabel}>Date</Text>
            <Text style={s.receiptValue}>{paidAt}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.receiptLabel}>Status</Text>
            <Text style={[s.receiptValue, { color: colors.emerald600 }]}>Completed</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity style={s.downloadBtn} activeOpacity={0.7}>
              <Download size={16} color={colors.navy} />
              <Text style={s.downloadText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={s.confirmText}>Thank you for your payment!</Text>
      </View>

      <Card style={s.bottomCta}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <CTAButton variant="navy" onPress={() => go('delivery')}>
              <Truck size={18} /> Track Delivery
            </CTAButton>
          </View>
          <View style={{ flex: 1 }}>
            <CTAButton variant="outline" onPress={() => go('home')}>
              <Home size={18} /> Home
            </CTAButton>
          </View>
        </View>
      </Card>
    </View>
  )
}

function StatusBarCustom() {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, backgroundColor: colors.navy }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyForeground }}>9:41</Text>
    </View>
  )
}

const s = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  pingRing: {
    position: 'absolute', width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.emerald400 + '4D',
  },
  checkInner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.emerald500,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.emerald500, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 24 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', maxWidth: 300, marginTop: 8, lineHeight: 20 },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  paidBadge: {
    borderRadius: 6, backgroundColor: colors.emerald100,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  paidText: { fontSize: 11, fontWeight: '700', color: colors.emerald700 },
  dashedBorder: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  receiptLabel: { fontSize: 13, color: colors.mutedForeground },
  receiptValue: { fontSize: 13, fontWeight: '600', color: colors.navy, fontVariant: ['tabular-nums'] },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10,
  },
  downloadText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  confirmText: { fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', textAlign: 'center', marginTop: 20 },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
})
