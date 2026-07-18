import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Wallet, ShieldCheck, Clock } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { AwashMark } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function PayWinningScreen() {
  const { go, selectedId, userBid, walletBalance, payWinning, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const amount = userBid ?? 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Pay Winning Amount" onBack={() => go('winner')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <View style={s.deadline}>
          <Clock size={18} color={colors.primary} />
          <Text style={s.deadlineText}>Complete payment within <Text style={{ fontWeight: '700' }}>24 hours</Text> to claim your prize.</Text>
        </View>

        <Card style={{ alignItems: 'center', padding: 24, marginTop: 16 }}>
          <Text style={s.label}>Winning Bid</Text>
          <Text style={s.amount}>{formatETB(amount)} {CURRENCY}</Text>
          <Text style={s.forProduct}>for {auction.name}</Text>
        </Card>

        <Text style={s.sectionTitle}>Pay with</Text>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', padding: 16, marginTop: 8 }}>
          <View style={s.bankIcon}>
            <AwashMark size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Awash Bank Mobile Money</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
              <Wallet size={14} /> Balance: {CURRENCY} {formatETB(walletBalance)}
            </Text>
          </View>
          <View style={s.radio} />
        </Card>

        <Card style={{ padding: 16, marginTop: 16 }}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Winning amount</Text>
            <Text style={s.summaryValue}>{CURRENCY} {formatETB(amount)}</Text>
          </View>
          <View style={[s.summaryRow, { marginTop: 8 }]}>
            <Text style={s.summaryLabel}>Delivery</Text>
            <Text style={[s.summaryValue, { color: colors.emerald600 }]}>Free</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={[s.summaryRow, { marginTop: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Total</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{CURRENCY} {formatETB(amount)}</Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Secured by Awash Bank</Text>
        </View>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton onPress={() => payWinning(amount)}>Pay {CURRENCY} {formatETB(amount)} Now</CTAButton>
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
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.accent, padding: 12 },
  deadlineText: { fontSize: 13, fontWeight: '600', color: colors.navy + 'CC', flex: 1 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  amount: { fontSize: 36, fontWeight: '800', color: colors.navy, marginTop: 8, fontVariant: ['tabular-nums'] },
  forProduct: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 },
  bankIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: colors.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.mutedForeground },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.navy },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginTop: 12 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
