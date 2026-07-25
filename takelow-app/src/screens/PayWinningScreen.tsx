import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { ShieldCheck, Clock, Wallet, Building2, ChevronDown, ChevronUp } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function PayWinningScreen() {
  const { go, selectedId, userBid, payWinning, getAuction, authError, paymentMethod, setPaymentMethod } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const amount = userBid ?? 0
  const deadline = (auction as any).payment_deadline ? new Date((auction as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : 24
  const deadlineMins = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000)) : 1440
  const urgent = deadlineHrs < 6

  const [showMethods, setShowMethods] = useState(false)
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH'>(paymentMethod)
  const [customerPhone, setCustomerPhone] = useState('')

  const handlePay = () => {
    setPaymentMethod(selected)
    payWinning(selected, customerPhone || undefined)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar title="Pay Winning Amount" onBack={() => go('winner')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <View style={[s.deadline, urgent && { backgroundColor: colors.destructive + '22' }]}>
          <Clock size={18} color={urgent ? colors.destructive : colors.primary} />
          <Text style={s.deadlineText}>
            {deadlineHrs > 0
              ? `Complete payment within ${deadlineHrs}h ${deadlineMins % 60}m to claim your prize.`
              : `Less than an hour remaining! Pay now to claim your prize.`}
          </Text>
        </View>

        <Card style={{ alignItems: 'center', padding: 24, marginTop: 16 }}>
          <Text style={s.label}>Winning Bid</Text>
          <Text style={s.amount}>{formatETB(amount)} {CURRENCY}</Text>
          <Text style={s.forProduct}>for {auction.name}</Text>
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

        <TouchableOpacity
          onPress={() => setShowMethods(!showMethods)}
          style={s.methodSelector}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {selected === 'SIKINAPAY' ? (
              <ShieldCheck size={20} color={colors.primary} />
            ) : (
              <Building2 size={20} color={colors.primary} />
            )}
            <View>
              <Text style={s.methodSelectorTitle}>
                {selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank Wallet'}
              </Text>
              <Text style={s.methodSelectorSub}>Change payment method</Text>
            </View>
          </View>
          {showMethods ? <ChevronUp size={16} color={colors.mutedForeground} /> : <ChevronDown size={16} color={colors.mutedForeground} />}
        </TouchableOpacity>

        {showMethods && (
          <View style={s.methodsList}>
            <TouchableOpacity
              onPress={() => { setSelected('SIKINAPAY'); setShowMethods(false) }}
              style={[s.methodOption, selected === 'SIKINAPAY' && s.methodOptionSelected]}
            >
              <ShieldCheck size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>SikinaPay</Text>
                <Text style={s.methodOptionSub}>Pay via Mobile Money, USSD, or card</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSelected('AWASH'); setShowMethods(false) }}
              style={[s.methodOption, selected === 'AWASH' && s.methodOptionSelected]}
            >
              <Building2 size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>Awash Bank Wallet</Text>
                <Text style={s.methodOptionSub}>Pay directly from your Awash Bank account</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {selected === 'AWASH' && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginBottom: 4 }}>Phone Number (optional)</Text>
            <TextInput
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+251..."
              placeholderTextColor={colors.mutedForeground}
              style={s.phoneInput}
              keyboardType="phone-pad"
            />
          </View>
        )}

        {selected === 'SIKINAPAY' && (
          <View style={s.infoBox}>
            <ShieldCheck size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>SikinaPay Checkout</Text>
              <Text style={s.infoText}>
                Complete your payment securely within the app using SikinaPay checkout via Mobile Money, USSD, or card.
              </Text>
            </View>
          </View>
        )}

        {selected === 'AWASH' && (
          <View style={s.infoBox}>
            <Wallet size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>Awash Bank Secure Checkout</Text>
              <Text style={s.infoText}>
                You will be redirected to Awash Bank's secure payment page to complete the transaction.
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
            Secured by {selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank'}
          </Text>
        </View>

        {authError && (
          <View style={{ borderRadius: 12, backgroundColor: colors.destructive + '22', padding: 12, marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' }}>{authError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton onPress={handlePay}>
          {selected === 'SIKINAPAY' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Pay with SikinaPay</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Pay with Awash Bank</Text>
            </View>
          )}
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
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.accent, padding: 12 },
  deadlineText: { fontSize: 13, fontWeight: '600', color: colors.navy + 'CC', flex: 1 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  amount: { fontSize: 36, fontWeight: '800', color: colors.navy, marginTop: 8, fontVariant: ['tabular-nums'] },
  forProduct: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.mutedForeground },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.navy },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginTop: 12 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
  methodSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, marginTop: 16 },
  methodSelectorTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  methodSelectorSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  methodsList: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 8, marginTop: 8 },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, padding: 12 },
  methodOptionSelected: { backgroundColor: colors.primary + '1A' },
  methodOptionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  methodOptionSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  phoneInput: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, fontSize: 14, fontWeight: '500', color: colors.navy },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, backgroundColor: colors.accent, padding: 16, marginTop: 16 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  infoText: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
})