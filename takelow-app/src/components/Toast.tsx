import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet, type ViewStyle } from 'react-native'
import { CheckCircle2, AlertCircle, X } from 'lucide-react-native'
import { colors } from '../theme'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={s.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [])

  const icon = toast.type === 'success' ? <CheckCircle2 size={18} color={colors.emerald600} /> : <AlertCircle size={18} color={colors.destructive} />
  const bg = toast.type === 'success' ? colors.emerald50 : toast.type === 'error' ? '#FEF2F2' : colors.secondary

  return (
    <Animated.View style={[s.toast, { backgroundColor: bg, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      {icon}
      <Text style={s.toastText}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}><X size={16} color={colors.mutedForeground} /></TouchableOpacity>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 60, left: 16, right: 16, gap: 8, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.navy },
})
