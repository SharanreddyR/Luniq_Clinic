import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Divider, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radii, spacing } from '@/constants';
import { colors } from '@/constants/Colors';
import { useMemberVisitHistoryInfiniteQuery } from '@/hooks/useMemberVisitHistoryQuery';
import type {
  MemberVisitHistoryDocument,
  MemberVisitHistoryItem,
} from '@/services/visitService';
import { downloadRemoteFile } from '@/utils/downloadRemoteFile';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  personId: number;
  patientName: string;
};

function formatVisitedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '—';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VisitHistoryDocumentRow({
  doc,
}: {
  doc: MemberVisitHistoryDocument;
}) {
  const [downloading, setDownloading] = useState(false);

  async function onDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadRemoteFile(doc.url, doc.file_name);
    } catch (e) {
      const message =
        e instanceof Error ? e.message.trim() : 'Could not download file.';
      Alert.alert('Download failed', message || 'Could not download file.');
    } finally {
      setDownloading(false);
    }
  }

  const label = doc.file_name || 'Document';

  return (
    <View style={styles.documentRow}>
      <MaterialCommunityIcons
        name="file-document-outline"
        size={20}
        color={colors.secondary}
      />
      <Text variant="bodySmall" style={styles.documentName} numberOfLines={2}>
        {label}
      </Text>
      <Button
        mode="outlined"
        compact
        loading={downloading}
        disabled={downloading}
        onPress={() => void onDownload()}
        icon="download"
        style={styles.downloadBtn}
        labelStyle={styles.downloadBtnLabel}
        contentStyle={styles.downloadBtnContent}>
        Download
      </Button>
    </View>
  );
}

function VisitHistoryCard({ item }: { item: MemberVisitHistoryItem }) {
  return (
    <View style={styles.visitCard}>
      <Text variant="titleSmall" style={styles.visitDate}>
        {formatVisitedAt(item.visited_at)}
      </Text>
      <Text variant="bodySmall" style={styles.visitDoctor}>
        {item.doctor.name}
        {item.doctor.specialization ? ` · ${item.doctor.specialization}` : ''}
      </Text>
      {item.clinic.clinic_name ? (
        <Text variant="bodySmall" style={styles.muted}>
          {item.clinic.clinic_name}
        </Text>
      ) : null}

      {item.services.length > 0 ? (
        <View style={styles.servicesBlock}>
          <Text variant="labelSmall" style={styles.servicesHeading}>
            Services
          </Text>
          {item.services.map((svc) => (
            <Text key={svc.id} variant="bodySmall" style={styles.serviceName}>
              {svc.service_name}
              {svc.is_consultation ? ' (consultation)' : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {item.documents.length > 0 ? (
        <View style={styles.documentsBlock}>
          <Text variant="labelSmall" style={styles.servicesHeading}>
            Documents
          </Text>
          {item.documents.map((doc) => (
            <VisitHistoryDocumentRow key={doc.id} doc={doc} />
          ))}
        </View>
      ) : null}

      {item.visit_notes ? (
        <Text variant="bodySmall" style={styles.notes}>
          Notes: {item.visit_notes}
        </Text>
      ) : null}
    </View>
  );
}

export function MemberVisitHistorySheet({
  visible,
  onDismiss,
  personId,
  patientName,
}: Props) {
  const historyQuery = useMemberVisitHistoryInfiniteQuery(personId, {
    enabled: visible,
  });

  const visits = useMemo(
    () => historyQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [historyQuery.data?.pages],
  );

  const total = historyQuery.data?.pages[0]?.meta.total ?? visits.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.headerTitle}>
              Visit history
            </Text>
            <Text variant="bodySmall" style={styles.headerSub} numberOfLines={2}>
              {patientName}
              {total > 0 ? ` · ${total} visit${total === 1 ? '' : 's'}` : ''}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={22}
            onPress={onDismiss}
            accessibilityLabel="Close history"
          />
        </View>
        <Divider />

        {historyQuery.isLoading && visits.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodySmall" style={styles.muted}>
              Loading previous visits…
            </Text>
          </View>
        ) : historyQuery.isError && visits.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={40}
              color={colors.error}
            />
            <Text variant="bodyMedium" style={styles.errorText}>
              {historyQuery.error instanceof Error
                ? historyQuery.error.message
                : 'Could not load history.'}
            </Text>
            <Button
              mode="contained"
              onPress={() => void historyQuery.refetch()}
              buttonColor={colors.secondary}
              style={styles.retryBtn}>
              Retry
            </Button>
          </View>
        ) : (
          <FlatList
            data={visits}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={historyQuery.isRefetching && !historyQuery.isFetchingNextPage}
                onRefresh={() => void historyQuery.refetch()}
                tintColor={colors.primary}
              />
            }
            onEndReached={() => {
              if (
                historyQuery.hasNextPage &&
                !historyQuery.isFetchingNextPage
              ) {
                void historyQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <View style={styles.centered}>
                <MaterialCommunityIcons
                  name="history"
                  size={44}
                  color={colors.textMuted}
                />
                <Text variant="bodyMedium" style={styles.emptyTitle}>
                  No previous visits
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  Submitted visits for this member will appear here.
                </Text>
              </View>
            }
            ListFooterComponent={
              historyQuery.isFetchingNextPage ? (
                <ActivityIndicator
                  style={styles.footerLoader}
                  color={colors.primary}
                />
              ) : null
            }
            renderItem={({ item }) => <VisitHistoryCard item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <View style={styles.footer}>
          <Button mode="outlined" onPress={onDismiss} style={styles.closeBtn}>
            Close
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F0FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '800',
    color: colors.secondary,
  },
  headerSub: {
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 82, 87, 0.1)',
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#0A5257',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  visitDate: {
    color: colors.secondary,
    fontWeight: '800',
  },
  visitDoctor: {
    color: colors.secondaryElevated,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  muted: {
    color: colors.textMuted,
    marginTop: 2,
  },
  servicesBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  documentsBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  servicesHeading: {
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  serviceName: {
    color: colors.secondary,
    marginBottom: 4,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  documentName: {
    flex: 1,
    minWidth: 0,
    color: colors.secondary,
  },
  downloadBtn: {
    borderColor: colors.secondary,
    minWidth: 108,
  },
  downloadBtnLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  downloadBtnContent: {
    height: 32,
  },
  notes: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  separator: {
    height: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.secondary,
    fontWeight: '700',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    borderColor: colors.border,
  },
});
