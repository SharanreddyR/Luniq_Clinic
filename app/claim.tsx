import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/Colors';
import { useClaimStatus } from '@/hooks/useClaimStatus';
import { useSubmitClaim } from '@/hooks/useSubmitClaim';
import { CLAIM_VERIFICATION_TAT } from '@/services/claimService';

export default function ClaimScreen() {
  const [description, setDescription] = useState('');
  const [policyReference, setPolicyReference] = useState('');
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);

  const submit = useSubmitClaim();
  const statusQuery = useClaimStatus(activeClaimId);

  const onRefresh = useCallback(() => {
    void statusQuery.refetch();
  }, [statusQuery]);

  function onSubmit() {
    submit.mutate(
      {
        description: description.trim(),
        policyReference: policyReference.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setActiveClaimId(data.claimId);
        },
      },
    );
  }

  const canSubmit =
    description.trim().length > 0 && !submit.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Appbar.Header mode="center-aligned" style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Claims" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={statusQuery.isFetching}
              onRefresh={onRefresh}
              enabled={activeClaimId != null}
              tintColor={colors.primary}
            />
          }>
          <Card style={[styles.card, styles.tatCard]} mode="elevated">
            <Card.Content>
              <Text variant="labelLarge" style={styles.tatLabel}>
                Turnaround (TAT)
              </Text>
              <Text variant="titleMedium" style={styles.tatText}>
                {CLAIM_VERIFICATION_TAT}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Submit claim
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                Describe what you are claiming. Add a policy reference if you
                have one.
              </Text>
              <TextInput
                label="Claim description"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
              <TextInput
                label="Policy / reference (optional)"
                value={policyReference}
                onChangeText={setPolicyReference}
                mode="outlined"
                style={styles.input}
              />
              {submit.isError && (
                <HelperText type="error" visible>
                  {submit.error instanceof Error
                    ? submit.error.message
                    : 'Could not submit'}
                </HelperText>
              )}
              <Button
                mode="contained"
                onPress={onSubmit}
                loading={submit.isPending}
                disabled={!canSubmit}
                style={styles.submitBtn}
                contentStyle={styles.submitBtnContent}>
                Submit claim
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.statusHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Claim status
                </Text>
                {activeClaimId != null && (
                  <Button
                    mode="text"
                    compact
                    onPress={onRefresh}
                    loading={statusQuery.isFetching}
                    disabled={statusQuery.isFetching}>
                    Refresh
                  </Button>
                )}
              </View>
              {activeClaimId == null ? (
                <Text variant="bodyMedium" style={styles.placeholder}>
                  Submit a claim to see live status. Pull down to refresh after
                  submitting.
                </Text>
              ) : statusQuery.isPending ? (
                <Text variant="bodyMedium" style={styles.muted}>
                  Loading status…
                </Text>
              ) : (
                <>
                  <Text variant="labelSmall" style={styles.idLabel}>
                    Claim ID
                  </Text>
                  <Text variant="bodyLarge" style={styles.claimId}>
                    {activeClaimId}
                  </Text>
                  <View style={styles.chipRow}>
                    <Chip
                      mode="flat"
                      style={styles.chip}
                      textStyle={styles.chipText}>
                      {statusQuery.data?.status ?? '—'}
                    </Chip>
                  </View>
                  {statusQuery.data?.message ? (
                    <Text variant="bodyMedium" style={styles.statusMsg}>
                      {statusQuery.data.message}
                    </Text>
                  ) : null}
                </>
              )}
            </Card.Content>
          </Card>
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
  headerTitle: {
    color: colors.secondary,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  tatCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tatLabel: {
    color: colors.textMuted,
    marginBottom: 6,
  },
  tatText: {
    color: colors.secondary,
    fontWeight: '600',
    lineHeight: 26,
  },
  cardTitle: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  muted: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    marginTop: 4,
    borderRadius: 8,
  },
  submitBtnContent: {
    paddingVertical: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  placeholder: {
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: 4,
  },
  idLabel: {
    color: colors.textMuted,
    marginTop: 8,
  },
  claimId: {
    color: colors.secondary,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.surfaceVariant,
  },
  chipText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  statusMsg: {
    color: colors.text,
    lineHeight: 22,
  },
});
