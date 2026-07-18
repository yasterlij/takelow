import React from 'react'
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native'
import { Users, Tag, Ticket, CheckCircle2, TrendingDown } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, Badge } from '../components/AuctionUI'
import { Countdown, useCountdown } from '../components/Countdown'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors, spacing, borderRadius, fontSize } from '../theme'

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)

  if (!auction) return null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Product Details" onBack={() => go('auctions')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.imageArea}>
          <Image source={{ uri: auction.image }} style={s.mainImage} resizeMode="contain" />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Badge tone="navy">{auction.category}</Badge>
              <Text style={s.name}>{auction.name}</Text>
            </View>
            <Badge tone="green"><View style={s.liveDot} /> Live</Badge>
          </View>

          <Card style={{ padding: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Time Left</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users size={14} /> {auction.bidders} bidders
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Countdown seconds={seconds} size="md" />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={s.statLabel}><Tag size={14} /> Market Price</Text>
              <Text style={s.statValue}>{CURRENCY} {formatETB(auction.marketPrice)}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 14, borderColor: colors.primary + '4D', backgroundColor: colors.accent }}>
              <Text style={[s.statLabel, { color: colors.accentForeground }]}><Ticket size={14} /> Bid Fee</Text>
              <Text style={[s.statValue, { color: colors.primary }]}>{CURRENCY} {formatETB(auction.bidFee)}</Text>
            </Card>
          </View>

          <View style={s.hint}>
            <TrendingDown size={18} color={colors.primary} />
            <Text style={s.hintText}>Place the <Text style={{ fontWeight: '700' }}>lowest unique bid</Text> — the smallest amount that no one else has chosen — to win this product.</Text>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={s.sectionTitle}>About this product</Text>
            <Text style={s.description}>{auction.description}</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {auction.highlights.map((h) => (
              <View key={h} style={s.highlight}>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={s.highlightText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton onPress={() => go('pay-fee')}>
          Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
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
  imageArea: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  mainImage: { width: 240, height: 208 },
  name: { fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.navy, marginTop: 4 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  hintText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'CC', flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  description: { fontSize: 14, lineHeight: 20, color: colors.mutedForeground, marginTop: 6 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8 },
  highlightText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
})
