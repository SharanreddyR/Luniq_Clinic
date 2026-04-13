import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Appbar, Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clinicIcons,
  clinicScreen,
  radii,
  shadows,
  spacing,
  typography,
} from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientByCardMutation } from '@/hooks/usePatientByCardMutation';
import type { PatientRecord } from '@/types/patient';

const PHOTO_SIZE = 60;
const PHOTO_RADIUS = 30;
const RESULT_CARD_PADDING = 12;
const RESULT_CARD_MARGIN_TOP = 16;

export default function PatientLookupScreen() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PatientRecord | null>(null);

  const lookup = usePatientByCardMutation();
  const { showError, showSuccess } = useAppToast();

  function onSearch() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setResult(null);
    lookup.mutate(trimmed, {
      onSuccess: (data) => {
        setResult(data);
        showSuccess('Patient found. Tap the card to verify.');
      },
      onError: (err) => {
        setResult(null);
        showError(
          err instanceof Error ? err.message : 'Could not load patient',
        );
      },
    });
  }

  function onInputChange(v: string) {
    setInput(v);
    setResult(null);
    lookup.reset();
  }

  function goToVerification(p: PatientRecord) {
    router.push({
      pathname: '/patient-verification',
      params: { patient: JSON.stringify(p) },
    } as Href);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Patient card"
          titleStyle={clinicScreen.headerTitle}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text variant="bodyMedium" style={styles.intro}>
            Enter the card number and tap Search. When a patient is found, tap
            the card to open verification. Try a card containing{' '}
            <Text style={styles.mono}>FAMILY</Text>,{' '}
            <Text style={styles.mono}>COUPLE</Text>, or{' '}
            <Text style={styles.mono}>CHILD</Text> for linked members in the
            record.
          </Text>

          <Card style={clinicScreen.card} mode="elevated">
            <Card.Content>
              <TextInput
                label="Enter card number"
                value={input}
                onChangeText={onInputChange}
                mode="outlined"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                onSubmitEditing={onSearch}
                returnKeyType="search"
                disabled={lookup.isPending}
              />

              <Button
                mode="contained"
                onPress={onSearch}
                loading={lookup.isPending}
                disabled={!input.trim() || lookup.isPending}
                style={[clinicScreen.button, styles.searchBtn]}
                contentStyle={clinicScreen.buttonContent}>
                Search
              </Button>
            </Card.Content>
          </Card>

          {lookup.isPending ? (
            <View style={styles.loadingRow} accessibilityLabel="Loading patient">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="bodyMedium" style={styles.loadingText}>
                Looking up card…
              </Text>
            </View>
          ) : null}

          {result && !lookup.isPending ? (
            <TouchableOpacity
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Open verification for ${result.name}`}
              onPress={() => goToVerification(result)}
              style={styles.resultTouchable}>
              <View style={styles.resultCard}>
                <Image
                  source={{ uri: result.photo }}
                  style={styles.photo}
                  accessibilityLabel={`Photo of ${result.name}`}
                />
                <View style={styles.resultDetails}>
                  <Text
                    variant="titleMedium"
                    style={styles.patientName}
                    numberOfLines={2}>
                    {result.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={styles.cardNumber}
                    numberOfLines={1}
                    selectable>
                    {result.cardNumber}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={clinicIcons.size.md}
                  color={colors.textMuted}
                  style={styles.chevron}
                />
              </View>
            </TouchableOpacity>
          ) : null}
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
  flex: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.lg,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: colors.secondary,
    fontWeight: '600',
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  searchBtn: {
    marginTop: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: clinicIcons.textGap,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  loadingText: {
    ...typography.subtitle,
  },
  resultTouchable: {
    marginTop: RESULT_CARD_MARGIN_TOP,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: RESULT_CARD_PADDING,
    ...shadows.card,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_RADIUS,
    backgroundColor: colors.surfaceVariant,
    marginRight: RESULT_CARD_PADDING,
  },
  resultDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  patientName: {
    color: colors.secondary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: '400',
  },
  chevron: {
    marginLeft: 4,
  },
});
