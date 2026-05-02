import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Button,
  Card,
  HelperText,
  IconButton,
  Menu,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { usePatientByCardMutation } from '@/hooks/usePatientByCardMutation';
import { useDoctors } from '@/hooks/useDoctors';
import type { Doctor } from '@/services/doctorService';
import { resolveMemberPhotoUri } from '@/services/patientService';
import {
  fetchClinicVisitServicesCatalog,
  startClinicVisit,
} from '@/services/visitService';
import {
  useIntakeVisitHandoffStore,
  usePatientStore,
} from '@/store';
import type { PatientMember, PatientRecord } from '@/types/patient';
import { getMembershipExpiryInfo } from '@/utils/membershipExpiry';
import { patientRecordForMember } from '@/utils/patientSelection';

const PHOTO_SIZE = 64;
const PHOTO_R = 32;
const CARD_PREFIX = 'LNQ-';

const SUGGESTED_SUFFIXES = ['120045', '778899', '230011'] as const;

function memberDisplayOrder(members: NonNullable<PatientRecord['members']>) {
  return members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => {
      if (a.member.isPrimary && !b.member.isPrimary) return -1;
      if (!a.member.isPrimary && b.member.isPrimary) return 1;
      return a.index - b.index;
    });
}

function patientMemberMetaLine(m: PatientMember): string {
  return (
    [
      m.isPrimary ? 'Primary' : m.relation,
      m.age != null ? `Age ${m.age}` : null,
      m.gender,
    ]
      .filter(Boolean)
      .join(' · ') || 'Member'
  );
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

type DoctorModalContext = {
  base: PatientRecord;
  memberIndex: number | null;
};

export default function PatientIntakeScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const setActivePatient = usePatientStore((s) => s.setActivePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);
  const handoff = useIntakeVisitHandoffStore((s) => s.handoff);
  const setHandoff = useIntakeVisitHandoffStore((s) => s.setHandoff);
  const clearHandoff = useIntakeVisitHandoffStore((s) => s.clearHandoff);

  const doctorsQuery = useDoctors();
  const { showSuccess } = useAppToast();

  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [doctorModalContext, setDoctorModalContext] =
    useState<DoctorModalContext | null>(null);
  const [modalDepartment, setModalDepartment] = useState<string | null>(null);
  const [modalDoctor, setModalDoctor] = useState<Doctor | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [inputSuffix, setInputSuffix] = useState('');
  const [lookupHit, setLookupHit] = useState<PatientRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<{
    name: string;
    photoUri: string;
    meta?: string;
  } | null>(null);
  const inputFocusProps = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    selectionColor: colors.primary,
  } as const;

  const lookup = usePatientByCardMutation();
  const lookupRef = useRef(lookup);
  const scrollRef = useRef<ScrollView | null>(null);
  lookupRef.current = lookup;

  const allDoctors = doctorsQuery.data ?? [];
  const modalDepartments = useMemo(() => {
    const d = new Set(
      allDoctors.map((x) => x.department).filter((s) => s.trim().length > 0),
    );
    return [...d].sort((a, b) => a.localeCompare(b));
  }, [allDoctors]);

  const modalDoctorsInDept = useMemo(() => {
    if (!modalDepartment) return [];
    return allDoctors.filter((doc) => doc.department === modalDepartment);
  }, [allDoctors, modalDepartment]);

  useEffect(() => {
    if (!doctorModalVisible) return;
    if (modalDepartments.length === 0) return;
    setModalDepartment((prev) => prev ?? modalDepartments[0]);
  }, [doctorModalVisible, modalDepartments]);

  useEffect(() => {
    if (!doctorModalVisible || !modalDepartment) return;
    setModalDoctor((doc) => {
      if (doc && modalDoctorsInDept.some((d) => d.id === doc.id)) {
        return doc;
      }
      return (
        modalDoctorsInDept.find((d) => d.available) ??
        modalDoctorsInDept[0] ??
        null
      );
    });
  }, [doctorModalVisible, modalDepartment, modalDoctorsInDept]);

  useEffect(() => {
    if (!lookupHit || lookup.isPending) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
    return () => clearTimeout(id);
  }, [lookupHit, lookup.isPending]);

  useEffect(() => {
    if (!lookupHit) setProfilePreview(null);
  }, [lookupHit]);

  useFocusEffect(
    useCallback(() => {
      const scanned = usePatientStore.getState().consumePendingCardInput();
      if (!scanned) return;
      clearHandoff();
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
    clearHandoff();
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

  function openDoctorChoiceModal(
    base: PatientRecord,
    memberIndex: number | null,
  ) {
    const expiry = getMembershipExpiryInfo(base.expiresAt);
    if (base.isValid === false || expiry.isExpired) return;
    setModalError(null);
    setModalDepartment(null);
    setModalDoctor(null);
    setDoctorModalContext({ base, memberIndex });
    setDoctorModalVisible(true);
  }

  function closeDoctorModal() {
    if (modalSubmitting) return;
    setDoctorModalVisible(false);
    setDoctorModalContext(null);
    setModalError(null);
  }

  async function onModalStartVisit() {
    if (!doctorModalContext || !modalDoctor) return;
    const effective = patientRecordForMember(
      doctorModalContext.base,
      doctorModalContext.memberIndex,
    );
    const hcId = effective.healthCardId;
    if (hcId == null || !Number.isFinite(Number(hcId))) {
      setModalError(
        'This patient record has no health card id — visits cannot be started on the server.',
      );
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      const visitMeta = await startClinicVisit({
        healthCardId: Number(hcId),
        personId: effective.id,
        doctorId: modalDoctor.id,
      });
      const catalog = await fetchClinicVisitServicesCatalog();
      setHandoff({
        visitId: visitMeta.visit_id,
        doctorId: modalDoctor.id,
        doctorName: modalDoctor.name,
        doctorDepartment: modalDoctor.department,
        visitMeta,
        catalog,
      });
      setActivePatient(effective);
      setDoctorModalVisible(false);
      setDoctorModalContext(null);
      setLookupHit(null);
      setLookupError(null);
      lookup.reset();
      showSuccess('Visit started. Tap Next to enter services and documents.');
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Could not start visit.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  function onChangePatient() {
    clearActivePatient();
    clearVisitSession();
    clearHandoff();
    setLookupHit(null);
    setLookupError(null);
    setInputSuffix('');
    lookup.reset();
  }

  function focusCardInput() {
    // Keep the card input visible above the keyboard on smaller screens.
    scrollRef.current?.scrollTo({ y: 90, animated: true });
  }

  const lookupExpiryInfo = useMemo(
    () => (lookupHit ? getMembershipExpiryInfo(lookupHit.expiresAt) : null),
    [lookupHit],
  );

  /** API says inactive or local expiry date is past plan end */
  const cardNotUsable = useMemo(() => {
    if (!lookupHit) return false;
    if (lookupHit.isValid === false) return true;
    if (lookupExpiryInfo?.isExpired) return true;
    return false;
  }, [lookupHit, lookupExpiryInfo]);

  const multiMemberLookup = useMemo(() => {
    const n = lookupHit?.members?.length ?? 0;
    return n > 1;
  }, [lookupHit]);

  const orderedMembers = useMemo(() => {
    if (!lookupHit?.members?.length) return [];
    return memberDisplayOrder(lookupHit.members);
  }, [lookupHit]);

  const { width: windowWidth } = useWindowDimensions();
  const profilePreviewImageSize = Math.min(
    Math.max(windowWidth * 0.72, 168),
    300,
  );

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

          {activePatient && handoff && !lookupHit ? (
            <Card style={[clinicScreen.card, styles.resumeCard]} mode="elevated">
              <Card.Content style={styles.resumeInner}>
                <View style={styles.resumeRow}>
                  <View style={styles.resumeTextCol}>
                    <Text variant="labelSmall" style={styles.resumeLabel}>
                      Step 1 complete · Visit started
                    </Text>
                    <Text variant="titleMedium" style={styles.resumeName}>
                      {activePatient.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.resumeCardNo}>
                      {activePatient.cardNumber}
                    </Text>
                    <Text variant="bodySmall" style={styles.resumeDoctorLine}>
                      Dr. {handoff.doctorName} · {handoff.doctorDepartment}
                    </Text>
                    <Text variant="labelSmall" style={styles.resumeVisitId}>
                      Visit #{handoff.visitId}
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() =>
                      router.push('/patient-intake-visit' as Href)
                    }
                    style={styles.resumeNextBtn}
                    contentStyle={styles.resumeNextBtnContent}
                    compact>
                    Next
                  </Button>
                </View>
                {handoff.visitMeta?.concession &&
                typeof (handoff.visitMeta.concession as { applicable?: unknown })
                  .applicable === 'boolean' &&
                (handoff.visitMeta.concession as { applicable: boolean })
                  .applicable ? (
                  <HelperText type="info" visible style={styles.resumeConcession}>
                    {(handoff.visitMeta.concession as { message?: string })
                      .message ??
                      'Concession may apply for this patient (clinic decision).'}
                  </HelperText>
                ) : null}
                <Button mode="outlined" onPress={onChangePatient}>
                  Start over
                </Button>
              </Card.Content>
            </Card>
          ) : null}

          {activePatient && !handoff && !lookupHit ? (
            <Card style={[clinicScreen.card, styles.resumeHintCard]} mode="elevated">
              <Card.Content>
                <Text variant="bodySmall" style={styles.resumeHintText}>
                  Search for a card above, choose who is visiting, then select a
                  doctor to start the visit. Use Next beside the patient when Step
                  1 is complete.
                </Text>
                <Button mode="outlined" onPress={onChangePatient}>
                  Start over
                </Button>
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
                  <Text style={styles.resultsTitle}>
                    {cardNotUsable ? 'Card found — expired' : 'Patient found'}
                  </Text>

                  {cardNotUsable ? (
                    <View style={styles.expiredBanner} accessibilityRole="alert">
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={22}
                        color="#991B1B"
                      />
                      <Text style={styles.expiredBannerText}>
                        This card is expired or inactive. Continuing with this
                        patient is disabled until the plan is renewed or the card
                        is active again.
                      </Text>
                    </View>
                  ) : null}

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

                    {!multiMemberLookup ? (
                      <View style={styles.matchRow}>
                        <Pressable
                          onPress={() =>
                            setProfilePreview({
                              name: lookupHit.name,
                              photoUri: resolveMemberPhotoUri(
                                undefined,
                                lookupHit.photo,
                              ),
                              meta: [
                                'Member on card',
                                lookupHit.cardType?.trim() || null,
                              ]
                                .filter(Boolean)
                                .join(' · '),
                            })
                          }
                          style={({ pressed }) => [
                            styles.matchAvatarHit,
                            pressed && styles.matchAvatarHitPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`View photo of ${lookupHit.name}`}>
                          <Image
                            source={{ uri: lookupHit.photo }}
                            style={styles.matchAvatar}
                            resizeMode="cover"
                          />
                        </Pressable>
                        <View style={styles.matchDetails}>
                          <HighlightedText
                            text={lookupHit.name}
                            query={inputSuffix}
                            textStyle={styles.matchName}
                            highlightStyle={styles.highlightInline}
                          />
                          <Text style={styles.matchSubtitle}>
                            Member on card
                            {lookupHit.cardType
                              ? ` · ${lookupHit.cardType}`
                              : ''}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.multiMemberHint}>
                        This card has {lookupHit.members!.length} people. Choose
                        who is visiting below.
                      </Text>
                    )}

                    <MembershipExpiryBar
                      planType={lookupHit.planType}
                      expiresAt={lookupHit.expiresAt}
                      omitPlanLabel={Boolean(lookupHit.planType?.trim())}
                    />

                    {!multiMemberLookup && !cardNotUsable ? (
                      <Button
                        mode="contained"
                        onPress={() => openDoctorChoiceModal(lookupHit, null)}
                        style={styles.matchPrimaryBtn}
                        contentStyle={styles.matchPrimaryBtnContent}
                        buttonColor={colors.primary}
                        textColor={colors.onPrimary}>
                        Select doctor
                      </Button>
                    ) : null}
                  </View>

                  {multiMemberLookup ? (
                    <>
                      <Text style={styles.linkedHeading}>Who is visiting?</Text>
                      {orderedMembers.map(({ member: m, index }) => (
                        <View
                          key={`${m.personId ?? m.id}-${index}`}
                          style={styles.linkedSimple}>
                          <Pressable
                            onPress={() =>
                              setProfilePreview({
                                name: m.name,
                                photoUri: resolveMemberPhotoUri(
                                  undefined,
                                  m.photo,
                                ),
                                meta: patientMemberMetaLine(m),
                              })
                            }
                            style={({ pressed }) => [
                              styles.linkedSimpleAvatarHit,
                              pressed && styles.linkedSimpleAvatarHitPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`View photo of ${m.name}`}>
                            <Image
                              source={{ uri: m.photo }}
                              style={styles.linkedSimpleAvatar}
                              resizeMode="cover"
                            />
                          </Pressable>
                          <View style={styles.linkedSimpleBody}>
                            <HighlightedText
                              text={m.name}
                              query={inputSuffix}
                              textStyle={styles.linkedSimpleName}
                              highlightStyle={styles.highlightInline}
                            />
                            <Text style={styles.linkedSimpleMeta}>
                              {[
                                m.isPrimary ? 'Primary' : m.relation,
                                m.age != null ? `Age ${m.age}` : null,
                                m.gender,
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Member'}
                            </Text>
                          </View>
                          {!cardNotUsable ? (
                            <Button
                              mode="outlined"
                              compact
                              onPress={() =>
                                openDoctorChoiceModal(lookupHit, index)
                              }
                              style={styles.linkedSimpleBtn}
                              labelStyle={styles.linkedSimpleBtnLabel}
                              textColor={colors.primary}>
                              Select doctor
                            </Button>
                          ) : (
                            <Text style={styles.linkedBlockedLabel}>
                              Unavailable
                            </Text>
                          )}
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

      <Modal
        visible={profilePreview != null}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setProfilePreview(null)}>
        <View style={styles.profileModalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.profileModalBackdrop}
            onPress={() => setProfilePreview(null)}
            accessibilityLabel="Dismiss profile preview"
          />
          <View style={styles.profileModalCard} pointerEvents="box-none">
            <IconButton
              icon="close"
              size={26}
              iconColor={colors.secondary}
              style={styles.profileModalClose}
              onPress={() => setProfilePreview(null)}
              accessibilityLabel="Close"
            />
            {profilePreview ? (
              <>
                <Image
                  key={profilePreview.photoUri}
                  source={{ uri: profilePreview.photoUri }}
                  style={[
                    styles.profileModalImage,
                    {
                      width: profilePreviewImageSize,
                      height: profilePreviewImageSize,
                    },
                  ]}
                  resizeMode="cover"
                />
                <Text style={styles.profileModalName} numberOfLines={2}>
                  {profilePreview.name}
                </Text>
                {profilePreview.meta ? (
                  <Text
                    style={styles.profileModalMeta}
                    numberOfLines={3}>
                    {profilePreview.meta}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={doctorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDoctorModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.doctorModalRoot}>
          <Pressable
            style={styles.doctorModalBackdrop}
            onPress={closeDoctorModal}
            disabled={modalSubmitting}
            accessibilityLabel="Dismiss"
          />
          <View style={styles.doctorModalSheet} pointerEvents="box-none">
            <View style={styles.doctorModalHeader}>
              <Text variant="titleLarge" style={styles.doctorModalTitle}>
                Select doctor
              </Text>
              <IconButton
                icon="close"
                onPress={closeDoctorModal}
                disabled={modalSubmitting}
                accessibilityLabel="Close"
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.doctorModalScroll}
              showsVerticalScrollIndicator={false}>
              {doctorModalContext ? (
                <Text variant="bodySmall" style={styles.doctorModalPatient}>
                  {patientRecordForMember(
                    doctorModalContext.base,
                    doctorModalContext.memberIndex,
                  ).name}
                </Text>
              ) : null}
              {doctorsQuery.isPending && !doctorsQuery.data ? (
                <View style={styles.doctorModalLoad}>
                  <ActivityIndicator color={colors.primary} />
                  <Text variant="bodySmall" style={styles.mutedLoad}>
                    Loading doctors…
                  </Text>
                </View>
              ) : null}
              {doctorsQuery.isError ? (
                <Text variant="bodySmall" style={styles.doctorModalErr}>
                  Could not load doctors. Try again later.
                </Text>
              ) : null}
              <Text variant="labelLarge" style={styles.doctorFieldLabel}>
                Department
              </Text>
              <Menu
                visible={deptMenuOpen}
                onDismiss={() => setDeptMenuOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setDeptMenuOpen(true)}
                    disabled={
                      modalSubmitting || modalDepartments.length === 0
                    }
                    style={styles.doctorMenuBtn}
                    contentStyle={styles.doctorMenuBtnContent}>
                    {modalDepartment ?? 'Choose department'}
                  </Button>
                }>
                {modalDepartments.map((d) => (
                  <Menu.Item
                    key={d}
                    title={d}
                    onPress={() => {
                      setModalDepartment(d);
                      setDeptMenuOpen(false);
                    }}
                  />
                ))}
              </Menu>
              <Text
                variant="labelLarge"
                style={[styles.doctorFieldLabel, styles.doctorFieldSpacer]}>
                Doctor
              </Text>
              {!modalDepartment ? (
                <HelperText type="info" visible>
                  Select a department to see doctors.
                </HelperText>
              ) : modalDoctorsInDept.length === 0 ? (
                <HelperText type="info" visible>
                  No doctors listed for this department.
                </HelperText>
              ) : (
                <RadioButton.Group
                  value={modalDoctor ? String(modalDoctor.id) : ''}
                  onValueChange={(value) => {
                    const id = Number(value);
                    const next = modalDoctorsInDept.find((doc) => doc.id === id);
                    if (next) setModalDoctor(next);
                  }}>
                  {modalDoctorsInDept.map((d) => (
                    <RadioButton.Item
                      key={d.id}
                      value={String(d.id)}
                      label={`${d.name}${d.available ? '' : ' (off roster)'} · ${d.timing}`}
                      position="leading"
                    />
                  ))}
                </RadioButton.Group>
              )}
              {modalError ? (
                <HelperText type="error" visible style={styles.modalErrText}>
                  {modalError}
                </HelperText>
              ) : null}
            </ScrollView>
            <View style={styles.doctorModalFooter}>
              <Button
                mode="outlined"
                onPress={closeDoctorModal}
                disabled={modalSubmitting}
                style={styles.doctorModalFooterBtn}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => void onModalStartVisit()}
                loading={modalSubmitting}
                disabled={!modalDoctor || modalSubmitting}
                style={styles.doctorModalFooterBtn}>
                Start visit
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.button,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  expiredBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#991B1B',
  },
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
  matchAvatarHit: {
    borderRadius: PHOTO_R,
    overflow: 'hidden',
  },
  matchAvatarHitPressed: { opacity: 0.88 },
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
  multiMemberHint: {
    ...typography.subtitle,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.sm,
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
  linkedSimpleAvatarHit: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  linkedSimpleAvatarHitPressed: { opacity: 0.88 },
  linkedSimpleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  profileModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  profileModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: 'rgba(6, 45, 47, 0.52)',
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 340,
    zIndex: 2,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingTop: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#062d2f',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  profileModalClose: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    margin: 0,
    zIndex: 2,
    backgroundColor: colors.surfaceVariant,
  },
  profileModalImage: {
    alignSelf: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileModalName: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  profileModalMeta: {
    ...typography.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
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
  linkedBlockedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginLeft: spacing.xs,
    alignSelf: 'center',
  },
  highlightInline: {
    backgroundColor: '#ffef99',
    borderRadius: 4,
  },
  doctorModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  doctorModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 45, 47, 0.45)',
  },
  doctorModalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doctorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingTop: spacing.sm,
  },
  doctorModalTitle: { color: colors.secondary, fontWeight: '700' },
  doctorModalScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  doctorModalPatient: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  doctorModalLoad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mutedLoad: { color: colors.textMuted },
  doctorModalErr: { color: '#991B1B', marginBottom: spacing.sm },
  doctorFieldLabel: { marginBottom: spacing.xs, color: colors.secondary },
  doctorFieldSpacer: { marginTop: spacing.md },
  doctorMenuBtn: {
    alignSelf: 'stretch',
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  doctorMenuBtnContent: { justifyContent: 'flex-start' },
  modalErrText: { marginTop: spacing.sm },
  doctorModalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doctorModalFooterBtn: { flex: 1 },
  resumeCard: {
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  resumeInner: { gap: spacing.md },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  resumeTextCol: { flex: 1, minWidth: 0 },
  resumeLabel: { color: colors.primary, marginBottom: 4, fontWeight: '600' },
  resumeName: { color: colors.secondary },
  resumeCardNo: { color: colors.textMuted, marginTop: 4 },
  resumeDoctorLine: {
    color: colors.secondary,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  resumeVisitId: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  resumeNextBtn: { marginTop: spacing.xs },
  resumeNextBtnContent: { minWidth: 88 },
  resumeConcession: { marginTop: 0, marginBottom: spacing.xs },
  resumeHintCard: {
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumeHintText: {
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});
