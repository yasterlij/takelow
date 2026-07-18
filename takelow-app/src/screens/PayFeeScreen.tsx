import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Wallet, ShieldCheck, Info } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { AwashMark } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors, fontSize } from '../theme'

export function PayFeeScreen() {
  const { go, selectedId, walletBalance, payFee, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Pay Bid Fee" onBack={() => go('product')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>
          Pay the non-refundable participation fee to enter this auction.
        </Text>

        <Card style={{ alignItems: 'center', padding: 24, marginTop: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Bid Fee</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.navy, marginTop: 8 }}>{CURRENCY} {formatETB(auction.bidFee)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 8 }}>for {auction.name}</Text>
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 }}>Pay with</Text>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', padding: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' }}>
            <AwashMark size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Awash Bank Mobile Money</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}><Wallet size={14} /> Balance: {CURRENCY} {formatETB(walletBalance)}</Text>
          </View>
          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: colors.primary }} />
        </Card>

        <View style={s.infoBox}>
          <Info size={16} color={colors.navy + '99'} />
          <Text style={s.infoText}>The bid fee is non-refundable and confirms your participation. You will place your unique bid on the next step.</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Secured by Awash Bank</Text>
        </View>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton onPress={() => payFee(auction.bidFee)}>Pay {CURRENCY} {formatETB(auction.bidFee)}</CTAButton>
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
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  infoText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'B3', flex: 1 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
