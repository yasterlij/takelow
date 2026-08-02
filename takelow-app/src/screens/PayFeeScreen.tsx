import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import { Wallet, ShieldCheck, Info, Lock, X, AlertTriangle, Building2, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, AwashMark } from '../components/AuctionUI'
import { CURRENCY, formatCurrency, formatETB } from '../mockDataV0'
import { api } from '../api'
import { colors, fontSize } from '../theme'

export function PayFeeScreen() {
  const { go, selectedId, walletBalance, payFee, getAuction, paymentMethod, setPaymentMethod, pendingBidAmount, setPendingBidAmount } = useApp()
  const auction = getAuction(selectedId)

  const [showMethods, setShowMethods] = useState(false)
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH'>('AWASH')

  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [pinLocked, setPinLocked] = useState(false)
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null)

  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [setupPin, setSetupPin] = useState('')
  const [setupConfirm, setSetupConfirm] = useState('')
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  const [checkingPin, setCheckingPin] = useState(false)
  const [bidAmount, setBidAmount] = useState(pendingBidAmount != null ? pendingBidAmount.toFixed(2) : '')
  const [bidError, setBidError] = useState<string | null>(null)
  const [bidFlash, setBidFlash] = useState(false)
  const STEP = 0.01

  useEffect(() => {
    if (showPinModal) {
      setPinInput('')
      setPinError(null)
    }
  }, [showPinModal])

  const numericBid = bidAmount ? Number(bidAmount) : 0
  const hasValidBid = numericBid >= 1 && /^\d+(\.\d{1,2})?$/.test(bidAmount)

  useEffect(() => {
    if (!bidFlash) return
    const id = setTimeout(() => setBidFlash(false), 240)
    return () => clearTimeout(id)
  }, [bidFlash])

  const updateBid = useCallback((next: number) => {
    const safe = Math.max(1, Number(next.toFixed(2)))
    setBidAmount(safe.toFixed(2))
    setBidError(null)
    setPendingBidAmount(safe)
    setBidFlash(true)
  }, [setPendingBidAmount])

  const adjustBid = useCallback((delta: number) => {
    updateBid((bidAmount ? Number(bidAmount) : 1) + delta)
  }, [bidAmount, updateBid])

  const handlePayPress = useCallback(async () => {
    if (!auction) return
    if (!hasValidBid) {
      setBidError('Enter a valid bid amount to continue')
      return
    }
    setPendingBidAmount(numericBid)
    if (selected === 'SIKINAPAY') {
      setPaymentMethod('SIKINAPAY')
      payFee(auction.bidFee, 'SIKINAPAY')
      return
    }

    setPaymentMethod('AWASH')
    setCheckingPin(true)
    try {
      const status = await api.wallet.pinStatus()
      setPinLocked(status.locked)
      setPinLockedUntil(status.lockedUntil)
      setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining)
      setNeedsPinSetup(!status.hasPin)
      setShowPinModal(true)
    } catch (err: any) {
      setPinError(err?.message || 'Failed to check wallet PIN status')
      setNeedsPinSetup(false)
      setPinLocked(false)
      setShowPinModal(true)
    } finally {
      setCheckingPin(false)
    }
  }, [selected, auction, hasValidBid, numericBid, payFee, setPaymentMethod, setPendingBidAmount])

  const handleVerifyPin = useCallback(async () => {
    if (!auction) return
    if (!pinInput) {
      setPinError('Please enter your wallet PIN')
      return
    }
    if (pinLocked) return
    setPinLoading(true)
    setPinError(null)
    try {
      const res = await api.wallet.verifyPin(pinInput)
      if (res.valid) {
        setShowPinModal(false)
        payFee(auction.bidFee, 'AWASH')
      } else if (res.locked) {
        setPinLocked(true)
        setPinLockedUntil(res.lockedUntil)
        setAttemptsRemaining(0)
        setPinError(
          'Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.'
        )
      } else {
        setAttemptsRemaining(res.attemptsRemaining)
        if (res.attemptsRemaining <= 2) {
          setPinError(`Invalid PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout`)
        } else {
          setPinError('Invalid wallet PIN')
        }
      }
    } catch (err: any) {
      setPinError(err?.message || 'Unable to verify PIN. Please try again.')
    } finally {
      setPinLoading(false)
    }
  }, [pinInput, auction, payFee, pinLocked])

  const handleSetupPin = useCallback(async () => {
    if (!auction) return
    if (!setupPin || setupPin.length < 4 || setupPin.length > 6 || !/^\d+$/.test(setupPin)) {
      setSetupError('PIN must be 4–6 digits')
      return
    }
    if (setupPin !== setupConfirm) {
      setSetupError('PINs do not match')
      return
    }
    setSetupLoading(true)
    setSetupError(null)
    try {
      await api.wallet.setPin(setupPin)
      setShowPinModal(false)
      setNeedsPinSetup(false)
      payFee(auction.bidFee, 'AWASH')
    } catch (err: any) {
      setSetupError('Failed to set wallet PIN. Please try again.')
    } finally {
      setSetupLoading(false)
    }
  }, [setupPin, setupConfirm, auction, payFee])

  const [lockCountdown, setLockCountdown] = useState('')
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown('')
      return
    }
    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now()
      if (ms <= 0) {
        setLockCountdown('')
        setPinLocked(false)
        setPinLockedUntil(null)
        setAttemptsRemaining(5)
        return
      }
      const totalSec = Math.ceil(ms / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (h > 0) {
        setLockCountdown(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
      } else {
        setLockCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`)
      }
    }
    update()
    tickRef.current = setInterval(update, 1000)
    return () => clearInterval(tickRef.current)
  }, [pinLocked, pinLockedUntil])

  if (!auction) return null

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar
        title="Place Bid & Pay"
        onBack={() => go('product')}
        right={
          <TouchableOpacity onPress={() => go('home')} style={{ width: 34, height: 34, justifyContent: 'center', alignItems: 'center' }}>
            <AwashMark size={22} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>
          Pay the non-refundable participation fee to enter this auction.
        </Text>

        <Card style={{ padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.awashBlue + '1A', backgroundColor: colors.awashBlue + '0D' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.awashBlue }}>Bid amount required before payment</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground, marginTop: 6 }}>Enter your bid amount to continue.</Text>
          <View style={[s.bidControl, bidFlash && s.bidControlActive]}>
            <TouchableOpacity onPress={() => adjustBid(-STEP)} disabled={numericBid <= 1} style={[s.bidAdjustBtn, numericBid <= 1 && s.bidAdjustBtnDisabled]}>
              <Minus size={18} color={numericBid <= 1 ? colors.mutedForeground : colors.awashBlue} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput
                value={bidAmount}
                onChangeText={(t) => {
                  const clean = t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1').slice(0, 8)
                  setBidAmount(clean)
                  setBidError(null)
                  setPendingBidAmount(clean ? Number(clean) : null)
                }}
                onBlur={() => {
                  if (!bidAmount) return
                  const normalized = Number(bidAmount)
                  if (normalized < 1) {
                    setBidError('Minimum bid is 1.00')
                    updateBid(1)
                    return
                  }
                  updateBid(normalized)
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={s.bidInput}
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={s.bidCurrency}>{CURRENCY}</Text>
            </View>
            <TouchableOpacity onPress={() => adjustBid(STEP)} style={s.bidAdjustBtn}>
              <Plus size={18} color={colors.awashBlue} />
            </TouchableOpacity>
          </View>
          {bidError ? <Text style={s.pinError}>{bidError}</Text> : null}
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8 }}>Minimum bid is 1.00 {CURRENCY}. Uniqueness is checked when the bid is submitted.</Text>
        </Card>

        <Card style={{ alignItems: 'center', padding: 24, marginTop: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Service Fee</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.navy, marginTop: 8 }}>{formatCurrency(auction.bidFee)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 8 }}>for {auction.name}</Text>
        </Card>

        {hasValidBid && (
          <Card style={{ padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.emerald200, backgroundColor: colors.emerald50 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.emerald700 }}>Preview before payment</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: colors.mutedForeground }}>Your bid</Text><Text style={{ fontSize: 12, fontWeight: '700', color: colors.awashBlue }}>{formatCurrency(numericBid)}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: 12, color: colors.mutedForeground }}>Service fee (charged now)</Text><Text style={{ fontSize: 12, fontWeight: '700', color: colors.awashBlue }}>{formatCurrency(auction.bidFee)}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.emerald200, paddingTop: 8 }}><Text style={{ fontSize: 12, color: colors.mutedForeground }}>Total charged today</Text><Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald700 }}>{formatCurrency(auction.bidFee)}</Text></View>
            </View>
            <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8 }}>Your bid is saved and will be submitted automatically after payment confirmation.</Text>
          </Card>
        )}

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 }}>Pay with</Text>

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
          <Card style={s.methodsList}>
            <TouchableOpacity
              onPress={() => { setSelected('AWASH'); setShowMethods(false) }}
              style={[s.methodOption, selected === 'AWASH' && s.methodOptionSelected]}
            >
              <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                <AwashMark size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>Awash Bank Wallet</Text>
                <Text style={s.methodOptionSub}>Pay using your wallet balance</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSelected('SIKINAPAY'); setShowMethods(false) }}
              style={[s.methodOption, selected === 'SIKINAPAY' && s.methodOptionSelected]}
            >
              <ShieldCheck size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>SikinaPay</Text>
                <Text style={s.methodOptionSub}>Pay via online payment gateway</Text>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        {selected === 'SIKINAPAY' && (
          <View style={s.infoBox}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={s.infoText}>Complete your payment securely within the app using SikinaPay checkout.</Text>
          </View>
        )}

        {selected === 'AWASH' && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', padding: 16, marginTop: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' }}>
              <AwashMark size={32} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Awash Bank Wallet</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}><Wallet size={14} /> Balance: {formatCurrency(walletBalance)}</Text>
            </View>
          </Card>
        )}

        <View style={s.infoBox}>
          <Info size={16} color={colors.navy + '99'} />
          <Text style={s.infoText}>The service fee is non-refundable and confirms your participation. Your saved bid will be submitted after payment confirmation.</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
            Secured by {selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank'}
          </Text>
        </View>
      </ScrollView>

      <Card style={s.bottomCta}>
        {walletBalance < auction.bidFee && (
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center', marginBottom: 8 }}>
            Insufficient balance — top up before paying
          </Text>
        )}
        <CTAButton onPress={handlePayPress} disabled={!hasValidBid || (selected === 'AWASH' && (walletBalance < auction.bidFee || checkingPin))}>
          {checkingPin ? 'Checking...' : selected === 'SIKINAPAY' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Proceed to Payment · {formatCurrency(auction.bidFee)}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Proceed to Payment · {formatCurrency(auction.bidFee)}</Text>
          </View>
        )}
        </CTAButton>
      </Card>

      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowPinModal(false)}>
            <View />
          </TouchableOpacity>
          <Card style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{needsPinSetup ? 'Set Wallet PIN' : 'Enter Wallet PIN'}</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {needsPinSetup ? (
              <>
                <Text style={s.modalDesc}>Create a 4–6 digit PIN to secure your wallet payments.</Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="New PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupPin}
                  onChangeText={setSetupPin}
                />
                <TextInput
                  style={s.pinInput}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupConfirm}
                  onChangeText={setSetupConfirm}
                />
                {setupError && <Text style={s.pinError}>{setupError}</Text>}
                <CTAButton onPress={handleSetupPin} disabled={setupLoading}>
                  {setupLoading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : 'Set PIN & Pay'}
                </CTAButton>
              </>
            ) : pinLocked ? (
              <>
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <AlertTriangle size={40} color={colors.destructive} />
                  <Text style={s.modalTitle}>PIN Locked</Text>
                  <Text style={s.modalDesc}>
                    Too many incorrect attempts. Your wallet PIN has been locked for security. Try again in {lockCountdown || '05:00s'}.
                  </Text>
                </View>
                <CTAButton variant="outline" onPress={() => setShowPinModal(false)}>
                  Close
                </CTAButton>
              </>
            ) : (
              <>
                <Text style={s.modalDesc}>Enter your wallet PIN to confirm payment of {formatCurrency(auction.bidFee)}.</Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="Enter PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={pinInput}
                  onChangeText={setPinInput}
                  autoFocus
                />
                {pinError && <Text style={s.pinError}>{pinError}</Text>}
                {attemptsRemaining != null && attemptsRemaining <= 3 && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.warning }}>
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                    </Text>
                  </View>
                )}
                <CTAButton onPress={handleVerifyPin} disabled={pinLoading || !pinInput.trim()}>
                  {pinLoading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : 'Confirm Payment'}
                </CTAButton>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </Modal>
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
  methodSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, marginTop: 12 },
  methodSelectorTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  methodSelectorSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  methodsList: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 8, marginTop: 8 },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, padding: 12 },
  methodOptionSelected: { backgroundColor: colors.primary + '1A' },
  methodOptionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  methodOptionSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  bidControl: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 8 },
  bidControlActive: { borderColor: colors.emerald200, shadowColor: colors.emerald500, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 2 },
  bidAdjustBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  bidAdjustBtnDisabled: { opacity: 0.45 },
  bidInput: { width: '100%', textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.navy, paddingVertical: 8 },
  bidCurrency: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.mutedForeground, paddingBottom: 4 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  modalDesc: { fontSize: 13, fontWeight: '500', color: colors.mutedForeground, lineHeight: 20 },
  pinInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.input, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', color: colors.navy, backgroundColor: colors.muted, textAlign: 'center', letterSpacing: 8 },
  pinError: { fontSize: 13, fontWeight: '600', color: colors.destructive, textAlign: 'center' },
})
