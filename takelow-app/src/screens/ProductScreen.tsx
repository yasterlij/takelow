import React, { useState } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native'
import { Users, Tag, Ticket, CheckCircle2, TrendingDown, ImageIcon, ChevronLeft, ChevronRight, X, ZoomIn, Zap } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, Badge } from '../components/AuctionUI'
import { Countdown, useCountdown } from '../components/Countdown'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors, spacing, borderRadius, fontSize } from '../theme'

const { width } = Dimensions.get('window')

function ProductImage({ src, alt, onPress }: { src?: string; alt: string; onPress?: () => void }) {
  const [err, setErr] = useState(false)
  if (err || !src) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary, gap: 8 }}>
        <ImageIcon size={40} color={colors.mutedForeground + '4D'} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground + '66' }}>{alt}</Text>
      </View>
    )
  }
  return (
    <TouchableOpacity style={{ width: '100%', height: '100%' }} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="contain" onError={() => setErr(true)} />
    </TouchableOpacity>
  )
}

function LightboxModal({ visible, images, idx, onClose }: { visible: boolean; images: string[]; idx: number; onClose: () => void }) {
  const [current, setCurrent] = useState(idx)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={onClose}>
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <Image source={{ uri: images[current] }} style={{ width: width - 32, height: width - 32 }} resizeMode="contain" />
        {images.length > 1 && (
          <>
            <TouchableOpacity
              onPress={() => setCurrent((i) => (i - 1 + images.length) % images.length)}
              style={{ position: 'absolute', left: 16, top: '50%', marginTop: -20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10 }}
            >
              <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrent((i) => (i + 1) % images.length)}
              style={{ position: 'absolute', right: 16, top: '50%', marginTop: -20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10 }}
            >
              <ChevronRight size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  )
}

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)
  const [imgIdx, setImgIdx] = useState(0)
  const [lightboxVisible, setLightboxVisible] = useState(false)

  if (!auction) return null

  const images = auction.images || []
  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Product Details" onBack={() => go('auctions')} />
      <LightboxModal visible={lightboxVisible} images={images} idx={imgIdx} onClose={() => setLightboxVisible(false)} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.imageArea}>
          <ProductImage src={images[imgIdx]} alt={auction.name} onPress={() => images[0] && setLightboxVisible(true)} />
          <View style={s.zoomHint}>
            <ZoomIn size={14} color="#fff" />
          </View>
          {images.length > 1 && (
            <>
              <TouchableOpacity
                onPress={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                style={s.arrowBtn}
              >
                <ChevronLeft size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setImgIdx((i) => (i + 1) % images.length)}
                style={[s.arrowBtn, { right: 8 }]}
              >
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
              <View style={s.dots}>
                {images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setImgIdx(i)}
                    style={[s.dot, { backgroundColor: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.4)', width: i === imgIdx ? 16 : 6 }]}
                  />
                ))}
              </View>
            </>
          )}
          <View style={s.badges}>
            <Badge tone="green"><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 }} /> Live</Badge>
            {savings > 0 && (
              <View style={s.savingsPill}>
                <Zap size={12} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{savings}% off</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Badge tone="navy">{auction.category}</Badge>
              <Text style={s.name}>{auction.name}</Text>
            </View>
          </View>

          <Card style={{ padding: 16, marginTop: 16, backgroundColor: colors.navy, borderWidth: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)' }}>
                {seconds <= 0 ? 'Auction Ended' : seconds < 3600 ? 'Ending Soon' : 'Time Left'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                <Users size={14} color="rgba(255,255,255,0.7)" /> {auction.uniqueBidders} bidders
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Countdown seconds={seconds} size="md" />
            </View>
            {seconds > 0 && seconds < 3600 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, opacity: 1 }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Deadline approaching — place your bid now!</Text>
              </View>
            )}
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
  imageArea: { width, height: width * 0.75, backgroundColor: colors.secondary, position: 'relative' },
  zoomHint: { position: 'absolute', top: 12, right: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6 },
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 },
  savingsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, backgroundColor: colors.emerald600, paddingHorizontal: 10, paddingVertical: 4 },
  arrowBtn: { position: 'absolute', top: '50%', left: 8, marginTop: -18, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  name: { fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: 8 },
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
