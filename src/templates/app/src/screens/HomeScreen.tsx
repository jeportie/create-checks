import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const [count, setCount] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>⚛️</Text>
            <Text style={styles.logoLabel}>React Native</Text>
          </View>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>📱</Text>
            <Text style={styles.logoLabel}>Expo</Text>
          </View>
        </View>

        <Text style={styles.title}>Welcome to Your App</Text>
        <Text style={styles.subtitle}>React Native + Expo + TypeScript</Text>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => setCount((prev) => prev + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Counter button, current count is ${count}`}
          >
            <Text style={styles.buttonText}>count is {count}</Text>
          </Pressable>
          <Text style={styles.hint}>
            Edit <Text style={styles.code}>src/screens/HomeScreen.tsx</Text> and save to see changes
          </Text>
        </View>

        <View style={styles.getStarted}>
          <Text style={styles.getStartedTitle}>Get Started</Text>
          <Text style={styles.step}>1. Scan the QR code with Expo Go</Text>
          <Text style={styles.step}>2. Edit screens in src/screens/</Text>
          <Text style={styles.step}>3. Add navigation in src/navigation/</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  logoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonPressed: {
    backgroundColor: '#086a8a',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#e8e8e8',
    fontSize: 13,
  },
  getStarted: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
});
