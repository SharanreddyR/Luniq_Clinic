import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  clinicIcons,
  clinicScreen,
  radii,
  spacing,
  typography,
} from '@/constants';
import { colors } from '@/constants/Colors';
import { useAppToast } from '@/hooks/useAppToast';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import {
  type UploadedFilePreview,
  type UploadCategory,
  buildPreviewRecord,
  pickDocument,
} from '@/services/uploadService';

const SECTIONS: {
  category: UploadCategory;
  sectionTitle: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    category: 'prescription',
    sectionTitle: 'Upload Prescription',
    subtitle: 'PDF or image of a prescription',
    icon: 'pill',
  },
  {
    category: 'report',
    sectionTitle: 'Upload Reports',
    subtitle: 'Lab or imaging reports',
    icon: 'file-document',
  },
  {
    category: 'bill',
    sectionTitle: 'Upload Bills',
    subtitle: 'Invoices and payment documents',
    icon: 'receipt',
  },
];

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

function categoryLabel(c: UploadCategory): string {
  switch (c) {
    case 'prescription':
      return 'Prescription';
    case 'report':
      return 'Reports';
    case 'bill':
      return 'Bills';
    default:
      return c;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function UploadCenterScreen() {
  const [previews, setPreviews] = useState<UploadedFilePreview[]>([]);
  const upload = useUploadDocument();
  const { showSuccess, showError } = useAppToast();

  async function onUpload(category: UploadCategory) {
    const asset = await pickDocument();
    if (!asset) return;

    upload.mutate(
      { category, asset },
      {
        onSuccess: (data, variables) => {
          setPreviews((prev) => [
            buildPreviewRecord(category, variables.asset, data),
            ...prev,
          ]);
          showSuccess(
            data.message ??
              `${data.fileName ?? variables.asset.name ?? 'File'} uploaded`,
          );
        },
        onError: (err) => {
          showError(
            err instanceof Error ? err.message : 'Upload failed',
          );
        },
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Upload center"
          titleStyle={clinicScreen.headerTitle}
        />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
        showsVerticalScrollIndicator={false}>
        <Text variant="bodyMedium" style={styles.intro}>
          Choose a category, pick a file with the document picker, and send it
          via POST /upload. Successful uploads appear in the preview list below
          (stored in local state for this session).
        </Text>

        {SECTIONS.map((row) => {
          const busy =
            upload.isPending && upload.variables?.category === row.category;
          return (
            <View key={row.category} style={styles.sectionBlock}>
              <Text variant="titleMedium" style={styles.sectionHeading}>
                {row.sectionTitle}
              </Text>
              <Card style={[clinicScreen.card, styles.card]} mode="elevated">
                <Card.Content style={styles.row}>
                  <View style={styles.iconWrap}>
                    <MaterialCommunityIcons
                      name={row.icon}
                      size={clinicIcons.size.md}
                      color={clinicIcons.color.primary}
                    />
                  </View>
                  <View style={styles.textCol}>
                    <Text variant="bodySmall" style={styles.cardSub}>
                      {row.subtitle}
                    </Text>
                    <Button
                      mode="contained"
                      onPress={() => onUpload(row.category)}
                      loading={busy}
                      disabled={upload.isPending}
                      style={[clinicScreen.button, styles.btn]}
                      contentStyle={clinicScreen.buttonContent}>
                      Choose file & upload
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </View>
          );
        })}

        <Text variant="titleMedium" style={styles.previewHeading}>
          Preview
        </Text>
        <Text variant="bodySmall" style={styles.previewSub}>
          Files uploaded in this session (newest first).
        </Text>

        {previews.length === 0 ? (
          <Card style={[clinicScreen.card, styles.card]} mode="outlined">
            <Card.Content style={styles.previewEmpty}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={clinicIcons.size.lg}
                color={clinicIcons.color.muted}
              />
              <Text variant="bodyMedium" style={styles.previewEmptyText}>
                No uploads yet. Use a section above to add a document.
              </Text>
            </Card.Content>
          </Card>
        ) : (
          previews.map((p) => (
            <Card
              key={p.localId}
              style={[clinicScreen.card, styles.previewCard]}
              mode="elevated">
              <Card.Content>
                <View style={styles.previewTop}>
                  <View style={styles.previewIcon}>
                    <MaterialCommunityIcons
                      name="file-check-outline"
                      size={clinicIcons.size.md}
                      color={clinicIcons.color.primary}
                    />
                  </View>
                  <View style={styles.previewMain}>
                    <Text variant="titleSmall" style={styles.previewName} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Chip
                      compact
                      mode="flat"
                      style={styles.categoryChip}
                      textStyle={styles.categoryChipText}>
                      {categoryLabel(p.category)}
                    </Chip>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.previewMeta}>
                  <Text variant="bodySmall" style={styles.metaLine}>
                    Size: {formatBytes(p.size)}
                  </Text>
                  {p.mimeType ? (
                    <Text variant="bodySmall" style={styles.metaLine}>
                      Type: {p.mimeType}
                    </Text>
                  ) : null}
                  <Text variant="bodySmall" style={styles.metaLine}>
                    Server id: {String(p.serverId)}
                  </Text>
                  <Text variant="bodySmall" style={styles.metaLine}>
                    {formatTime(p.uploadedAt)}
                  </Text>
                  {p.message ? (
                    <Text variant="bodySmall" style={styles.metaMsg}>
                      {p.message}
                    </Text>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <LoadingOverlay
        visible={upload.isPending}
        message="Uploading file…"
      />
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
  scroll: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  intro: {
    ...typography.subtitle,
    marginBottom: spacing.xl,
  },
  sectionBlock: {
    marginBottom: spacing.lg + spacing.xs,
  },
  sectionHeading: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  card: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: clinicIcons.textGap,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  cardSub: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  btn: {
    alignSelf: 'stretch',
  },
  previewHeading: {
    ...typography.title,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewSub: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  previewEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  previewEmptyText: {
    ...typography.subtitle,
    textAlign: 'center',
    maxWidth: 300,
  },
  previewCard: {
    marginBottom: spacing.md,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMain: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  previewName: {
    ...typography.title,
    fontSize: 17,
    fontWeight: '600',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
  },
  categoryChipText: {
    color: colors.secondaryElevated,
    fontSize: 12.5,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.border,
  },
  previewMeta: {
    gap: spacing.xs / 2,
  },
  metaLine: {
    ...typography.small,
  },
  metaMsg: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: spacing.xs / 2,
    fontStyle: 'italic',
  },
});
