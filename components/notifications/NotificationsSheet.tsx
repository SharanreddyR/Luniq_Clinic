import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Divider,
  IconButton,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clinicScreen, radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInfinite,
} from '@/hooks/useNotifications';
import type { AppNotification } from '@/services/notificationService';
import {
  claimLookupRefFromNotification,
  formatNotificationTime,
} from '@/services/notificationService';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

function notificationIcon(type: string): MciName {
  const t = type.toLowerCase();
  if (t.includes('approved')) return 'check-decagram';
  if (t.includes('reject')) return 'close-circle-outline';
  if (t.includes('review') || t.includes('verif')) return 'text-search';
  if (t.includes('visit')) return 'stethoscope';
  return 'bell-ring-outline';
}

function notificationAccent(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('approved')) return colors.success;
  if (t.includes('reject')) return colors.error;
  if (t.includes('review') || t.includes('verif')) return colors.primary;
  return colors.secondary;
}

export function NotificationsSheet({ visible, onDismiss }: Props) {
  const listQuery = useNotificationsInfinite(20);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const { showError } = useAppToast();

  const items = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [listQuery.data?.pages],
  );

  const unreadTotal = listQuery.data?.pages[0]?.unread_count ?? 0;

  const onRefresh = useCallback(() => {
    void listQuery.refetch();
  }, [listQuery]);

  const onMarkAll = useCallback(() => {
    markAll.mutate(undefined, {
      onError: (e) => {
        showError(e instanceof Error ? e.message : 'Could not mark all read.');
      },
    });
  }, [markAll, showError]);

  const openClaimIfAny = useCallback(
    (n: AppNotification) => {
      const ref = claimLookupRefFromNotification(n);
      if (!ref) return;
      onDismiss();
      router.push(`/claim-status?claimId=${encodeURIComponent(ref)}` as Href);
    },
    [onDismiss],
  );

  const onPressRow = useCallback(
    (n: AppNotification) => {
      if (n.read_at == null) {
        markRead.mutate(n.id, {
          onError: () => {
            /* still allow navigation */
          },
        });
      }
      openClaimIfAny(n);
    },
    [markRead, openClaimIfAny],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const unread = item.read_at == null;
      const accent = notificationAccent(item.type);
      const iconName = notificationIcon(item.type);
      const claimRef = claimLookupRefFromNotification(item);
      return (
        <Pressable
          onPress={() => onPressRow(item)}
          style={({ pressed }) => [
            styles.row,
            unread && styles.rowUnread,
            pressed && styles.rowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.body}`}>
          <View style={[styles.rowIconWrap, { borderColor: accent }]}>
            <MaterialCommunityIcons name={iconName} size={22} color={accent} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTitleRow}>
              <Text
                variant="titleSmall"
                style={[styles.rowTitle, unread && styles.rowTitleUnread]}
                numberOfLines={2}>
                {item.title}
              </Text>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text variant="bodySmall" style={styles.rowBodyText} numberOfLines={3}>
              {item.body}
            </Text>
            <View style={styles.rowMeta}>
              <Text variant="labelSmall" style={styles.rowTime}>
                {formatNotificationTime(item.created_at)}
              </Text>
              {claimRef ? (
                <Text variant="labelSmall" style={styles.rowClaimHint}>
                  Tap for claim status
                </Text>
              ) : null}
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.textMuted}
            style={styles.rowChevron}
          />
        </Pressable>
      );
    },
    [onPressRow],
  );

  const listEmpty =
    !listQuery.isPending && items.length === 0 ? (
      <View style={styles.empty}>
        <MaterialCommunityIcons
          name="bell-off-outline"
          size={48}
          color={colors.textMuted}
        />
        <Text variant="titleSmall" style={styles.emptyTitle}>
          No notifications yet
        </Text>
        <Text variant="bodySmall" style={styles.emptySub}>
          Claim updates and alerts will show up here.
        </Text>
      </View>
    ) : null;

  const listFooter =
    listQuery.isFetchingNextPage ? (
      <View style={styles.footerLoad}>
        <ActivityIndicator color={colors.primary} />
      </View>
    ) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Notifications
            </Text>
            {unreadTotal > 0 ? (
              <Text variant="bodySmall" style={styles.headerSub}>
                {unreadTotal} unread
              </Text>
            ) : (
              <Text variant="bodySmall" style={styles.headerSubMuted}>
                You&apos;re all caught up
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {unreadTotal > 0 ? (
              <Button
                mode="text"
                compact
                onPress={onMarkAll}
                loading={markAll.isPending}
                disabled={markAll.isPending}
                textColor={colors.primary}>
                Mark all read
              </Button>
            ) : null}
            <IconButton
              icon="close"
              size={22}
              onPress={onDismiss}
              accessibilityLabel="Close notifications"
            />
          </View>
        </View>

        <Divider />

        {listQuery.isError ? (
          <View style={styles.errorBox}>
            <Text variant="bodyMedium" style={styles.errorText}>
              {listQuery.error instanceof Error
                ? listQuery.error.message
                : 'Could not load notifications.'}
            </Text>
            <Button mode="contained-tonal" onPress={() => void listQuery.refetch()}>
              Retry
            </Button>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={
              listQuery.isPending ? (
                <View style={styles.centerLoad}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                listEmpty
              )
            }
            ListFooterComponent={listFooter}
            contentContainerStyle={[
              clinicScreen.screenPadding,
              styles.listContent,
              items.length === 0 && styles.listContentEmpty,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={listQuery.isRefetching && !listQuery.isFetchingNextPage}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={() => {
              if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
                void listQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.35}
            ItemSeparatorComponent={() => <Divider style={styles.sep} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, paddingLeft: spacing.sm, minWidth: 0 },
  headerTitle: {
    fontWeight: '700',
    color: colors.secondary,
  },
  headerSub: {
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  headerSubMuted: {
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    flexGrow: 1,
  },
  listContentEmpty: {
    justifyContent: 'center',
  },
  sep: { marginVertical: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowUnread: {
    backgroundColor: 'rgba(46, 189, 180, 0.06)',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  rowPressed: { opacity: 0.92 },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  rowTitle: {
    flex: 1,
    color: colors.secondary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowTitleUnread: { fontWeight: '800' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  rowBodyText: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowTime: { color: colors.textMuted },
  rowClaimHint: {
    color: colors.primary,
    fontWeight: '600',
  },
  rowChevron: { marginTop: spacing.sm },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.secondary,
    fontWeight: '700',
  },
  emptySub: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 22,
  },
  centerLoad: {
    paddingVertical: spacing.xl * 3,
    alignItems: 'center',
  },
  footerLoad: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    textAlign: 'center',
    color: colors.error,
  },
});
