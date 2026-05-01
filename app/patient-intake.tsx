import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { getMembershipExpiryInfo } from '@/utils/membershipExpiry';
import { patientRecordForMember } from '@/utils/patientSelection';

const PHOTO_SIZE = 64;
const PHOTO_R = 32;
const CARD_PREFIX = 'LNQ-';

const LINKED_CARD: PatientCardType[] = ['Family', 'Couple', 'Child'];
const SUGGESTED_SUFFIXES = ['120045', '778899', '230011'] as const;

function hasLinkedMembers(p: PatientRecord): boolean {
  const n = p.members?.length ?? 0;
  if (n === 0) return false;
  if (!p.cardType) return true;
  return LINKED_CARD.includes(p.cardType);
}

function HighlightedText({
  text,
  query,
  textStyle,
  highlightStyle,
}: {
  text: string;
  query: string;
  textStyle: object;
  highlightStyle: object;
}) {
  const q = query.trim().toLowerCase();
  if (!q) return <Text style={textStyle}>{text}</Text>;
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return <Text style={textStyle}>{text}</Text>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <Text style={textStyle}>
      {before}
      <Text style={highlightStyle}>{match}</Text>
      {after}
    </Text>
  );
}

export default function PatientIntakeScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const setActivePatient = usePatientStore((s) => s.setActivePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);

  const [inputSuffix, setInputSuffix] = useState('');
  const [lookupHit, setLookupHit] = useState<PatientRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const inputFocusProps = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    selectionColor: colors.primary,
  } as const;

  const lookup = usePatientByCardMutation();
  const lookupRef = useRef(lookup);
  const scrollRef = useRef<ScrollView | null>(null);
  lookupRef.current = lookup;

  useEffect(() => {
    if (!lookupHit || lookup.isPending) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
    return () => clearTimeout(id);
  }, [lookupHit, lookup.isPending]);

  useFocusEffect(
    useCallback(() => {
      const scanned = usePatientStore.getState().consumePendingCardInput();
      if (!scanned) return;
      setInputSuffix(normalizeCardSuffix(scanned));
      setLookupHit(null);
      setLookupError(null);
      lookupRef.current.reset();
      lookupRef.current.mutate(normalizeCard(scanned), {
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

  function runLookup(raw: string) {
    const normalized = normalizeCard(raw);
    if (!normalized) return;
    setLookupHit(null);
    setLookupError(null);
    lookup.mutate(normalized, {
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
    setInputSuffix('');
    lookup.reset();
  }

  function focusCardInput() {
    // Keep the card input visible above the keyboard on smaller screens.
    scrollRef.current?.scrollTo({ y: 90, animated: true });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Find patient" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

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
              <Text variant="bodySmall" style={styles.cardSubtitle}>
              Search by LNQ card number or scan barcode for faster patient check-in              </Text>
              <TextInput
                label="Search patient card"
                placeholder="Enter card digits (e.g. 120045)"
                value={inputSuffix}
                onChangeText={(v) => {
                  setInputSuffix(normalizeCardSuffix(v));
                  setLookupHit(null);
                  setLookupError(null);
                  lookup.reset();
                }}
                mode="outlined"
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="number-pad"
                style={styles.input}
                textColor={colors.secondary}
                {...inputFocusProps}
                left={<TextInput.Affix text={CARD_PREFIX} />}
                right={<TextInput.Icon icon="magnify" />}
                onFocus={focusCardInput}
                onSubmitEditing={() => runLookup(inputSuffix)}
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
                  onPress={() => runLookup(inputSuffix)}
                  loading={lookup.isPending}
                  disabled={!inputSuffix.trim() || lookup.isPending}
                  style={styles.half}
                  contentStyle={styles.btnIn}>
                  Search
                </Button>
              </View>
              {lookup.isPending ? (
                <View style={styles.skeletonWrap}>
                  <View style={styles.inlineLoad}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="bodySmall" style={styles.inlineLoadText}>
                      Searching…
                    </Text>
                  </View>
                  <View style={styles.skeletonCard}>
                    <View style={styles.skeletonAvatar} />
                    <View style={styles.skeletonLines}>
                      <View style={[styles.skeletonLine, styles.skeletonLineLg]} />
                      <View style={[styles.skeletonLine, styles.skeletonLineMd]} />
                      <View style={[styles.skeletonLine, styles.skeletonLineSm]} />
                    </View>
                  </View>
                </View>
              ) : null}

              {lookupError ? (
                <HelperText type="error" visible style={styles.lookupError}>
                  {lookupError}
                </HelperText>
              ) : null}

              {lookupHit && !lookup.isPending ? (
                <View style={styles.resultsBlock}>
                  <Text style={styles.resultsTitle}>Patient found</Text>

                  <View style={styles.matchCard}>
                    {lookupHit.status || lookupHit.planType ? (
                      <View style={styles.statusPlanRow}>
                        {lookupHit.status ? (
                          <View
                            style={[
                              styles.statusBadge,
                              lookupHit.isValid
                                ? styles.statusBadgeOk
                                : styles.statusBadgeWarn,
                            ]}>
                            <Text
                              style={[
                                styles.statusBadgeText,
                                lookupHit.isValid
                                  ? styles.statusBadgeTextOk
                                  : styles.statusBadgeTextWarn,
                              ]}>
                              {lookupHit.status}
                            </Text>
                          </View>
                        ) : null}
                        {lookupHit.planType ? (
                          <View style={styles.planBadge}>
                            <Text style={styles.planBadgeLabel}>Plan</Text>
                            <Text style={styles.planBadgeValue}>
                              {lookupHit.planType}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.matchRow}>
                      <Image
                        source={{ uri: lookupHit.photo }}
                        style={styles.matchAvatar}
                        resizeMode="cover"
                      />
                      <View style={styles.matchDetails}>
                        <HighlightedText
                          text={lookupHit.name}
                          query={inputSuffix}
                          textStyle={styles.matchName}
                          highlightStyle={styles.highlightInline}
                        />
                        <Text style={styles.matchSubtitle}>
                          Primary member
                          {lookupHit.cardType
                            ? ` · ${lookupHit.cardType}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <MembershipExpiryBar
                      planType={lookupHit.planType}
                      expiresAt={lookupHit.expiresAt}
                      omitPlanLabel={Boolean(lookupHit.planType?.trim())}
                    />

                    <Button
                      mode="contained"
                      onPress={() => onConfirmChoice(lookupHit, null)}
                      style={styles.matchPrimaryBtn}
                      contentStyle={styles.matchPrimaryBtnContent}
                      buttonColor={colors.primary}
                      textColor={colors.onPrimary}>
                      Continue with this patient
                    </Button>
                  </View>

                  {hasLinkedMembers(lookupHit) ? (
                    <>
                      <Text style={styles.linkedHeading}>
                        Other people on this card
                      </Text>
                      {lookupHit.members!.map((m, index) => (
                        <View key={`${m.name}-${index}`} style={styles.linkedSimple}>
                          <Image
                            source={{ uri: m.photo }}
                            style={styles.linkedSimpleAvatar}
                            resizeMode="cover"
                          />
                          <View style={styles.linkedSimpleBody}>
                            <HighlightedText
                              text={m.name}
                              query={inputSuffix}
                              textStyle={styles.linkedSimpleName}
                              highlightStyle={styles.highlightInline}
                            />
                            <Text style={styles.linkedSimpleMeta}>
                              {[m.relation, m.age != null ? `Age ${m.age}` : null, m.gender]
                                .filter(Boolean)
                                .join(' · ') || 'Member'}
                            </Text>
                          </View>
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => onConfirmChoice(lookupHit, index)}
                            style={styles.linkedSimpleBtn}
                            labelStyle={styles.linkedSimpleBtnLabel}
                            textColor={colors.primary}>
                            Select
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

/** Full-width expiry strip aligned with primary action button height. */
function MembershipExpiryBar({
  planType,
  expiresAt,
  omitPlanLabel = false,
}: {
  planType?: string;
  expiresAt?: string | null;
  omitPlanLabel?: boolean;
}) {
  const info = getMembershipExpiryInfo(expiresAt);
  const highlight = info.isUrgent || info.isExpired;

  let daysPart = '';
  if (info.daysRemaining !== null) {
    if (info.isExpired) {
      const n = Math.abs(info.daysRemaining);
      daysPart = ` · Expired ${n} day${n === 1 ? '' : 's'} ago`;
    } else if (info.daysRemaining === 0) {
      daysPart = ' · Expires today';
    } else {
      daysPart = ` · ${info.daysRemaining} day${
        info.daysRemaining === 1 ? '' : 's'
      } left`;
    }
  }

  const planLabel = planType?.trim() ? planType : 'Plan';
  const lead = omitPlanLabel ? '' : `${planLabel} · `;

  return (
    <View style={[styles.expiryBar, highlight && styles.expiryBarUrgent]}>
      <View style={styles.expiryBarInner}>
        <MaterialCommunityIcons
          name="calendar-outline"
          size={20}
          color={highlight ? '#991B1B' : colors.primary}
        />
        <Text
          variant="bodyMedium"
          style={[styles.expiryBarText, highlight && styles.expiryBarTextUrgent]}
          numberOfLines={2}>
          {lead}Expires {info.displayDate}
          {daysPart}
        </Text>
      </View>
    </View>
  );
}

function normalizeCard(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith(CARD_PREFIX) ? cleaned : `${CARD_PREFIX}${cleaned}`;
}

function normalizeCardSuffix(raw: string): string {
  const full = normalizeCard(raw);
  if (!full) return '';
  return full.slice(CARD_PREFIX.length);
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
    letterSpacing: 0.4,
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
    borderRadius: radii.card + 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.md,
    color: colors.secondary,
    fontWeight: '700',
  },
  lookupError: { marginTop: spacing.xs },
  cardSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  suggestionsBlock: {
    marginBottom: spacing.sm,
  },
  suggestionsTitle: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtersWrap: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.surfaceVariant,
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
  skeletonWrap: {
    marginTop: spacing.sm,
  },
  skeletonCard: {
    marginTop: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonAvatar: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_R,
    backgroundColor: colors.surfaceVariant,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.xs,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceVariant,
  },
  skeletonLineLg: { width: '80%' },
  skeletonLineMd: { width: '60%' },
  skeletonLineSm: { width: '45%' },
  resultsBlock: { marginTop: spacing.lg },
  resultsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#062d2f',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  statusPlanRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    flexShrink: 1,
  },
  statusBadgeOk: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeWarn: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusBadgeTextOk: {
    color: '#166534',
  },
  statusBadgeTextWarn: {
    color: '#92400E',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  matchAvatar: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_R,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchDetails: {
    flex: 1,
    minWidth: 0,
  },
  matchName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    lineHeight: 26,
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 0,
    lineHeight: 20,
  },
  expiryBar: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiryBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  expiryBarUrgent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  expiryBarText: {
    flexShrink: 1,
    textAlign: 'left',
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 20,
  },
  expiryBarTextUrgent: {
    color: '#991B1B',
  },
  matchPrimaryBtn: {
    borderRadius: radii.button,
    marginTop: 0,
  },
  matchPrimaryBtnContent: {
    minHeight: 48,
    paddingVertical: 8,
  },
  linkedHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  linkedSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  linkedSimpleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  linkedSimpleBody: {
    flex: 1,
    minWidth: 0,
  },
  linkedSimpleName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  linkedSimpleMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  linkedSimpleBtn: {
    marginLeft: spacing.xs,
    borderRadius: radii.sm,
    borderColor: colors.primary,
  },
  linkedSimpleBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  highlightInline: {
    backgroundColor: '#ffef99',
    borderRadius: 4,
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
