import React, { Children, isValidElement } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, type ViewStyle, type TextStyle } from 'react-native'
import { ChevronLeft, Signal, Wifi, BatteryFull } from 'lucide-react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors, borderRadius, fontSize, spacing } from '../theme'

export function CTAButton({
  children,
  variant = 'primary',
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'navy' | 'outline'
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'navy' ? colors.navy : colors.card
  const txt = variant === 'primary' ? colors.primaryForeground : variant === 'navy' ? colors.navyForeground : colors.foreground
  const bd = variant === 'outline' ? colors.border : 'transparent'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        s.ctaBase,
        { backgroundColor: bg, borderColor: bd, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
      activeOpacity={0.85}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {Children.map(children, (child) =>
          typeof child === 'string' || typeof child === 'number' ? (
            <Text style={[s.ctaText, { color: txt }]}>{child}</Text>
          ) : (
            child
          ),
        )}
      </View>
    </TouchableOpacity>
  )
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[s.card, style]}>{children}</View>
}

export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  const tone = dark ? colors.navyForeground : colors.navy
  return (
    <View style={s.statusBar}>
      <Text style={[s.statusTime, { color: tone }]}>9:41</Text>
      <View style={s.statusIcons}>
        <Signal size={14} color={tone} />
        <Wifi size={14} color={tone} style={{ marginLeft: 4 }} />
        <BatteryFull size={16} color={tone} style={{ marginLeft: 4 }} />
      </View>
    </View>
  )
}

export function AppBar({
  title,
  onBack,
  right,
  variant = 'navy',
}: {
  title: string
  onBack?: () => void
  right?: React.ReactNode
  variant?: 'navy' | 'light'
}) {
  const bg = variant === 'navy' ? colors.navy : colors.card
  const txt = variant === 'navy' ? colors.navyForeground : colors.foreground
  return (
    <View style={[s.appBar, { backgroundColor: bg }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={s.appBarBtn} activeOpacity={0.7}>
          <ChevronLeft size={20} color={txt} />
        </TouchableOpacity>
      ) : (
        <View style={s.appBarBtn} />
      )}
      <Text style={[s.appBarTitle, { color: txt }]} numberOfLines={1}>{title}</Text>
      <View style={s.appBarBtn}>{right}</View>
    </View>
  )
}

export function Badge({
  children,
  tone = 'orange',
}: {
  children: React.ReactNode
  tone?: 'orange' | 'navy' | 'green' | 'muted'
}) {
  const bgMap = {
    orange: colors.accent,
    navy: colors.navy + '1A',
    green: colors.emerald100,
    muted: colors.muted,
  }
  const txtMap = {
    orange: colors.accentForeground,
    navy: colors.navy,
    green: colors.emerald700,
    muted: colors.mutedForeground,
  }
  return (
    <View style={[s.badge, { backgroundColor: bgMap[tone] }]}>
      <Text style={[s.badgeText, { color: txtMap[tone] }]}>{children}</Text>
    </View>
  )
}

export function AwashMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="23" fill="#1e2a6b" />
      <Path d="M9 27c4-6 9-9 15-9s11 3 15 9" fill="none" stroke="#f47b20" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M12 20c3.5-4.5 7.5-6.8 12-6.8S32.5 15.5 36 20" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <Circle cx="24" cy="30.5" r="3.2" fill="#f47b20" />
    </Svg>
  )
}

export function AwashLogo({ variant = 'light', size = 32 }: { variant?: 'light' | 'dark'; size?: number }) {
  const topColor = variant === 'light' ? colors.navy : colors.white
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <AwashMark size={size} />
      <View>
        <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 18, letterSpacing: -0.5, color: topColor }}>
          AwashBank
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: colors.primary }}>
          Mobile Money
        </Text>
      </View>
    </View>
  )
}

export function StatBlock({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <View style={{ flexDirection: 'column' }}>
      <Text style={{ fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 14, color: accent ? colors.primary : colors.navy }}>
        {value}
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  ctaBase: {
    height: 48,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  statusTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  appBarBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'System',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
})
