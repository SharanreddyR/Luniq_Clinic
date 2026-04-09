import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '@/constants/Colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text variant="titleLarge" style={styles.title}>
          This screen does not exist.
        </Text>
        <Link href="/" asChild>
          <Pressable style={styles.link}>
            <Text variant="bodyLarge" style={styles.linkText}>
              Back to start
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.secondary,
    textAlign: 'center',
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
