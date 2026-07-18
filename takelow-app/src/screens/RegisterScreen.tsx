import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Eye, EyeOff, Smartphone, Lock, User } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashLogo } from '../components/AuctionUI'
import { colors } from '../theme'

export function RegisterScreen() {
  const { register, go } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = () => {
    if (!name.trim() || !phone.trim() || !pin.trim()) { setError('All fields are required'); return }
    if (pin.length < 4) { setError('PIN must be 4 digits'); return }
    register(name.trim(), phone.trim(), pin.trim())
  }

  return (
    <View style={s.container}>
      <View style={s.body}>
        <AwashLogo variant="light" size={48} />
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join Awash Mobile Money</Text>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

        <View style={s.form}>
          <Text style={s.label}>Full Name</Text>
          <View style={s.inputRow}>
            <User size={18} color={colors.white + '99'} />
            <TextInput value={name} onChangeText={setName} placeholder="Selam Tesfaye" placeholderTextColor={colors.white + '40'} style={s.input} />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>Phone Number</Text>
          <View style={s.inputRow}>
            <Smartphone size={18} color={colors.white + '99'} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="091 XXX XXXX" placeholderTextColor={colors.white + '40'} style={s.input} keyboardType="phone-pad" />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>PIN (4 digits)</Text>
          <View style={s.inputRow}>
            <Lock size={18} color={colors.white + '99'} />
            <TextInput value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))} secureTextEntry={!showPin} maxLength={4} placeholder="****" placeholderTextColor={colors.white + '40'} style={s.input} keyboardType="number-pad" />
            <TouchableOpacity onPress={() => setShowPin((s) => !s)}><Text style={s.eye}>{showPin ? <EyeOff size={16} color={colors.white + '99'} /> : <Eye size={16} color={colors.white + '99'} />}</Text></TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.registerBtn} onPress={handleRegister}>
          <Text style={s.registerBtnText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={s.footer}>
          Already have an account?{' '}
          <Text onPress={() => go('login')} style={s.footerLink}>Sign In</Text>
        </Text>
      </View>
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
  registerBtn: { marginTop: 32, width: '100%', maxWidth: 320, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  registerBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  footer: { marginTop: 24, fontSize: 12, fontWeight: '500', color: colors.navyForeground + '80' },
  footerLink: { fontWeight: '700', color: colors.primary },
})
