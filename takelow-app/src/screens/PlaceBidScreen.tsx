import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native'
import { Sparkles, TrendingDown, CheckCircle2 } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY } from '../mockDataV0'
import { colors } from '../theme'

export function PlaceBidScreen() {
  const { go, selectedId, submitBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [amountStr, setAmountStr] = useState('235')

  if (!auction) return null

  const amount = Number.parseInt(amountStr || '0', 10)
  const valid = amount > 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Place Your Bid" onBack={() => go('pay-fee')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <View style={s.feePaidBanner}>
          <CheckCircle2 size={18} color={colors.emerald600} />
          <Text style={s.feePaidText}>Bid fee paid. You&apos;re in the auction for {auction.name}!</Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={s.enterBidTitle}>Enter your bid amount</Text>
          <Text style={s.enterBidSub}>Your bid must be a unique lowest amount to win.</Text>
        </View>

        <Card style={{ padding: 20, marginTop: 20 }}>
          <View style={s.inputRow}>
            <TextInput
              value={amountStr}
              onChangeText={(t) => setAmountStr(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              style={s.inputAmount}
            />
            <Text style={s.currency}>{CURRENCY}</Text>
          </View>

          <View style={s.tip}>
            <TrendingDown size={16} color={colors.primary} />
            <Text style={s.tipText}>Lower & unique = better chance to win</Text>
          </View>
        </Card>

        <View style={s.strategy}>
          <Sparkles size={18} color={colors.primary} />
          <Text style={s.strategyText}>
            The winner is the person with the <Text style={{ fontWeight: '700' }}>lowest bid that nobody else picked</Text>. Choose an unexpected amount!
          </Text>
        </View>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton disabled={!valid} onPress={() => submitBid(amount)}>Submit Bid</CTAButton>
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
  feePaidBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.emerald50, padding: 12 },
  feePaidText: { fontSize: 12, fontWeight: '600', color: colors.emerald700, flex: 1 },
  enterBidTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  enterBidSub: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 4, maxWidth: 256, textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  inputAmount: { width: 160, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.secondary, paddingVertical: 12, textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.navy },
  currency: { paddingBottom: 16, fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  tip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16 },
  tipText: { fontSize: 12, fontWeight: '600', color: colors.accentForeground },
  strategy: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  strategyText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'CC', flex: 1 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
