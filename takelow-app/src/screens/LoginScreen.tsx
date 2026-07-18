import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Eye, EyeOff, Smartphone, Lock } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashLogo } from '../components/AuctionUI'
import { colors } from '../theme'

export function LoginScreen() {
  const { login, go } = useApp()
  const [phone, setPhone] = useState('0911111111')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (!phone.trim() || !pin.trim()) { setError('Please enter phone and PIN'); return }
    const ok = login(phone.trim(), pin.trim())
    if (!ok) { setError('Invalid phone or PIN'); return }
  }

  return (
    <View style={s.container}>
      <View style={s.body}>
        <AwashLogo variant="light" size={48} />
        <Text style={s.title}>Welcome Back</Text>
        <Text style={s.subtitle}>Sign in to your Awash Mobile Money</Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

        <View style={s.form}>
          <Text style={s.label}>Phone Number</Text>
          <View style={s.inputRow}>
            <Smartphone size={18} color={colors.white + '99'} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="091 XXX XXXX" placeholderTextColor={colors.white + '40'} style={s.input} keyboardType="phone-pad" />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>PIN</Text>
          <View style={s.inputRow}>
            <Lock size={18} color={colors.white + '99'} />
            <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))} secureTextEntry={!showPin} maxLength={4} placeholder="****" placeholderTextColor={colors.white + '40'} style={s.input} keyboardType="number-pad" />
            <TouchableOpacity onPress={() => setShowPin((s) => !s)}><Text style={s.eye}>{showPin ? <EyeOff size={16} color={colors.white + '99'} /> : <Eye size={16} color={colors.white + '99'} />}</Text></TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.loginBtn} onPress={handleLogin}>
          <Text style={s.loginBtnText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={s.footer}>
          Don't have an account?{' '}
          <Text onPress={() => go('register')} style={s.footerLink}>Register</Text>
        </Text>
      </View>
      <Text style={s.hint}>Admin: 0911111111 / 1234  •  User: 0913320001 / 0000</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy, justifyContent: 'center', paddingHorizontal: 24 },
  body: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navyForeground, marginTop: 32 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.navyForeground + '99', marginTop: 4 },
  errorBox: { marginTop: 24, borderRadius: 12, backgroundColor: colors.destructive + '26', padding: 12, width: '100%', maxWidth: 320 },
  errorText: { fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' },
  form: { marginTop: 32, width: '100%', maxWidth: 320 },
  label: { fontSize: 12, fontWeight: '600', color: colors.navyForeground + 'B3', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.navyForeground + '4D', backgroundColor: colors.white + '1A', paddingHorizontal: 16, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.navyForeground },
  eye: { padding: 4 },
  loginBtn: { marginTop: 32, width: '100%', maxWidth: 320, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  loginBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  footer: { marginTop: 24, fontSize: 12, fontWeight: '500', color: colors.navyForeground + '80' },
  footerLink: { fontWeight: '700', color: colors.primary },
  hint: { position: 'absolute', bottom: 24, left: 24, right: 24, textAlign: 'center', fontSize: 9, fontWeight: '500', color: colors.navyForeground + '40' },
})
