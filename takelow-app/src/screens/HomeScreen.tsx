import React, { useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable, Dimensions, Image, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Gavel, Wallet, ArrowRight, Eye, EyeOff, Shield, LogOut, Sparkles, Trophy, Timer, Zap } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashMark, Badge } from '../components/AuctionUI'
import { ImageCarousel } from '../components/ImageCarousel'
import { colors, CURRENCY } from '../theme'
import { formatETB, formatCountdown } from '../mockDataV0'
import { useCountdown } from '../components/Countdown'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = (SCREEN_W - 20 * 2 - 12) / 2

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const SCREEN_W_ACTUAL = Dimensions.get('window').width

function HeroSlide({ item, onJoin }: { item: any; onJoin: () => void }) {
  const t = useCountdown(item.timeLeft)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = item.status === 'ending-soon' || (t > 0 && t < 3600)
  const savings = Math.round((1 - item.bidFee / item.marketPrice) * 100)

  if (!item.images?.length) {
    return (
      <View style={{ width: SCREEN_W_ACTUAL * 0.75, height: 220, marginRight: 12, borderRadius: 16, overflow: 'hidden' }}>
        <LinearGradient colors={['#002B5C', '#001F3F']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Gavel size={40} color="rgba(255,255,255,0.2)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 }}>{item.name}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{
      width: SCREEN_W_ACTUAL * 0.75, height: 220, marginRight: 12,
      borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
    }}>
      <ImageCarousel
        images={item.images}
        alt={item.name}
        containerWidth={SCREEN_W_ACTUAL * 0.75 + 32}
        autoPlayInterval={5000}
        overlay={
          <>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
            <View style={{ position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,43,92,0.75)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                <Gavel size={12} color="#FFF" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Live Auction</Text>
              </View>
              <View style={{ backgroundColor: urgent ? colors.primary + '30' : 'rgba(255,255,255,0.8)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: urgent ? colors.primary + '40' : 'rgba(255,255,255,0.3)' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: urgent ? colors.primary : colors.awashBlue, fontVariant: ['tabular-nums'] }}>
                  {d !== '00' ? `${parseInt(d)}d ` : ''}{h}:{m}:{s}
                </Text>
              </View>
            </View>
            <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 10 }}>
              <Text style={{ color: '#FFF', fontFamily: 'System', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>{CURRENCY} {formatETB(item.bidFee)} bid</Text>
                <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '600', textDecorationLine: 'line-through' }}>{CURRENCY} {formatETB(item.marketPrice)}</Text>
                <View style={{ backgroundColor: colors.primary + '33', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>-{savings}%</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onJoin} activeOpacity={0.85} style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>Join Auction</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        }
      />
    </View>
  )
}

function WinnerSlide({ auction, index }: { auction: any; index: number }) {
  const winnerInfo = auction.winners?.[0]
  const maskPhone = (p: string | null) => p ? p.slice(0, 4) + 'XXXX' + p.slice(-2) : null
  const maskedPhone = winnerInfo?.phone ? maskPhone(winnerInfo.phone) : null
  const firstName = winnerInfo?.name ? winnerInfo.name.split(" ")[0] : null
  const winnerName = firstName && maskedPhone ? `${firstName} ${maskedPhone}` : (firstName || maskedPhone || `Winner #${index + 1}`)
  const bidAmount = auction.winning_bid_amount ?? winnerInfo?.amount ?? 0
  return (
    <View style={{
      width: 260, marginRight: 12, borderRadius: 16,
      borderWidth: 1, borderColor: colors.primary + '33',
      backgroundColor: colors.accent,
      padding: 16, alignItems: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    }}>
      <View style={{ position: 'relative', marginBottom: 8 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.awashBlue, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
          <Trophy size={26} color={colors.primary} />
        </View>
        <View style={{ position: 'absolute', right: -4, top: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.primaryForeground }}>#{index + 1}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: 'System', fontSize: 16, fontWeight: '800', color: colors.awashBlue }} numberOfLines={1}>{winnerName}</Text>
      {winnerInfo?.phone && <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>{maskPhone(winnerInfo.phone)}</Text>}
      <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>{auction.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: colors.primary + '1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + '33' }}>
        <Trophy size={14} color={colors.primary} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Won with {CURRENCY} {formatETB(bidAmount)}</Text>
      </View>
    </View>
  )
}

export function HomeScreen() {
  const { go, walletBalance, user, logout, auctions, auctionsLoading, selectAuction, refreshAuctions } = useApp()
  const isAdmin = user?.role === 'admin'
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const winnerScrollRef = useRef<ScrollView>(null)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  const activeAuctions = auctions.filter((a) => a.status !== 'closed')
  const closedAuctions = auctions.filter((a) => a.status === 'closed')
  const endingSoon = activeAuctions.filter((a) => a.status === 'ending-soon' || a.timeLeft < 3600)
  const displayHero = endingSoon.length > 0 ? endingSoon : activeAuctions

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      {/* ── Header ── */}
      <View style={{ backgroundColor: colors.awashBlue, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}>
            <AwashMark size={26} />
          </View>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>{getInitials(user?.name || '?')}</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient colors={['#003366', '#001F3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ marginHorizontal: 16, marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '33', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Wallet size={14} color="#FFF" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>Wallet Balance</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => go('deposit')} style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primaryForeground }}>+ Top Up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBalance((s) => !s)}>
                {showBalance ? <Eye size={14} color="rgba(255,255,255,0.6)" /> : <EyeOff size={14} color="rgba(255,255,255,0.6)" />}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontFamily: 'System', fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 8, fontVariant: ['tabular-nums'] }}>
            {showBalance ? `${CURRENCY} ${formatETB(walletBalance)}` : '••••••'}
          </Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Account ****091332</Text>
        </LinearGradient>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Section A: Live Auctions ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,43,92,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,43,92,0.08)' }}>
                <Gavel size={18} color={colors.awashBlue} />
              </View>
              <View>
                <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 17, color: colors.foreground }}>Live Auctions</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>{activeAuctions.length} auctions live now</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>View All</Text>
                <ArrowRight size={12} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16, marginHorizontal: -16, paddingHorizontal: 16 }}
          >
            {auctionsLoading ? (
              <View style={{ width: SCREEN_W * 0.75, height: 220, borderRadius: 16, backgroundColor: colors.neutralGray200, marginRight: 12 }} />
            ) : displayHero.length > 0 ? (
              displayHero.slice(0, 5).map((a) => (
                <HeroSlide key={a.id} item={a} onJoin={() => selectAuction(a.id)} />
              ))
            ) : (
              <View style={{ width: SCREEN_W - 32, height: 140, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <Gavel size={28} color={colors.neutralGray300} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.neutralGray400, marginTop: 6 }}>No live auctions yet</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {auctionsLoading
              ? [1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: CARD_W, height: 180, borderRadius: 16, backgroundColor: colors.neutralGray200 }} />
                ))
              : activeAuctions.slice(0, 4).map((a) => {
                  const urgent = a.status === 'ending-soon' || (a.timeLeft > 0 && a.timeLeft < 3600)
                  return (
                    <TouchableOpacity key={a.id} onPress={() => selectAuction(a.id)} activeOpacity={0.85} style={s.card}>
                      <View style={s.cardImgOuter}>
                        {a.images?.[0] ? (
                          <Image source={{ uri: a.images[0] }} style={s.cardImgWrap} resizeMode="cover" />
                        ) : (
                          <View style={[s.cardImgWrap, { backgroundColor: colors.neutralGray100 }]} />
                        )}
                        {a.images?.length > 1 && (
                          <View style={{ position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 2 }}>
                            {a.images.slice(0, 3).map((_: string, i: number) => (
                              <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: i === 0 ? '#FFF' : 'rgba(255,255,255,0.4)' }} />
                            ))}
                          </View>
                        )}
                        <View style={s.cardImgTop}>
                          {urgent ? (
                            <Badge tone="gold"><Timer size={10} /> Ending Soon</Badge>
                          ) : (
                            <Badge tone="green">Live</Badge>
                          )}
                        </View>
                      </View>
                      <View style={s.statsRow}>
                        <CountdownPill seconds={a.timeLeft} urgent={urgent} />
                        <View style={s.bidCount}>
                          <Text style={s.bidCountText}>{a.totalBids || a.bidders} bids</Text>
                        </View>
                      </View>
                      <View style={{ padding: 10, gap: 6 }}>
                        <Text style={s.cardName} numberOfLines={1}>{a.name}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 9, fontWeight: '500', color: colors.mutedForeground, textDecorationLine: 'line-through' }}>
                              {CURRENCY} {formatETB(a.marketPrice)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>
                                {CURRENCY} {formatETB(a.bidFee)}
                              </Text>
                              <Text style={{ fontSize: 9, fontWeight: '500', color: colors.mutedForeground }}>bid</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 20, backgroundColor: colors.emerald50, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Zap size={9} color={colors.emerald600} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.emerald600 }}>{Math.round((1 - a.bidFee / a.marketPrice) * 100)}% off</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                })}
          </View>

          {activeAuctions.length > 4 && (
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={colors.primaryForeground} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>View All Live Auctions</Text>
                <ArrowRight size={14} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section B: Winners ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '20' }}>
                <Trophy size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 17, color: colors.primary }}>Winners!</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Celebrate our recent winners</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => go('winners-list')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '40' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>View All</Text>
                <ArrowRight size={12} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={winnerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
          >
            {closedAuctions.slice(0, 5).map((a, i) => (
              <WinnerSlide key={a.id} auction={a} index={i} />
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => go('winners-list')} activeOpacity={0.85} style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50' }}>
            <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Trophy size={14} color={colors.primaryForeground} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>View All Closed Auctions</Text>
              <ArrowRight size={14} color={colors.primaryForeground} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Promo ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <LinearGradient colors={['#002B5C', '#001A3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 12, color: colors.primary }}>Awash Bank Reverse Auction</Text>
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 18 }}>
              Premium phones, TVs, and laptops waiting for their lowest unique bid.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryForeground }}>Browse Auctions</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => go('my-bids')} style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 10, alignItems: 'center' }} activeOpacity={0.85}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>My Bids</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View />
        </Pressable>
        <View style={s.dropdown}>
          <View style={s.menuHeader}>
            <View style={s.menuAvatar}>
              <Text style={s.menuAvatarText}>{getInitials(user?.name || '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuName}>{user?.name || 'User'}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{user?.phone}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          {isAdmin && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); go('admin-dashboard') }}>
              <Shield size={16} color={colors.primary} />
              <Text style={s.menuItemText}>Admin Panel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); logout() }}>
            <LogOut size={16} color={colors.destructive} />
            <Text style={[s.menuItemText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

function CountdownPill({ seconds, urgent }: { seconds: number; urgent: boolean }) {
  const t = useCountdown(seconds)
  const { d, h, m, s: secs } = formatCountdown(t)
  return (
    <View style={[s.timePill, { backgroundColor: urgent ? colors.primary + '20' : colors.awashBlue }]}>
      <Text style={[s.timePillText, { color: urgent ? colors.primary : '#FFF' }]}>
        {d !== '00' ? `${parseInt(d)}d ` : ''}{h}:{m}:{secs}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdown: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.92)', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 20 },
  menuAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  menuAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  menuName: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  card: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImgOuter: { width: '100%', height: CARD_W * 0.75, position: 'relative' },
  cardImgWrap: { width: '100%', height: '100%' },
  cardImgTop: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  bidCount: { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  bidCountText: { fontSize: 10, fontWeight: '700', color: colors.awashBlue },
  cardName: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  timePillText: { fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
})
