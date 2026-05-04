import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, spacing, typography } from '@/constants';
import { colors } from '@/constants/Colors';
import { useClinicClaimsInfiniteQuery } from '@/hooks/useClinicClaimsInfiniteQuery';
import {
  CLAIM_LIFECYCLE_LABELS,
  normalizeClaimLifecycleStatus,
  type ClaimLifecycleStatus,
  type ClinicClaimListItem,
} from '@/services/claimService';
import { useAuthStore } from '@/store';

function statusCornerStyle(lifecycle: ClaimLifecycleStatus): object {
  switch (lifecycle) {
    case 'approved':
      return {
        backgroundColor: 'rgba(27, 122, 108, 0.22)',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(27, 122, 108, 0.35)',
      };
    case 'rejected':
      return {
        backgroundColor: 'rgba(179, 38, 30, 0.18)',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(179, 38, 30, 0.35)',
      };
    case 'verifying':
      return {
        backgroundColor: 'rgba(46, 189, 180, 0.22)',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(11, 107, 109, 0.28)',
      };
    default:
      return {
        backgroundColor: colors.surfaceVariant,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      };
  }
}

function statusCornerTextStyle(lifecycle: ClaimLifecycleStatus): object {
  switch (lifecycle) {
    case 'approved':
      return { color: colors.success };
    case 'rejected':
      return { color: colors.error };
    case 'verifying':
      return { color: colors.secondary };
    default:
      return { color: colors.textMuted };
  }
}

/** Normalize for matching CLM numbers typed with/without dashes or spaces */
function normalizeClaimSearch(s: string): string {
  return s.toLowerCase().replace(/[\s-]/g, '');
}

function matchesClaimSearch(item: ClinicClaimListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const name = item.patient_name.toLowerCase();
  if (name.includes(q)) return true;

  const numRaw = (item.claim_number || '').toLowerCase();
  if (numRaw.includes(q)) return true;

  const qCompact = normalizeClaimSearch(query);
  if (qCompact.length > 0 && normalizeClaimSearch(item.claim_number || '').includes(qCompact)) {
    return true;
  }

  return false;
}

