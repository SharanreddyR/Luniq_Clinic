import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { usePatientByCardMutation } from '@/hooks/usePatientByCardMutation';
import { usePatientStore } from '@/store';
import type { PatientCardType, PatientRecord } from '@/types/patient';
import { patientRecordForMember } from '@/utils/patientSelection';

const PHOTO_SIZE = 64;
const PHOTO_R = 32;

const LINKED_CARD: PatientCardType[] = ['Family', 'Couple', 'Child'];

function hasLinkedMembers(p: PatientRecord): boolean {
  const n = p.members?.length ?? 0;
  if (n === 0) return false;
  if (!p.cardType) return true;
  return LINKED_CARD.includes(p.cardType);
}

export default function PatientIntakeScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const setActivePatient = usePatientStore((s) => s.setActivePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);

  const [input, setInput] = useState('');
  const [lookupHit, setLookupHit] = useState<PatientRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const lookup = usePatientByCardMutation();
  const lookupRef = useRef(lookup);
  lookupRef.current = lookup;

  useFocusEffect(
    useCallback(() => {
      const scanned = usePatientStore.getState().consumePendingCardInput();
      if (!scanned) return;
      setInput(scanned);
      setLookupHit(null);
      setLookupError(null);
      lookupRef.current.reset();
      lookupRef.current.mutate(scanned, {
        onSuccess: (data) => {
          setLookupHit(data);
          setLookupError(null);
        },
        onError: (err) => {
          setLookupHit(null);
          setLookupError(
            err instanceof Error ? err.message : 'Could not load patient',
          );
        },
      });
    }, []),
  );

  function runLookup(trimmed: string) {
    if (!trimmed) return;
    setLookupHit(null);
    setLookupError(null);
    lookup.mutate(trimmed, {
      onSuccess: (data) => {
        setLookupHit(data);
        setLookupError(null);
      },
      onError: (err) => {
        setLookupHit(null);
        setLookupError(
          err instanceof Error ? err.message : 'Could not load patient',
        );
      },
    });
  }

  function onConfirmChoice(base: PatientRecord, memberIndex: number | null) {
    const effective = patientRecordForMember(base, memberIndex);
    setActivePatient(effective);
    setLookupHit(null);
    setLookupError(null);
    lookup.reset();
    router.push('/patient-intake-visit' as Href);
  }

  function onChangePatient() {
    clearActivePatient();
    clearVisitSession();
    setLookupHit(null);
    setLookupError(null);
    setInput('');
    lookup.reset();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Find patient" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text variant="labelLarge" style={styles.heroKicker}>
              Step 1 · Reception
            </Text>
            <Text variant="headlineSmall" style={styles.flowTitle}>
              Find patient
            </Text>
            <Text variant="bodyMedium" style={styles.flowSub}>
              Scan or type the card number, search, then confirm who is being
              seen today. Family cards show everyone on the plan.
            </Text>
          </View>

          {activePatient && !lookupHit ? (
            <Card style={[clinicScreen.card, styles.resumeCard]} mode="elevated">
              <Card.Content style={styles.resumeInner}>
                <View style={styles.resumeText}>
                  <Text variant="labelSmall" style={styles.resumeLabel}>
                    Ready for visit details
                  </Text>
                  <Text variant="titleMedium" style={styles.resumeName}>
                    {activePatient.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.resumeCardNo}>
                    {activePatient.cardNumber}
                  </Text>
                </View>
                <View style={styles.resumeBtns}>
                  <Button
                    mode="contained"
                    onPress={() =>
                      router.push('/patient-intake-visit' as Href)
                    }
                    style={styles.resumePrimary}
                    contentStyle={styles.resumePrimaryContent}>
                    Continue to visit
                  </Button>
                  <Button mode="outlined" onPress={onChangePatient}>
                    Start over
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <Card style={[clinicScreen.card, styles.lookupCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Card number
              </Text>
              <TextInput
                label="Card number"
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  setLookupHit(null);
                  setLookupError(null);
                  lookup.reset();
                }}
                mode="outlined"
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                onSubmitEditing={() => runLookup(input.trim())}
                returnKeyType="search"
                disabled={lookup.isPending}
              />
              <View style={styles.row2}>
                <Button
                  mode="outlined"
                  icon="barcode-scan"
                  onPress={() => router.push('/patient-scan' as Href)}
                  disabled={lookup.isPending}
                  style={styles.half}
                  contentStyle={styles.btnIn}>
                  Scan
                </Button>
                <Button
                  mode="contained"
                  onPress={() => runLookup(input.trim())}
                  loading={lookup.isPending}
                  disabled={!input.trim() || lookup.isPending}
                  style={styles.half}
                  contentStyle={styles.btnIn}>
                  Search
                </Button>
              </View>
              {lookup.isPending ? (
                <View style={styles.inlineLoad}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text variant="bodySmall" style={styles.inlineLoadText}>
                    Searching…
                  </Text>
                </View>
              ) : null}

              {lookupError ? (
                <HelperText type="error" visible style={styles.lookupError}>
                  {lookupError}
                </HelperText>
              ) : null}

              {lookupHit && !lookup.isPending ? (
                <View style={styles.resultsBlock}>
                  <Text variant="titleSmall" style={styles.resultsTitle}>
                    Patient on this card
                  </Text>

                  <View style={styles.personCard}>
                    <View style={styles.personTop}>
                      <Image
                        source={{ uri: lookupHit.photo }}
                        style={styles.hitPhoto}
                      />
                      <View style={styles.personTextCol}>
                        <Text variant="titleMedium" style={styles.hitName}>
                          {lookupHit.name}
                        </Text>
                        <Text variant="labelSmall" style={styles.hitLabel}>
                          Card number
                        </Text>
                        <Text variant="bodyMedium" style={styles.hitCardNo}>
                          {lookupHit.cardNumber}
                        </Text>
                        {lookupHit.cardType ? (
                          <>
                            <Text variant="labelSmall" style={styles.hitLabel}>
                              Card type
                            </Text>
                            <Text variant="bodyMedium" style={styles.hitCardType}>
                              {lookupHit.cardType} card
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <Button
                      mode="contained"
                      compact
                      onPress={() => onConfirmChoice(lookupHit, null)}
                      style={styles.confirmBelow}
                      contentStyle={styles.confirmBelowContent}>
                      Confirm
                    </Button>
                  </View>

                  {hasLinkedMembers(lookupHit) ? (
                    <>
                      <Text variant="titleSmall" style={styles.membersTitle}>
                        Members on this card ({lookupHit.members!.length})
                      </Text>
                      {lookupHit.members!.map((m, index) => (
                        <View key={`${m.name}-${index}`} style={styles.personCard}>
                          <View style={styles.personTop}>
                            <Image
                              source={{ uri: m.photo }}
                              style={styles.hitPhoto}
                            />
                            <View style={styles.personTextCol}>
                              <Text variant="titleMedium" style={styles.hitName}>
                                {m.name}
                              </Text>
                              <Text variant="labelSmall" style={styles.hitLabel}>
                                Mobile
                              </Text>
                              <Text variant="bodyMedium" style={styles.hitMobile}>
                                {m.mobile}
                              </Text>
                              <Text variant="labelSmall" style={styles.hitLabel}>
                                Card number
                              </Text>
                              <Text variant="bodyMedium" style={styles.hitCardNo}>
                                {lookupHit.cardNumber}
                              </Text>
                              {lookupHit.cardType ? (
                                <>
                                  <Text variant="labelSmall" style={styles.hitLabel}>
                                    Card type
                                  </Text>
                                  <Text
                                    variant="bodyMedium"
                                    style={styles.hitCardType}>
                                    {lookupHit.cardType} card
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>
                          <Button
                            mode="contained"
                            compact
                            onPress={() => onConfirmChoice(lookupHit, index)}
                            style={styles.confirmBelow}
                            contentStyle={styles.confirmBelowContent}>
                            Confirm
                          </Button>
                        </View>
                      ))}
                    </>
                  ) : null}
                </View>
              ) : null}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing.xl * 2 },
  hero: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroKicker: {
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  flowTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  flowSub: {
    ...typography.subtitle,
    color: colors.textMuted,
    lineHeight: 22,
  },
  lookupCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.md,
    color: colors.secondary,
    fontWeight: '700',
  },
  lookupError: { marginTop: spacing.xs },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  row2: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  half: { flex: 1 },
  btnIn: { minHeight: 36, paddingVertical: 4 },
  inlineLoad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineLoadText: { color: colors.textMuted },
  resultsBlock: { marginTop: spacing.lg },
  resultsTitle: {
    ...typography.title,
    fontSize: 15,
    marginBottom: spacing.md,
    color: colors.secondary,
  },
  personCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hitPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_R,
    backgroundColor: colors.border,
  },
  personTextCol: { flex: 1, minWidth: 0 },
  hitName: {
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  hitLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  hitCardNo: {
    color: colors.secondary,
    fontWeight: '600',
  },
  hitCardType: {
    color: colors.secondary,
    fontWeight: '600',
  },
  hitMobile: {
    color: colors.text,
  },
  confirmBelow: {
    alignSelf: 'stretch',
    borderRadius: radii.button,
    marginTop: spacing.xs,
  },
  confirmBelowContent: {
    minHeight: 40,
    paddingVertical: 6,
  },
  membersTitle: {
    ...typography.title,
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.secondary,
  },
  resumeCard: {
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  resumeInner: { gap: spacing.md },
  resumeText: {},
  resumeLabel: { color: colors.primary, marginBottom: 4, fontWeight: '600' },
  resumeName: { color: colors.secondary },
  resumeCardNo: { color: colors.textMuted, marginTop: 4 },
  resumeBtns: { flexDirection: 'column', gap: spacing.sm },
  resumePrimary: { borderRadius: radii.button },
  resumePrimaryContent: { paddingVertical: 10 },
});
