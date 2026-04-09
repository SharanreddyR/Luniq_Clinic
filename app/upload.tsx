import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Snackbar,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import {
  type UploadCategory,
  pickDocument,
} from '@/services/uploadService';

const SECTIONS: {
  category: UploadCategory;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    category: 'prescription',
    title: 'Prescription',
    subtitle: 'PDF or image of a prescription',
    icon: 'pill',
  },
  {
    category: 'report',
    title: 'Reports',
    subtitle: 'Lab or imaging reports',
    icon: 'file-document-outline',
  },
  {
    category: 'bill',
    title: 'Bills',
    subtitle: 'Invoices and payment documents',
    icon: 'receipt',
  },
];

export default function UploadScreen() {
  const [snack, setSnack] = useState('');
  const upload = useUploadDocument();

  async function onUpload(category: UploadCategory) {
    const asset = await pickDocument();
    if (!asset) return;

    upload.mutate(
      { category, asset },
      {
        onSuccess: (data) => {
          setSnack(
            data.message ??
              `${data.fileName ?? 'File'} uploaded successfully`,
          );
        },
        onError: (err) => {
          setSnack(
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
        <Appbar.Content title="Uploads" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text variant="bodyMedium" style={styles.intro}>
          Pick a category, choose a file from your device, and upload it to the
          clinic.
        </Text>

        {SECTIONS.map((row) => {
          const busy =
            upload.isPending && upload.variables?.category === row.category;
          return (
            <Card key={row.category} style={styles.card} mode="elevated">
              <Card.Content style={styles.row}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.textCol}>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {row.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.cardSub}>
                    {row.subtitle}
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => onUpload(row.category)}
                    loading={busy}
                    disabled={upload.isPending}
                    style={styles.btn}
                    contentStyle={styles.btnContent}>
                    Choose file & upload
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <Snackbar
        visible={snack.length > 0}
        onDismiss={() => setSnack('')}
        duration={4000}
        style={styles.snack}>
        {snack}
      </Snackbar>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  intro: {
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 22,
  },
  card: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  cardSub: {
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  btn: {
    alignSelf: 'stretch',
    borderRadius: 8,
  },
  btnContent: {
    paddingVertical: 4,
  },
  snack: {
    marginBottom: 24,
  },
});
