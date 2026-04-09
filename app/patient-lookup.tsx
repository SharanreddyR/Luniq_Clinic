import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Appbar, Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { usePatientDetails } from '@/hooks/usePatientDetails';

export default function PatientLookupScreen() {
  const [input, setInput] = useState('');
  const [submittedCard, setSubmittedCard] = useState<string | null>(null);

  const { data, isFetching, isSuccess, refetch } =
    usePatientDetails(submittedCard);

  function onLookup() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (submittedCard === trimmed) {
      void refetch();
    } else {
      setSubmittedCard(trimmed);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Patient lookup"
          titleStyle={styles.headerTitle}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text variant="bodyMedium" style={styles.intro}>
            Enter the patient&apos;s card number to load their profile.
          </Text>

          <TextInput
            label="Card number"
            value={input}
            onChangeText={setInput}
            mode="outlined"
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={onLookup}
            returnKeyType="search"
          />

          <Button
            mode="contained"
            onPress={onLookup}
            loading={isFetching}
            disabled={!input.trim() || isFetching}
            style={styles.button}
            contentStyle={styles.buttonContent}>
            Fetch patient details
          </Button>

          {isFetching && submittedCard && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Loading patient…
              </Text>
            </View>
          )}

          {isSuccess && data && !isFetching && (
            <Card style={styles.resultCard} mode="elevated">
              <Card.Content style={styles.resultContent}>
                <Image
                  source={{ uri: data.photoUrl }}
                  style={styles.photo}
                  accessibilityLabel={`Photo of ${data.name}`}
                />
                <Text variant="headlineSmall" style={styles.patientName}>
                  {data.name}
                </Text>
                <Text variant="bodySmall" style={styles.cardHint}>
                  Card {submittedCard}
                </Text>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    elevation: 0,
  },
  headerTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  intro: {
    color: colors.textMuted,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.surface,
  },
  button: {
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  loading: {
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
  },
  resultCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surfaceVariant,
    marginBottom: 16,
  },
  patientName: {
    color: colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardHint: {
    color: colors.textMuted,
    marginTop: 6,
  },
});
