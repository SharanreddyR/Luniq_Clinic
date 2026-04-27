import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';

import { spacing } from '@/constants';
import { colors } from '@/constants/Colors';

function isImageAsset(asset: DocumentPickerAsset): boolean {
  const mime = asset.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(asset.uri);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (asset: DocumentPickerAsset) => void;
  /**
   * When true, confirming a photo returns to the camera (modal stays open).
   * Use **Done** to close. Shows a thumbnail strip with remove (X) for `stagedAssets`.
   */
  allowMultiple?: boolean;
  stagedAssets?: DocumentPickerAsset[];
  onRemoveStaged?: (index: number) => void;
};

export function ClaimCameraModal({
  visible,
  onClose,
  onCaptured,
  allowMultiple = false,
  stagedAssets = [],
  onRemoveStaged,
}: Props) {
  const ref = useRef<InstanceType<typeof CameraView>>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<DocumentPickerAsset | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setBusy(false);
      setPreviewAsset(null);
    }
  }, [visible]);

  const take = useCallback(async () => {
    const cam = ref.current;
    if (!cam || !cameraReady || busy) return;
    setBusy(true);
    try {
      const pic = await cam.takePictureAsync({ quality: 0.85 });
      if (pic?.uri) {
        setPreviewAsset({
          uri: pic.uri,
          name: `claim-photo-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    } finally {
      setBusy(false);
    }
  }, [cameraReady, busy]);

  function confirmPreview() {
    if (!previewAsset) return;
    onCaptured(previewAsset);
    setPreviewAsset(null);
    if (!allowMultiple) {
      onClose();
    }
  }

  function discardPreview() {
    setPreviewAsset(null);
  }

  function onRequestCloseModal() {
    if (previewAsset) {
      discardPreview();
      return;
    }
    onClose();
  }

  function removeStagedAt(index: number) {
    onRemoveStaged?.(index);
  }

  function renderStagedStrip() {
    if (!allowMultiple || stagedAssets.length === 0) return null;
    return (
      <View style={styles.stripOuter}>
        <Text variant="labelSmall" style={styles.stripLabel}>
          Added ({stagedAssets.length}) — tap X to remove
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripScroll}>
          {stagedAssets.map((a, index) => (
            <View
              key={`${a.uri}-${index}`}
              style={styles.thumbWrap}
              accessibilityLabel={`Attachment ${index + 1}`}>
              {isImageAsset(a) ? (
                <Image
                  source={{ uri: a.uri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbImage, styles.thumbDoc]}>
                  <Text variant="labelSmall" numberOfLines={3} style={styles.thumbDocText}>
                    {a.name ?? 'File'}
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.thumbRemove}
                onPress={() => removeStagedAt(index)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Remove this photo">
                <MaterialCommunityIcons
                  name="close-circle"
                  size={28}
                  color={colors.error}
                />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onRequestCloseModal}>
      <View style={styles.wrap}>
        {!permission?.granted ? (
          <View style={styles.center}>
            <Text variant="bodyLarge" style={styles.centerText}>
              Camera access is required to take a claim photo.
            </Text>
            <Button
              mode="contained"
              onPress={() => void requestPermission()}
              style={styles.btn}>
              Allow camera
            </Button>
            <Button onPress={onClose}>Cancel</Button>
          </View>
        ) : previewAsset ? (
          <>
            {renderStagedStrip()}
            <View style={styles.previewStage}>
              <Text variant="labelLarge" style={styles.previewLabel}>
                Preview
              </Text>
              <Image
                source={{ uri: previewAsset.uri }}
                style={styles.previewImage}
                resizeMode="contain"
                accessibilityLabel="Captured photo preview"
              />
            </View>
            <View style={styles.bar}>
              <Button mode="text" onPress={discardPreview}>
                Retake
              </Button>
              {!allowMultiple ? (
                <Button mode="text" onPress={onClose}>
                  Cancel
                </Button>
              ) : null}
              <Button mode="contained" onPress={confirmPreview}>
                Use photo
              </Button>
              {allowMultiple ? (
                <Button mode="outlined" onPress={onClose}>
                  Done
                </Button>
              ) : null}
            </View>
          </>
        ) : (
          <>
            {renderStagedStrip()}
            <CameraView
              ref={ref}
              style={styles.camera}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            />
            <View style={styles.bar}>
              <Button mode="text" onPress={onClose} disabled={busy}>
                {allowMultiple ? 'Close' : 'Cancel'}
              </Button>
              {allowMultiple ? (
                <Button mode="outlined" onPress={onClose} disabled={busy}>
                  Done
                </Button>
              ) : (
                <View style={styles.barSpacer} />
              )}
              <Button
                mode="contained"
                onPress={() => void take()}
                loading={busy}
                disabled={!cameraReady || busy}>
                Capture
              </Button>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const THUMB = 76;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  camera: {
    flex: 1,
  },
  stripOuter: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stripLabel: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  stripScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    marginRight: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  thumbImage: {
    width: THUMB,
    height: THUMB,
  },
  thumbDoc: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    backgroundColor: colors.surfaceVariant,
  },
  thumbDocText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.text,
  },
  thumbRemove: {
    position: 'absolute',
    top: -2,
    right: -2,
    padding: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  previewStage: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingTop: spacing.md,
  },
  previewLabel: {
    textAlign: 'center',
    color: colors.onPrimary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl + 8,
    backgroundColor: colors.surface,
  },
  barSpacer: {
    flex: 1,
    minWidth: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centerText: {
    textAlign: 'center',
    color: colors.onPrimary,
  },
  btn: {
    marginTop: spacing.sm,
  },
});
