import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={s.button} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={s.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: 8 },
  message: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 24 },
  button: { borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
})
