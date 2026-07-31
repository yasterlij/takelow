import React, { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native'
import { Users, Tag, Ticket, CheckCircle2, TrendingDown, X, Zap } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, Badge } from '../components/AuctionUI'
import { ImageCarousel } from '../components/ImageCarousel'
import { Countdown, useCountdown } from '../components/Countdown'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors, spacing, borderRadius, fontSize } from '../theme'

const { width } = Dimensions.get('window')

function LightboxModal({ visible, images, idx, onClose }: { visible: boolean; images: string[]; idx: number; onClose: () => void }) {
  const [current, setCurrent] = useState(idx)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={onClose}>
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <ImageCarousel
          images={images}
          alt=""
          containerWidth={width}
          autoPlayInterval={0}
          showThumbnails
        />
      </View>
    </Modal>
  )
}

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)
  const [lightboxVisible, setLightboxVisible] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  if (!auction) return null

  const images = auction.images || []
  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0
  const isEnding = seconds > 0 && seconds < 3600
  const isOver = seconds <= 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Product Details" onBack={() => go('auctions')} />
      <LightboxModal visible={lightboxVisible} images={images} idx={lightboxIdx} onClose={() => setLightboxVisible(false)} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Image Gallery ── */}
        {images.length > 0 ? (
          <ImageCarousel
            images={images}
            alt={auction.name}
            containerWidth={width}
            autoPlayInterval={4000}
            showThumbnails
            onImagePress={(i) => { setLightboxIdx(i); setLightboxVisible(true) }}
            overlay={
              <View style={s.badges}>
                <Badge tone="green"><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 }} /> Live</Badge>
                {savings > 0 && (
                  <View style={s.savingsPill}>
                    <Zap size={12} color="#fff" />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{savings}% off</Text>
                  </View>
                )}
              </View>
            }
          />
        ) : (
          <View style={s.imageArea}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>No images available</Text>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Badge tone="navy">{auction.category}</Badge>
              <Text style={s.name}>{auction.name}</Text>
            </View>
            {savings > 0 && (
              <View style={s.savingsBadge}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.emerald700 }}>{savings}% off</Text>
              </View>
            )}
          </View>

          {/* Countdown */}
          <Card style={{
            padding: 16, marginTop: 16, borderWidth: 0,
            backgroundColor: isEnding ? colors.primary + 'CC' : isOver ? '#6B7280' : colors.navy,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)' }}>
                {isOver ? 'Auction Ended' : isEnding ? 'Ending Soon' : 'Time Left'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                <Users size={14} color="rgba(255,255,255,0.7)" /> {auction.uniqueBidders} bidders
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Countdown seconds={seconds} size="md" />
            </View>
            {isEnding && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFF' }}>Deadline approaching — place your bid now!</Text>
              </View>
            )}
          </Card>

          {/* Pricing */}
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

          {/* How it works */}
          <View style={s.hint}>
            <TrendingDown size={18} color={colors.primary} />
            <Text style={s.hintText}>Place the <Text style={{ fontWeight: '700' }}>lowest unique bid</Text> — the smallest amount that no one else has chosen — to win this product.</Text>
          </View>

          {/* Description */}
          {auction.description && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionTitle}>About this product</Text>
              <Text style={s.description}>{auction.description}</Text>
            </View>
          )}

          {/* Highlights */}
          {auction.highlights?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {auction.highlights.map((h) => (
                <Card key={h} style={s.highlight}>
                  <CheckCircle2 size={16} color={colors.primary} />
        <Text style={s.highlightText}>{h}</Text>
                    </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <Card style={s.bottomCta}>
        <CTAButton onPress={() => go('pay-fee')}>
          Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
        </CTAButton>
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
  imageArea: { width, height: width * 0.75, backgroundColor: colors.secondary, position: 'relative' },
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8, zIndex: 10 },
  savingsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, backgroundColor: colors.emerald600, paddingHorizontal: 10, paddingVertical: 4 },
  savingsBadge: { borderRadius: 20, backgroundColor: colors.emerald50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.emerald200 },
  name: { fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: 8 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.navy, marginTop: 4 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  hintText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'CC', flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  description: { fontSize: 14, lineHeight: 20, color: colors.mutedForeground, marginTop: 6 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  highlightText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
})
