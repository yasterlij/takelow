import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Wallet, ArrowDown, CheckCircle2, Loader2 } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export function DepositScreen() {
  const { go, walletBalance, refreshWallet } = useApp()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numericAmount = parseFloat(amount || '0')
  const valid = numericAmount > 0

  const handleDeposit = async () => {
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.wallet.deposit(numericAmount)
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => { setSuccess(false); go('home') }, 2000)
    } catch (e: any) {
      setError(e?.message || 'Deposit failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="Top Up Wallet" onBack={() => go('home')} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
            <Wallet size={22} color={colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Current Balance</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>{CURRENCY} {formatETB(walletBalance)}</Text>
          </View>
          <ArrowDown size={20} color={colors.emerald600} />
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 }}>Amount</Text>
        <View style={s.inputRow}>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1').slice(0, 8))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            style={s.amountInput}
          />
          <Text style={s.currency}>{CURRENCY}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {QUICK_AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAmount(String(a))}
              style={[s.quickBtn, numericAmount === a && s.quickBtnActive]}
            >
              <Text style={[s.quickBtnText, numericAmount === a && s.quickBtnTextActive]}>{CURRENCY} {a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.destructive, marginTop: 12, textAlign: 'center' }}>{error}</Text>
        ) : null}

        {success ? (
          <Card style={{ alignItems: 'center', padding: 24, marginTop: 24, borderColor: colors.emerald500, backgroundColor: colors.emerald50 + '80' }}>
            <CheckCircle2 size={40} color={colors.emerald600} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.emerald700, marginTop: 12 }}>Deposit Successful!</Text>
            <Text style={{ fontSize: 12, color: colors.emerald600, marginTop: 4 }}>New balance: {CURRENCY} {formatETB(walletBalance)}</Text>
          </Card>
        ) : (
          <CTAButton disabled={!valid || loading} onPress={handleDeposit} style={{ marginTop: 24 }}>
            {loading ? <Loader2 size={18} color="#fff" /> : `Deposit ${CURRENCY} ${formatETB(numericAmount || 0)}`}
          </CTAButton>
        )}
      </ScrollView>
    </View>
  )
}

function StatusBarCustom() {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.navyForeground }}>9:41</Text>
  </View>
}

const s = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  amountInput: { width: 200, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 12, textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.navy },
  currency: { paddingBottom: 16, fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  quickBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center' },
  quickBtnActive: { borderColor: colors.primary, backgroundColor: colors.accent },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  quickBtnTextActive: { color: colors.primary, fontWeight: '700' },
})
