import React from 'react'
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Package, CheckCircle2, Circle, Bike, Home, MapPin, Phone, ImageIcon, FileText } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function DeliveryScreen() {
  const { go, selectedId, userBid, reset, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const steps = [
    { label: 'Order Confirmed', time: 'Just now', done: true, icon: CheckCircle2 },
    { label: 'Packed & Ready', time: 'Processed', done: true, icon: Package },
    { label: 'Out for Delivery', time: 'In progress', done: false, icon: Bike, active: true },
    { label: 'Delivered', time: 'Estimated 4:30 PM', done: false, icon: Home },
  ]

  const orderPrefix = auction.id.slice(0, 3).toUpperCase()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Track Delivery" onBack={() => go('payment-confirmed')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, borderColor: colors.primary + '4D', backgroundColor: colors.accent, padding: 16 }}>
          <View style={s.courierIcon}>
            <Bike size={28} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>On its way!</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', marginTop: 2 }}>Arriving today · Estimated 4:30 PM</Text>
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 12 }}>
          <View style={s.productImgWrap}>
            {auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: 64, height: 64 }} resizeMode="cover" /> : <ImageIcon size={24} color="#94a3b8" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>{auction.name}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>Order #AWB-{orderPrefix}</Text>
          </View>
        </Card>

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 16 }}>Delivery Progress</Text>
          {steps.map((step, i) => {
            const Icon = step.icon
            const isDone = step.done
            const isActive = 'active' in step && step.active
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', width: 32 }}>
                  <View style={[s.stageIcon, isDone && s.stageIconDone, isActive && s.stageIconActive]}>
                    {isDone ? <CheckCircle2 size={16} color={colors.white} /> : <Circle size={16} color={isActive ? colors.navyForeground : colors.mutedForeground} />}
                  </View>
                  {isActive && <View style={s.stageActiveRing} />}
                  {i < steps.length - 1 && <View style={[s.stageLine, isDone && s.stageLineDone]} />}
                </View>
                <View style={{ marginLeft: 12, marginBottom: i < steps.length - 1 ? 24 : 0 }}>
                  <Text style={[s.stageLabel, (isDone || isActive) && s.stageLabelActive]}>{step.label}</Text>
                  <Text style={s.stageTime}>{step.time}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <Card style={{ padding: 16, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MapPin size={18} color={colors.navy} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Delivery Address</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 }}>
                Bole Sub-city, Woreda 03, Addis Ababa
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground + '99', marginTop: 4 }}>
                Leave at gate if not home
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TouchableOpacity style={s.actionBtn}>
              <Phone size={16} color={colors.primary} />
              <Text style={s.actionText}>Call Courier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}>
              <FileText size={16} color={colors.navy} />
              <Text style={[s.actionText, { color: colors.navy }]}>Receipt</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton variant="navy" onPress={() => reset()}>
          <Home size={18} /> Back to Home
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
  courierIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  productImgWrap: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.secondary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  stageIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  stageIconDone: { backgroundColor: colors.primary },
  stageIconActive: { backgroundColor: colors.navy },
  stageActiveRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 4, borderColor: colors.navy + '26' },
  stageLine: { width: 2, height: 36, backgroundColor: colors.border, marginTop: 4 },
  stageLineDone: { backgroundColor: colors.primary },
  stageLabel: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  stageLabelActive: { color: colors.navy },
  stageTime: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, padding: 16 },
})
