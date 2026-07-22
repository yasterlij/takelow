import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Sparkles, TrendingDown, CheckCircle2 } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY } from '../mockDataV0'
import { colors } from '../theme'

export function PlaceBidScreen() {
  const { go, selectedId, submitBid, getAuction, authError } = useApp()
  const auction = getAuction(selectedId)
  const [amountStr, setAmountStr] = useState('')
  const [loading, setLoading] = useState(false)

  if (!auction) return null

  const amount = parseFloat(amountStr || '0')
  const valid = amount > 0 && !loading

  const handleSubmit = async () => {
    if (!valid) return
    setLoading(true)
    await submitBid(amount)
    setLoading(false)
  }

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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {auction.maxBid && (
            <View style={s.statChip}>
              <Text style={s.statChipText}>Max {auction.maxBid} bids</Text>
            </View>
          )}
          {auction.minBid && (
            <View style={s.statChip}>
              <Text style={s.statChipText}>Min {auction.minBid} bids</Text>
            </View>
          )}
          {auction.numWinners && auction.numWinners > 1 && (
            <View style={s.statChip}>
              <Text style={s.statChipText}>{auction.numWinners} winners</Text>
            </View>
          )}
        </View>

        {auction.maxBid && (
          <View style={s.bidProgress}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Total bids: {auction.totalBids || auction.bidders}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Capacity: {auction.maxBid}</Text>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min((auction.totalBids || auction.bidders) / auction.maxBid * 100, 100)}%`, height: '100%', borderRadius: 2, backgroundColor: (auction.totalBids || auction.bidders) / auction.maxBid > 0.8 ? colors.primary : colors.emerald500 }} />
            </View>
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={s.enterBidTitle}>Enter your bid amount</Text>
          <Text style={s.enterBidSub}>Your bid must be a unique lowest amount to win.</Text>
        </View>

        <Card style={{ padding: 20, marginTop: 20 }}>
          <View style={s.inputRow}>
            <TextInput
              value={amountStr}
              onChangeText={(t) => setAmountStr(t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1').slice(0, 8))}
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

        {authError && (
          <View style={s.error}>
            <Text style={s.errorText}>{authError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton disabled={!valid} onPress={handleSubmit}>
          {loading ? <ActivityIndicator size={18} color="#fff" /> : 'Submit Bid'}
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
  feePaidBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.emerald50, padding: 12 },
  feePaidText: { fontSize: 12, fontWeight: '600', color: colors.emerald700, flex: 1 },
  statChip: { borderRadius: 6, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4 },
  statChipText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  bidProgress: { borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 8, marginTop: 8 },
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
  error: { borderRadius: 12, backgroundColor: colors.destructive + '15', padding: 12, marginTop: 16 },
  errorText: { fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' },
})
