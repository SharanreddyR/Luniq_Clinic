import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { clinicScreen, radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import {
  CLINIC_OPEN_VISITS_PAGE_SIZE,
  CLINIC_OPEN_VISITS_QUERY_KEY,
  useClinicOpenVisitsInfiniteQuery,
} from '@/hooks/useClinicOpenVisitsQuery';
import { fetchPatientByCardNumber } from '@/services/patientService';
import {
  fetchClinicVisitServicesCatalog,
  type ClinicOpenVisitRow,
} from '@/services/visitService';
import { useAuthStore, useIntakeVisitHandoffStore, usePatientStore } from '@/store';
import type { PatientRecord } from '@/types/patient';

const OPEN_AVATAR = 52;
const OPEN_AVATAR_R = 26;

/** Max extra API pages to fetch automatically while searching (frontend-only). */
const SEARCH_AUTO_FETCH_MAX_PAGES = 8;

/** Normalize for client-side card matching (ignore spaces and hyphens). */
function normalizeCardToken(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
}

function openVisitMatchesCardFilter(
  row: ClinicOpenVisitRow,
  filterRaw: string,
): boolean {
  const q = normalizeCardToken(filterRaw.trim());
  if (!q) return true;
  const card = normalizeCardToken(row.card_number);
  return card.includes(q);
}

function formatOpenVisitStartedAt(raw: string): string {
  if (!raw.trim()) return '—';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function genderLabel(g: string): string {
  const t = g.trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function OpenVisitAvatar({
  uri,
  name,
}: {
  uri: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !uri) {
    return (
      <View style={[styles.openAvatar, styles.openAvatarPlaceholder]}>
        <MaterialCommunityIcons
          name="account"
          size={26}
          color={colors.textMuted}
          accessibilityLabel={name ? `Avatar placeholder for ${name}` : 'Avatar'}
        />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.openAvatar}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
      onError={() => setFailed(true)}
    />
  );
}

export default function ViewPatientsScreen() {
  const { showError } = useAppToast();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const openVisitsQuery = useClinicOpenVisitsInfiniteQuery({
    enabled: Boolean(token),
  });

  const [continuingVisitId, setContinuingVisitId] = useState<number | null>(
    null,
  );
  const [cardFilter, setCardFilter] = useState('');
  /** How many loaded API pages to reveal when not filtering (1 = first 10 only). */
  const [maxPagesToShow, setMaxPagesToShow] = useState(1);
  const searchAutoFetchCount = useRef(0);

  const pages = openVisitsQuery.data?.pages ?? [];

  const allLoadedRows = useMemo(
    () => pages.flatMap((p) => p.data),
    [pages],
  );

  const windowRows = useMemo(() => {
    const n = Math.min(maxPagesToShow, Math.max(pages.length, 1));
    return pages.slice(0, n).flatMap((p) => p.data);
  }, [pages, maxPagesToShow]);

  const filteredLoadedRows = useMemo(
    () =>
      allLoadedRows.filter((row) =>
        openVisitMatchesCardFilter(row, cardFilter),
      ),
    [allLoadedRows, cardFilter],
  );

  const cardFilterTrimmed = cardFilter.trim().length > 0;
  const displayRows = cardFilterTrimmed ? filteredLoadedRows : windowRows;

  const openVisitsTotal = openVisitsQuery.data?.pages[0]?.meta.total ?? 0;

  useEffect(() => {
    setMaxPagesToShow((m) =>
      Math.min(m, Math.max(1, pages.length || 1)),
    );
  }, [pages.length]);

  useEffect(() => {
    if (!cardFilterTrimmed) searchAutoFetchCount.current = 0;
  }, [cardFilterTrimmed]);

  useEffect(() => {
    if (!cardFilterTrimmed) return;
    const hasMatch = allLoadedRows.some((row) =>
      openVisitMatchesCardFilter(row, cardFilter),
    );
    if (hasMatch || !openVisitsQuery.hasNextPage) return;
    if (searchAutoFetchCount.current >= SEARCH_AUTO_FETCH_MAX_PAGES) return;
    if (openVisitsQuery.isFetchingNextPage) return;

    const t = setTimeout(() => {
      searchAutoFetchCount.current += 1;
      void openVisitsQuery.fetchNextPage();
    }, 450);
    return () => clearTimeout(t);
  }, [
    cardFilterTrimmed,
    cardFilter,
    allLoadedRows,
    openVisitsQuery.hasNextPage,
    openVisitsQuery.isFetchingNextPage,
    openVisitsQuery.fetchNextPage,
  ]);

  const loadMoreOpenVisits = useCallback(async () => {
    if (openVisitsQuery.isFetchingNextPage) return;
    if (maxPagesToShow < pages.length) {
      setMaxPagesToShow((m) => m + 1);
      return;
    }
    if (openVisitsQuery.hasNextPage) {
      await openVisitsQuery.fetchNextPage();
      setMaxPagesToShow((m) => m + 1);
    }
  }, [
    openVisitsQuery,
    maxPagesToShow,
    pages.length,
  ]);

  const showLoadMore =
    maxPagesToShow < pages.length || openVisitsQuery.hasNextPage;

  const inputFocusProps = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    selectionColor: colors.primary,
  } as const;

  async function continueOpenVisit(row: ClinicOpenVisitRow) {
    setContinuingVisitId(row.visit_id);
    try {
      const record = await fetchPatientByCardNumber(row.card_number);
      const photo =
        row.patient.photo_url && row.patient.photo_url.length > 0
          ? row.patient.photo_url
          : record.photo;
      const active: PatientRecord = {
        ...record,
        id: row.patient.id,
        name: row.patient.name,
        photo,
      };
      const catalog = await fetchClinicVisitServicesCatalog();
      useIntakeVisitHandoffStore.getState().setHandoff({
        visitId: row.visit_id,
        doctorId: row.doctor.id,
        doctorName: row.doctor.name,
        doctorDepartment:
          row.doctor.specialization?.trim() || 'General',
        visitMeta: null,
        catalog,
      });
      usePatientStore.getState().setActivePatient(active);
      router.push('/patient-intake-visit' as Href);
    } catch (e) {
      showError(
        e instanceof Error ? e.message : 'Could not continue this visit.',
      );
    } finally {
      setContinuingVisitId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="View patients" />
      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              openVisitsQuery.isRefetching && !openVisitsQuery.isFetchingNextPage
            }
            onRefresh={async () => {
              searchAutoFetchCount.current = 0;
              setMaxPagesToShow(1);
              await queryClient.resetQueries({
                queryKey: [
                  ...CLINIC_OPEN_VISITS_QUERY_KEY,
                  CLINIC_OPEN_VISITS_PAGE_SIZE,
                ],
              });
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <Text variant="titleMedium" style={styles.openSectionTitle}>
          Open visits
        </Text>

        {openVisitsQuery.isPending && !openVisitsQuery.data ? (
          <View style={styles.openLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodySmall" style={styles.openLoadingText}>
              Loading visits…
            </Text>
          </View>
        ) : openVisitsQuery.isError ? (
          <Card style={[clinicScreen.card, styles.openErrorCard]} mode="outlined">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.openErrorText}>
                {openVisitsQuery.error instanceof Error
                  ? openVisitsQuery.error.message
                  : 'Could not load open visits.'}
              </Text>
              <Button
                mode="outlined"
                onPress={() => void openVisitsQuery.refetch()}
                style={styles.openRetryBtn}>
                Retry
              </Button>
            </Card.Content>
          </Card>
        ) : allLoadedRows.length === 0 ? (
          <Card style={[clinicScreen.card, styles.openEmptyCard]} mode="outlined">
            <Card.Content style={styles.openEmptyInner}>
              <MaterialCommunityIcons
                name="clipboard-text-clock-outline"
                size={36}
                color={colors.textMuted}
              />
              <Text variant="bodyMedium" style={styles.openEmptyTitle}>
                No open visits
              </Text>
              <Text variant="bodySmall" style={styles.openEmptySub}>
                Open visits appear here after a visit is started for a patient.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.openList}>
            <Card style={[clinicScreen.card, styles.searchCard]} mode="outlined">
              <Card.Content style={styles.searchCardContent}>
                <Text variant="titleSmall" style={styles.searchCardTitle}>
                  Filter by card number
                </Text>
                <TextInput
                  label="Card number"
                  placeholder="e.g. LNQ-0000007 or digits only"
                  value={cardFilter}
                  onChangeText={setCardFilter}
                  mode="outlined"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.searchInput}
                  textColor={colors.secondary}
                  {...inputFocusProps}
                  right={
                    cardFilterTrimmed ? (
                      <TextInput.Icon
                        icon="close-circle"
                        onPress={() => setCardFilter('')}
                        accessibilityLabel="Clear card filter"
                      />
                    ) : (
                      <TextInput.Icon icon="card-account-details-outline" />
                    )
                  }
                />
                {cardFilterTrimmed ? (
                  <View style={styles.searchResultRow}>
                    <Text variant="bodySmall" style={styles.searchResultLine}>
                      {filteredLoadedRows.length} visit
                      {filteredLoadedRows.length === 1 ? '' : 'es'} match (
                      {allLoadedRows.length} loaded).
                    </Text>
                    {openVisitsQuery.isFetchingNextPage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : null}
                  </View>
                ) : null}
              </Card.Content>
            </Card>

            {cardFilterTrimmed && displayRows.length === 0 ? (
              <Card
                style={[clinicScreen.card, styles.filterEmptyCard]}
                mode="outlined">
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.filterEmptyTitle}>
                    No matching visits
                  </Text>
                  <Text variant="bodySmall" style={styles.filterEmptySub}>
                    {openVisitsQuery.hasNextPage
                      ? 'Still loading more visits — wait a moment, tap Load more, or adjust the card number.'
                      : 'No open visit on file matches this card. Clear the filter or check the number.'}
                  </Text>
                </Card.Content>
              </Card>
            ) : null}

            {displayRows.map((row) => {
              const g = genderLabel(row.patient.gender);
              const busy = continuingVisitId === row.visit_id;
              return (
                <Card
                  key={row.visit_id}
                  style={[clinicScreen.card, styles.openVisitCard]}
                  mode="elevated">
                  <Card.Content style={styles.openVisitCardInner}>
                    <View style={styles.openVisitTop}>
                      <OpenVisitAvatar
                        uri={row.patient.photo_url}
                        name={row.patient.name}
                      />
                      <View style={styles.openVisitMain}>
                        <Text
                          variant="titleSmall"
                          style={styles.openPatientName}
                          numberOfLines={1}>
                          {row.patient.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={styles.openMetaLine}
                          numberOfLines={1}>
                          {[g, row.card_number].filter(Boolean).join(' · ')}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={styles.openMetaLine}
                          numberOfLines={2}>
                          <Text style={styles.openMetaStrong}>Doctor: </Text>
                          {row.doctor.name}
                          {row.doctor.specialization
                            ? ` · ${row.doctor.specialization}`
                            : ''}
                        </Text>
                        <View style={styles.openFooterRow}>
                          <Text variant="labelSmall" style={styles.openTime}>
                            {formatOpenVisitStartedAt(row.started_at)}
                          </Text>
                          <View style={styles.openDocBadge}>
                            <MaterialCommunityIcons
                              name="file-document-outline"
                              size={14}
                              color={colors.primary}
                            />
                            <Text variant="labelSmall" style={styles.openDocText}>
                              {row.documents_uploaded} doc
                              {row.documents_uploaded === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Button
                      mode="contained"
                      onPress={() => continueOpenVisit(row)}
                      loading={busy}
                      disabled={continuingVisitId != null}
                      style={styles.openNextBtn}
                      contentStyle={styles.openNextBtnContent}
                      buttonColor={colors.primary}
                      textColor={colors.onPrimary}>
                      Next
                    </Button>
                  </Card.Content>
                </Card>
              );
            })}
            {showLoadMore ? (
              <Button
                mode="outlined"
                onPress={() => void loadMoreOpenVisits()}
                loading={openVisitsQuery.isFetchingNextPage}
                disabled={openVisitsQuery.isFetchingNextPage}
                style={styles.loadMoreBtn}
                contentStyle={styles.loadMoreBtnContent}>
                Load more
              </Button>
            ) : !cardFilterTrimmed &&
              openVisitsTotal > CLINIC_OPEN_VISITS_PAGE_SIZE ? (
              <Text variant="bodySmall" style={styles.endOfListHint}>
                All {openVisitsTotal} open visits loaded.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl * 2 },
  introBold: { fontWeight: '700', color: colors.secondary },
  openSectionTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  openSectionSub: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  openLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  openLoadingText: { color: colors.textMuted },
  openErrorCard: {
    marginBottom: spacing.lg,
    borderColor: colors.border,
  },
  openErrorText: { color: colors.secondary, marginBottom: spacing.sm },
  openRetryBtn: { alignSelf: 'flex-start' },
  openEmptyCard: {
    marginBottom: spacing.lg,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  openEmptyInner: { alignItems: 'center', paddingVertical: spacing.sm },
  openEmptyTitle: {
    marginTop: spacing.sm,
    fontWeight: '700',
    color: colors.secondary,
  },
  openEmptySub: {
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 20,
  },
  openList: { gap: spacing.md, marginBottom: spacing.xl },
  searchCard: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  searchCardContent: { paddingBottom: spacing.sm },
  searchCardTitle: {
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  searchCardHint: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  searchResultLine: {
    flex: 1,
    color: colors.textMuted,
  },
  filterEmptyCard: {
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  filterEmptyTitle: {
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  filterEmptySub: { color: colors.textMuted, lineHeight: 20 },
  openVisitCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card + 2,
  },
  openVisitCardInner: { paddingVertical: spacing.xs },
  openVisitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  openAvatar: {
    width: OPEN_AVATAR,
    height: OPEN_AVATAR,
    borderRadius: OPEN_AVATAR_R,
    backgroundColor: colors.surfaceVariant,
  },
  openAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  openVisitMain: { flex: 1, minWidth: 0 },
  openPatientName: {
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 2,
  },
  openMetaLine: { color: colors.textMuted, marginTop: 2 },
  openMetaStrong: { fontWeight: '700', color: colors.secondary },
  openFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  openTime: { color: colors.textMuted, flex: 1 },
  openDocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceVariant,
  },
  openDocText: { color: colors.secondary, fontWeight: '600' },
  openNextBtn: { borderRadius: radii.button },
  openNextBtnContent: { paddingVertical: 4 },
  loadMoreBtn: {
    marginTop: spacing.sm,
    borderRadius: radii.button,
    borderColor: colors.border,
  },
  loadMoreBtnContent: { paddingVertical: 4 },
  endOfListHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