export default function ClaimStatusScreen() {
  const token = useAuthStore((s) => s.token);
  const [searchQuery, setSearchQuery] = useState('');

  const claimsQuery = useClinicClaimsInfiniteQuery({
    enabled: Boolean(token),
  });

  const rows = useMemo(
    () => claimsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [claimsQuery.data?.pages],
  );

  const filteredRows = useMemo(
    () => rows.filter((item) => matchesClaimSearch(item, searchQuery)),
    [rows, searchQuery],
  );

  const meta = claimsQuery.data?.pages?.[claimsQuery.data.pages.length - 1]?.meta;

  const onRefresh = useCallback(() => {
    void claimsQuery.refetch();
  }, [claimsQuery]);

  const loadMore = useCallback(() => {
    if (claimsQuery.hasNextPage && !claimsQuery.isFetchingNextPage) {
      void claimsQuery.fetchNextPage();
    }
  }, [claimsQuery]);

  function openDetail(item: ClinicClaimListItem) {
    router.push({
      pathname: '/claim-detail',
      params: { id: String(item.id) },
    });
  }

  const listRefreshing =
    claimsQuery.isRefetching && !claimsQuery.isFetchingNextPage;

  const displayClaimNo = useCallback((item: ClinicClaimListItem) => {
    const raw = (item.claim_number ?? '').trim();
    return raw.length > 0 ? raw : `CLM-${item.id}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ClinicClaimListItem }) => {
      const lifecycle = normalizeClaimLifecycleStatus(item.status);
      const clmNo = displayClaimNo(item);
      return (
        <Card style={[styles.rowCard, clinicScreen.card]} mode="elevated">
          <View style={styles.cardClip}>
            <View
              style={[
                styles.statusCorner,
                statusCornerStyle(lifecycle),
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Status ${CLAIM_LIFECYCLE_LABELS[lifecycle]}`}>
              <Text
                style={[
                  styles.statusCornerText,
                  statusCornerTextStyle(lifecycle),
                ]}
                numberOfLines={1}>
                {CLAIM_LIFECYCLE_LABELS[lifecycle]}
              </Text>
            </View>
            <Card.Content style={styles.cardBody}>
              <View style={styles.rowInner}>
                <View style={styles.rowMain}>
                  <View style={styles.clmBlock}>
                    <Text variant="labelMedium" style={styles.clmLabel}>
                      CLM no.
                    </Text>
                    <Text
                      variant="titleMedium"
                      style={styles.clmValue}
                      selectable
                      accessibilityRole="text">
                      {clmNo}
                    </Text>
                  </View>

                  <Text variant="bodyMedium" style={styles.patient}>
                    {item.patient_name}
                    {item.patient_gender ? ` · ${item.patient_gender}` : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    Dr. {item.doctor_name}
                  </Text>
                  <View style={styles.amountRow}>
                    <Text variant="bodySmall" style={styles.muted}>
                      Visited {item.visited_at ?? '—'}
                    </Text>
                    <Text variant="bodySmall" style={styles.amount}>
                      ₹{item.total_claimed}
                      {item.approved_amount !== item.total_claimed ? (
                        <Text style={styles.approvedHint}>
                          {' '}
                          (approved ₹{item.approved_amount})
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                  <Text variant="labelSmall" style={styles.raised}>
                    Raised on {item.raised_on || '—'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openDetail(item)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${clmNo}`}
                  style={({ pressed }) => [
                    styles.eyeBtn,
                    pressed && styles.eyeBtnPressed,
                  ]}>
                  <MaterialCommunityIcons
                    name="eye-outline"
                    size={26}
                    color={colors.secondary}
                  />
                </Pressable>
              </View>
            </Card.Content>
          </View>
        </Card>
      );
    },
    [displayClaimNo],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <TextInput
          mode="outlined"
          placeholder="Search by CLM no. or patient name"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          outlineStyle={styles.searchOutline}
          dense
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery.length > 0 ? (
              <TextInput.Icon
                icon="close"
                onPress={() => setSearchQuery('')}
                forceTextInputFocus={false}
              />
            ) : undefined
          }
        />
        {meta ? (
          <Text variant="bodySmall" style={styles.listMeta}>
            {meta.total === 0
              ? 'No claims yet.'
              : `${meta.total} claim${meta.total === 1 ? '' : 's'} loaded`}
            {searchQuery.trim().length > 0 && rows.length > 0
              ? ` · showing ${filteredRows.length} match${filteredRows.length === 1 ? '' : 'es'}`
              : meta.last_page > 1
                ? ` · page ${meta.current_page} of ${meta.last_page}`
                : ''}
          </Text>
        ) : null}
      </View>
    ),
    [
      searchQuery,
      meta,
      rows.length,
      filteredRows.length,
    ],
  );

  const emptyMessage = useMemo(() => {
    if (claimsQuery.isPending) return null;
    if (claimsQuery.isError) return null;
    if (rows.length === 0) {
      return (
        <Text variant="bodyMedium" style={styles.muted}>
          No claims to show.
        </Text>
      );
    }
    if (filteredRows.length === 0 && searchQuery.trim().length > 0) {
      return (
        <View style={styles.emptySearch}>
          <MaterialCommunityIcons
            name="text-search"
            size={40}
            color={colors.textMuted}
          />
          <Text variant="titleSmall" style={styles.emptySearchTitle}>
            No matching claims
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Try another CLM number or patient name, or clear the search.
          </Text>
          <Button mode="text" onPress={() => setSearchQuery('')} compact>
            Clear search
          </Button>
        </View>
      );
    }
    return null;
  }, [
    claimsQuery.isPending,
    claimsQuery.isError,
    rows.length,
    filteredRows.length,
    searchQuery,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader title="Claim status" />

      {!token ? (
        <View style={[clinicScreen.screenPadding, styles.padTop]}>
          <HelperText type="error" visible>
            Sign in as a clinic user to view claims.
          </HelperText>
        </View>
      ) : null}

      {token ? (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            clinicScreen.screenPadding,
            styles.listContent,
            filteredRows.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            claimsQuery.isPending ? null : claimsQuery.isError ? (
              <Card style={clinicScreen.card} mode="outlined">
                <Card.Content>
                  <Text variant="bodyLarge" style={styles.errorTitle}>
                    Could not load claims
                  </Text>
                  <Text variant="bodyMedium" style={styles.muted}>
                    {claimsQuery.error instanceof Error
                      ? claimsQuery.error.message
                      : 'Pull down to retry.'}
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => void claimsQuery.refetch()}
                    style={[clinicScreen.button, styles.retryBtn]}
                    contentStyle={clinicScreen.buttonContent}>
                    Retry
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              emptyMessage
            )
          }
          ListFooterComponent={
            claimsQuery.isFetchingNextPage ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      ) : null}

      <LoadingOverlay
        visible={Boolean(token) && claimsQuery.isPending && rows.length === 0}
        message="Loading claims…"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padTop: { paddingTop: spacing.sm },
  headerBlock: {
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  searchOutline: {
    borderRadius: 12,
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listMeta: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  rowCard: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardClip: {
    position: 'relative',
    overflow: 'hidden',
  },
  statusCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomRightRadius: 10,
    maxWidth: '52%',
  },
  statusCornerText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardBody: {
    /** Clears the top-left status ribbon */
    paddingTop: spacing.sm + spacing.xs,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  clmBlock: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  clmLabel: {
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  clmValue: {
    fontWeight: '800',
    color: colors.secondary,
    fontSize: 17,
    letterSpacing: 0.4,
    lineHeight: 24,
  },
  patient: {
    fontWeight: '600',
    marginBottom: 2,
  },
  muted: { color: colors.textMuted },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  amount: {
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'right',
    flexShrink: 0,
  },
  approvedHint: {
    fontWeight: '500',
    color: colors.textMuted,
    fontSize: 11,
  },
  raised: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    opacity: 0.9,
  },
  eyeBtn: {
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  eyeBtnPressed: {
    opacity: 0.88,
    backgroundColor: colors.surfaceVariant,
  },
  footerLoader: {
    marginVertical: spacing.lg,
  },
  errorTitle: {
    color: colors.error,
    marginBottom: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.md,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptySearchTitle: {
    marginTop: spacing.sm,
    color: colors.secondary,
    fontWeight: '700',
  },
});
