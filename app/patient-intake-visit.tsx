import type { DocumentPickerAsset } from 'expo-document-picker';
import { Redirect, router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Chip,
  HelperText,
  IconButton,
  List,
  Menu,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClaimCameraModal } from '@/components/ClaimCameraModal';
import { MemberVisitHistorySheet } from '@/components/patient/MemberVisitHistorySheet';
import { CompactScreenHeader } from '@/components/ui/CompactScreenHeader';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { clinicScreen, radii, spacing, typography } from '@/constants';
import { USE_MOCK_CLINIC_SERVICES_WHEN_EMPTY } from '@/constants/config';
import { colors } from '@/constants/Colors';
import { MOCK_CLINIC_VISIT_CATALOG } from '@/constants/mockClinicVisitCatalog';
import { VISIT_ENTIRE_BILL_UPLOAD } from '@/constants/intakeUploads';
import { DEFAULT_VISIT_SERVICES } from '@/constants/visitServices';
import { useAppToast } from '@/hooks/useAppToast';
import { useDoctors } from '@/hooks/useDoctors';
import { useUploadDocument } from '@/hooks/useUploadDocument';
import { pickDocument, type UploadCategory } from '@/services/uploadService';
import type { Doctor } from '@/services/doctorService';
import {
  buildSubmitLinesFromCatalog,
  fetchClinicVisitServicesCatalog,
  isConsultationCatalogItem,
  selectionKeysToServiceLabels,
  startClinicVisit,
  submitClinicVisit,
  uploadClinicVisitDocument,
  type ClinicVisitCatalogItem,
  type StartVisitResponse,
  type VisitDocumentType,
} from '@/services/visitService';
import { printVisitSummaryPdf } from '@/services/visitSummaryPdf';
import {
  useAuthStore,
  useIntakeVisitHandoffStore,
  usePatientStore,
  useVisitHistoryStore,
} from '@/store';
import type { VisitAttachmentCategory } from '@/types/visitHistory';

function isImageLikeAsset(asset: DocumentPickerAsset | null): boolean {
  if (!asset?.uri) return false;
  const mime = asset.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(asset.uri);
}

function mapIntakeCategoryToVisitDocumentType(
  category: UploadCategory,
): VisitDocumentType {
  if (category === 'bill') return 'invoice';
  return category;
}

function isConsultationServiceKey(
  key: string,
  catalog: ClinicVisitCatalogItem[],
): boolean {
  if (key.startsWith('l:')) {
    return key.slice(2) === 'Consultation';
  }
  if (key.startsWith('c:')) {
    const id = Number(key.slice(2));
    const row = catalog.find((s) => s.id === id);
    return row ? isConsultationCatalogItem(row) : false;
  }
  return false;
}

type AttachmentCameraTarget =
  | { kind: 'bill' }
  | { kind: 'service'; serviceKey: string };

/** Compact optional file attach on each selected service row (amount + photo/document). */
function ServiceLineAttachment({
  assets,
  onPickDocument,
  onPickPhoto,
  onRemoveAt,
  disabled,
  showCamera,
}: {
  assets: DocumentPickerAsset[];
  onPickDocument: () => void;
  onPickPhoto: () => void;
  onRemoveAt: (index: number) => void;
  disabled: boolean;
  showCamera: boolean;
}) {
  const count = assets.length;
  return (
    <View style={styles.serviceAttachBlock}>
      <Text variant="bodySmall" style={styles.serviceAttachHint}>
        Photo or document (optional)
      </Text>
      <View style={styles.serviceAttachActions}>
        <Button
          mode="outlined"
          icon="folder-open"
          onPress={onPickDocument}
          disabled={disabled}
          compact
          style={styles.serviceAttachBtn}
          contentStyle={clinicScreen.buttonContentCompact}>
          Choose file
        </Button>
        {showCamera ? (
          <Button
            mode="outlined"
            icon="camera"
            onPress={onPickPhoto}
            disabled={disabled}
            compact
            style={styles.serviceAttachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Capture
          </Button>
        ) : null}
      </View>
      {count > 0 ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          style={styles.serviceAttachThumbStrip}
          contentContainerStyle={styles.serviceAttachThumbScroll}>
          {assets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.serviceAttachThumbWrap}>
              {isImageLikeAsset(asset) ? (
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.serviceAttachThumbImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.serviceAttachThumbImage, styles.attachThumbDoc]}>
                  <Text variant="labelSmall" numberOfLines={2} style={styles.attachThumbDocText}>
                    {asset.name ?? 'File'}
                  </Text>
                </View>
              )}
              <IconButton
                icon="close-circle"
                size={20}
                iconColor={colors.error}
                style={styles.serviceAttachThumbRemove}
                onPress={() => onRemoveAt(index)}
                accessibilityLabel="Remove file"
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function IntakeAttachmentRow({
  label,
  icon,
  assets,
  onPickDocument,
  onPickPhoto,
  onRemoveAt,
  onClearAll,
  disabled,
  showCamera,
  busy,
}: {
  label: string;
  icon: string;
  assets: DocumentPickerAsset[];
  onPickDocument: () => void;
  onPickPhoto: () => void;
  onRemoveAt: (index: number) => void;
  onClearAll: () => void;
  disabled: boolean;
  showCamera: boolean;
  busy: boolean;
}) {
  const [previewIndex, setPreviewIndex] = useState(0);

  const count = assets.length;
  const summary =
    count === 0
      ? 'No files yet — add one or more photos or documents.'
      : `${count} file${count === 1 ? '' : 's'} attached`;

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (count === 0) {
      setPreviewIndex(0);
      prevCountRef.current = 0;
      return;
    }
    if (count > prevCountRef.current) {
      setPreviewIndex(count - 1);
    } else {
      setPreviewIndex((prev) => Math.min(Math.max(0, prev), count - 1));
    }
    prevCountRef.current = count;
  }, [count]);

  const previewAsset =
    count > 0 ? assets[Math.min(previewIndex, count - 1)] : null;

  return (
    <View style={styles.attachRow}>
      <View style={styles.attachHead}>
        <List.Icon color={colors.primary} icon={icon} />
        <Text variant="titleSmall" style={styles.attachLabel}>
          {label}
        </Text>
      </View>
      <Text variant="bodySmall" style={styles.attachFile} numberOfLines={2}>
        {summary}
      </Text>
      {count > 0 ? (
        <>
          <ScrollView
            horizontal
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator
            style={styles.attachThumbStrip}
            contentContainerStyle={styles.attachThumbScroll}>
            {assets.map((asset, index) => (
              <View
                key={`${asset.uri}-${index}`}
                style={[
                  styles.attachThumbWrap,
                  index === previewIndex && styles.attachThumbWrapSelected,
                ]}
                accessibilityLabel={`${label} ${index + 1}`}>
                <Pressable
                  onPress={() => setPreviewIndex(index)}
                  style={({ pressed }) => [
                    styles.attachThumbHit,
                    pressed && styles.attachThumbWrapPressed,
                  ]}
                  accessibilityLabel={`Show preview for file ${index + 1}`}>
                  {isImageLikeAsset(asset) ? (
                    <Image
                      source={{ uri: asset.uri }}
                      style={styles.attachThumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.attachThumbImage, styles.attachThumbDoc]}>
                      <Text variant="labelSmall" numberOfLines={3} style={styles.attachThumbDocText}>
                        {asset.name ?? 'Document'}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <IconButton
                  icon="close-circle"
                  size={22}
                  iconColor={colors.error}
                  style={styles.attachThumbRemove}
                  onPress={() => onRemoveAt(index)}
                  accessibilityLabel="Remove this file"
                />
              </View>
            ))}
          </ScrollView>
          {previewAsset ? (
            <View style={styles.attachLargePreviewWrap}>
              <Text variant="labelSmall" style={styles.attachLargePreviewLabel}>
                Preview (tap a thumbnail above to switch)
              </Text>
              {isImageLikeAsset(previewAsset) ? (
                <Image
                  source={{ uri: previewAsset.uri }}
                  style={styles.attachLargePreview}
                  resizeMode="contain"
                  accessibilityLabel={`Large preview of ${label}`}
                />
              ) : (
                <View style={[styles.attachLargePreview, styles.attachLargeDoc]}>
                  <Text variant="bodyMedium" style={styles.attachLargeDocText}>
                    {previewAsset.name ?? 'Document'}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    Non-image file — open from device to view full content.
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.attachActions}>
        <Button
          mode="outlined"
          icon="folder-open"
          onPress={onPickDocument}
          disabled={disabled || busy}
          style={styles.attachBtn}
          contentStyle={clinicScreen.buttonContentCompact}>
          Choose file
        </Button>
        {showCamera ? (
          <Button
            mode="outlined"
            icon="camera"
            onPress={onPickPhoto}
            disabled={disabled || busy}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Take photo
          </Button>
        ) : null}
        {count > 0 ? (
          <Button
            mode="text"
            onPress={onClearAll}
            disabled={disabled || busy}
            style={styles.attachBtn}
            contentStyle={clinicScreen.buttonContentCompact}>
            Clear all
          </Button>
        ) : null}
      </View>
    </View>
  );
}

export default function PatientIntakeVisitScreen() {
  const activePatient = usePatientStore((s) => s.activePatient);
  const clearActivePatient = usePatientStore((s) => s.clearActivePatient);
  const setVisitSession = usePatientStore((s) => s.setVisitSession);
  const clearVisitSession = usePatientStore((s) => s.clearVisitSession);
  const handoff = useIntakeVisitHandoffStore((s) => s.handoff);
  const clearHandoff = useIntakeVisitHandoffStore((s) => s.clearHandoff);
  const clinic = useAuthStore((s) => s.clinic);
  const { showSuccess, showError } = useAppToast();

  const doctorsQuery = useDoctors();
  const upload = useUploadDocument();

  const [department, setDepartment] = useState<string | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  /** `c:{id}` from GET /clinic/services, or `l:{name}` for offline intake */
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [serviceAmounts, setServiceAmounts] = useState<Record<string, string>>(
    {},
  );
  const [serviceAttachments, setServiceAttachments] = useState<
    Record<string, DocumentPickerAsset[]>
  >({});
  const [clinicCatalog, setClinicCatalog] = useState<ClinicVisitCatalogItem[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');

  const [entireBillAssets, setEntireBillAssets] = useState<DocumentPickerAsset[]>(
    [],
  );

  const [cameraTarget, setCameraTarget] = useState<AttachmentCameraTarget | null>(
    null,
  );
  const cameraTargetRef = useRef<AttachmentCameraTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [visitId, setVisitId] = useState<number | null>(null);
  const [visitMeta, setVisitMeta] = useState<StartVisitResponse | null>(null);
  const [visitStartError, setVisitStartError] = useState<string | null>(null);
  const [startingVisit, setStartingVisit] = useState(false);
  const [savingOverlayMessage, setSavingOverlayMessage] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const inputFocusProps = {
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    selectionColor: colors.primary,
  } as const;

  useEffect(() => {
    cameraTargetRef.current = cameraTarget;
  }, [cameraTarget]);

  const useApiVisit = useMemo(
    () =>
      !!(
        activePatient?.healthCardId &&
        activePatient.id != null &&
        Number.isFinite(Number(activePatient.id))
      ),
    [activePatient?.healthCardId, activePatient?.id],
  );

  const visitFromHandoff = Boolean(useApiVisit && handoff);

  useEffect(() => {
    setSelectedServiceKeys([]);
    setServiceAmounts({});
    setServiceAttachments({});
  }, [useApiVisit]);

  /** Step 1 handoff: visit already started on intake; lock doctor and catalogue. */
  useEffect(() => {
    if (!useApiVisit || !handoff) return;
    setVisitId(handoff.visitId);
    setVisitMeta(handoff.visitMeta);
    setVisitStartError(null);
    setStartingVisit(false);
    setDepartment(handoff.doctorDepartment);
    setSelectedDoctor({
      id: handoff.doctorId,
      name: handoff.doctorName,
      department: handoff.doctorDepartment,
      designation: '',
      available: true,
      timing: '',
    });
    setClinicCatalog(handoff.catalog);
    setCatalogLoading(false);
    setCatalogError(null);
  }, [useApiVisit, handoff]);

  useEffect(() => {
    if (!useApiVisit) {
      setClinicCatalog([]);
      setCatalogError(null);
      setCatalogLoading(false);
      return;
    }
    if (handoff) {
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchClinicVisitServicesCatalog()
      .then((rows) => {
        if (!cancelled) {
          setClinicCatalog(rows);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setClinicCatalog([]);
          setCatalogError(
            e instanceof Error ? e.message : 'Could not load services.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useApiVisit, handoff]);

  const apiReturnedEmptyServices = useMemo(
    () =>
      useApiVisit &&
      !catalogLoading &&
      !catalogError &&
      clinicCatalog.length === 0,
    [useApiVisit, catalogLoading, catalogError, clinicCatalog.length],
  );

  const usingMockCatalog = useMemo(
    () =>
      apiReturnedEmptyServices &&
      USE_MOCK_CLINIC_SERVICES_WHEN_EMPTY &&
      MOCK_CLINIC_VISIT_CATALOG.length > 0,
    [apiReturnedEmptyServices],
  );

  /** API catalogue, or mock rows for UI testing when API returns []. */
  const displayCatalog = useMemo(() => {
    if (clinicCatalog.length > 0) return clinicCatalog;
    if (usingMockCatalog) return MOCK_CLINIC_VISIT_CATALOG;
    return [];
  }, [clinicCatalog, usingMockCatalog]);

  const serviceChipRows = useMemo(() => {
    if (useApiVisit && displayCatalog.length > 0) {
      return displayCatalog.map((s) => ({
        key: `c:${s.id}`,
        label: s.name,
        listPrice: s.price,
      }));
    }
    return DEFAULT_VISIT_SERVICES.map((name) => ({
      key: `l:${name}`,
      label: name,
      listPrice: 0,
    }));
  }, [useApiVisit, displayCatalog]);

  /** POST /clinic/visits/start only when not using Step 1 handoff (offline / legacy). */
  useEffect(() => {
    if (!useApiVisit || handoff) {
      if (!useApiVisit) {
        setVisitId(null);
        setVisitMeta(null);
        setVisitStartError(null);
        setStartingVisit(false);
      }
      return;
    }
    if (
      !activePatient?.healthCardId ||
      activePatient.id == null ||
      !selectedDoctor
    ) {
      setVisitId(null);
      setVisitMeta(null);
      setVisitStartError(null);
      setStartingVisit(false);
      return;
    }

    let cancelled = false;
    setVisitId(null);
    setVisitMeta(null);
    setVisitStartError(null);
    setStartingVisit(true);

    startClinicVisit({
      healthCardId: activePatient.healthCardId,
      personId: activePatient.id,
      doctorId: selectedDoctor.id,
    })
      .then((row) => {
        if (cancelled) return;
        setVisitId(row.visit_id);
        setVisitMeta(row);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : 'Could not start visit.';
        setVisitStartError(msg);
        setVisitId(null);
        setVisitMeta(null);
      })
      .finally(() => {
        if (!cancelled) setStartingVisit(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    useApiVisit,
    handoff,
    activePatient?.healthCardId,
    activePatient?.id,
    selectedDoctor?.id,
  ]);

  const allDoctors = doctorsQuery.data ?? [];
  const departments = useMemo(() => {
    const d = new Set(
      allDoctors.map((x) => x.department).filter((s) => s.trim().length > 0),
    );
    return [...d].sort((a, b) => a.localeCompare(b));
  }, [allDoctors]);

  const doctorsInDept = useMemo(() => {
    if (!department) return [];
    return allDoctors.filter((doc) => doc.department === department);
  }, [allDoctors, department]);

  useEffect(() => {
    if (!department && departments.length > 0) {
      setDepartment(departments[0]);
    }
  }, [department, departments]);

  useEffect(() => {
    if (!department) return;
    if (
      selectedDoctor &&
      doctorsInDept.some((d) => d.id === selectedDoctor.id)
    ) {
      return;
    }
    const firstAvail =
      doctorsInDept.find((d) => d.available) ?? doctorsInDept[0] ?? null;
    setSelectedDoctor(firstAvail);
  }, [department, doctorsInDept, selectedDoctor]);

  const appendEntireBillAsset = useCallback(
    (asset: DocumentPickerAsset) => {
      const hcId = activePatient?.healthCardId;
      const personId = activePatient?.id;
      const apiVisit = !!(hcId && personId);

      setEntireBillAssets((prev) => [...prev, asset]);

      if (!apiVisit) {
        upload.mutate({ category: 'bill', asset });
      }
    },
    [activePatient?.healthCardId, activePatient?.id, upload],
  );

  const appendServiceAsset = useCallback((serviceKey: string, asset: DocumentPickerAsset) => {
    setServiceAttachments((prev) => ({
      ...prev,
      [serviceKey]: [...(prev[serviceKey] ?? []), asset],
    }));
  }, []);

  const removeEntireBillAt = useCallback((index: number) => {
    setEntireBillAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeServiceAssetAt = useCallback((serviceKey: string, index: number) => {
    setServiceAttachments((prev) => ({
      ...prev,
      [serviceKey]: (prev[serviceKey] ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const onCameraCaptured = useCallback(
    (asset: DocumentPickerAsset) => {
      const target = cameraTargetRef.current;
      if (!target) return;
      if (target.kind === 'bill') {
        appendEntireBillAsset(asset);
      } else {
        appendServiceAsset(target.serviceKey, asset);
      }
    },
    [appendEntireBillAsset, appendServiceAsset],
  );

  async function onPickEntireBillDocument() {
    const a = await pickDocument();
    if (a) appendEntireBillAsset(a);
  }

  async function onPickServiceDocument(serviceKey: string) {
    const a = await pickDocument();
    if (a) appendServiceAsset(serviceKey, a);
  }

  function toggleServiceKey(key: string, listPrice?: number) {
    setSelectedServiceKeys((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        setServiceAmounts((curr) => {
          const copy = { ...curr };
          delete copy[key];
          return copy;
        });
        setServiceAttachments((curr) => {
          const copy = { ...curr };
          delete copy[key];
          return copy;
        });
        return prev.filter((k) => k !== key);
      }
      setServiceAmounts((curr) => ({
        ...curr,
        [key]:
          curr[key] !== undefined && curr[key] !== ''
            ? curr[key]
            : listPrice != null && listPrice >= 0
              ? String(listPrice)
              : '',
      }));
      return [...prev, key];
    });
  }

  function setAmountForServiceKey(key: string, raw: string) {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const normalized =
      parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
    setServiceAmounts((prev) => ({ ...prev, [key]: normalized }));
  }

  const showCamera = Platform.OS !== 'web';

  const cameraStagedAssets = useMemo(() => {
    if (!cameraTarget) return [];
    if (cameraTarget.kind === 'bill') return entireBillAssets;
    return serviceAttachments[cameraTarget.serviceKey] ?? [];
  }, [cameraTarget, entireBillAssets, serviceAttachments]);

  const totalAmount = useMemo(() => {
    return selectedServiceKeys.reduce((sum, key) => {
      const n = Number(serviceAmounts[key] ?? '0');
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
  }, [selectedServiceKeys, serviceAmounts]);

  const apiVisitReady =
    !useApiVisit ||
    (!!visitId && !startingVisit && !visitStartError);

  /** Staged files upload with visit submit; only block while visit start fails or is in flight */
  const attachmentsLocked =
    saving || (useApiVisit && (startingVisit || !!visitStartError));

  const apiServicesReady =
    !useApiVisit ||
    (!catalogLoading &&
      !catalogError &&
      displayCatalog.length > 0);

  const canComplete =
    !!activePatient &&
    !!selectedDoctor &&
    selectedServiceKeys.length > 0 &&
    !saving &&
    apiVisitReady &&
    apiServicesReady;

  /** Shown under the CTA when something still blocks submit (visit id, services load, etc.). */
  const completeVisitBlockHint = useMemo(() => {
    if (canComplete || !activePatient) return null;
    if (!selectedDoctor) return 'Select a doctor to continue.';
    if (selectedServiceKeys.length === 0) {
      return 'Select at least one service to continue.';
    }
    if (!useApiVisit) return null;
    if (catalogLoading) return 'Loading clinic services…';
    if (catalogError) return catalogError;
    if (displayCatalog.length === 0) {
      return 'No services available for this clinic.';
    }
    if (startingVisit) return 'Starting visit on the server…';
    if (visitStartError) return visitStartError;
    if (!visitId) {
      return 'Visit session not ready yet. Wait a moment or pick the doctor again.';
    }
    return null;
  }, [
    canComplete,
    activePatient,
    selectedDoctor,
    selectedServiceKeys.length,
    useApiVisit,
    catalogLoading,
    catalogError,
    displayCatalog.length,
    startingVisit,
    visitStartError,
    visitId,
  ]);

  async function onCompleteVisit() {
    if (!activePatient || !selectedDoctor) return;
    if (useApiVisit && (!visitId || visitStartError || startingVisit)) {
      return;
    }
    setSaving(true);
    setSavingOverlayMessage(
      useApiVisit ? 'Preparing…' : 'Saving visit…',
    );
    try {
      let slipId: string;
      let amountStr = totalAmount.toFixed(2);

      if (useApiVisit && visitId) {
        const serviceStaged = selectedServiceKeys.flatMap((key) =>
          (serviceAttachments[key] ?? []).map((asset) => ({ key, asset })),
        );
        const hasDocs =
          serviceStaged.length > 0 || entireBillAssets.length > 0;
        if (hasDocs) {
          setSavingOverlayMessage('Uploading documents…');
          for (const { asset } of serviceStaged) {
            await uploadClinicVisitDocument(
              visitId,
              {
                uri: asset.uri,
                name: asset.name ?? 'upload',
                type: asset.mimeType ?? undefined,
              },
              'supporting',
            );
          }
          for (const asset of entireBillAssets) {
            await uploadClinicVisitDocument(
              visitId,
              {
                uri: asset.uri,
                name: asset.name ?? 'upload',
                type: asset.mimeType ?? undefined,
              },
              mapIntakeCategoryToVisitDocumentType('bill'),
            );
          }
        }

        setSavingOverlayMessage('Submitting visit…');
        const orderedIds = displayCatalog
          .map((s) => s.id)
          .filter((id) => selectedServiceKeys.includes(`c:${id}`));
        const amountsById: Record<number, string> = {};
        for (const id of orderedIds) {
          amountsById[id] = serviceAmounts[`c:${id}`] ?? '';
        }
        const lines = buildSubmitLinesFromCatalog(
          orderedIds,
          amountsById,
          displayCatalog,
          selectedDoctor.id,
          { omitClinicServiceIds: usingMockCatalog },
        );
        const submitRes = await submitClinicVisit(visitId, lines, false);
        slipId = submitRes.claim_number;
        const tc = submitRes.total_claimed;
        if (tc != null && tc !== '') {
          amountStr =
            typeof tc === 'number' ? tc.toFixed(2) : String(tc);
        }
      } else {
        slipId = `VIS-${Date.now().toString(36).toUpperCase()}`;
      }

      setSavingOverlayMessage('Finishing…');
      const clinicName = clinic?.name?.trim() || 'Clinic';
      const services = selectionKeysToServiceLabels(
        selectedServiceKeys,
        displayCatalog,
      );
      const symptomsStr = symptoms.trim();

      setVisitSession({
        doctor: {
          id: selectedDoctor.id,
          name: selectedDoctor.name,
          profession: selectedDoctor.department,
        },
        services,
        amount: amountStr,
      });

      const serviceAmountsSnapshot: Record<string, string> = {};
      for (let i = 0; i < selectedServiceKeys.length; i++) {
        const key = selectedServiceKeys[i];
        const label = services[i] ?? key;
        const v = serviceAmounts[key];
        if (v != null && v !== '') serviceAmountsSnapshot[label] = v;
      }

      const attachments: {
        category: VisitAttachmentCategory;
        files: { name: string; mimeType: string | null }[];
      }[] = [];
      if (entireBillAssets.length > 0) {
        attachments.push({
          category: 'bill',
          files: entireBillAssets.map((a) => ({
            name: a.name ?? 'Attachment',
            mimeType: a.mimeType ?? null,
          })),
        });
      }
      const serviceFiles = selectedServiceKeys.flatMap(
        (key) => serviceAttachments[key] ?? [],
      );
      if (serviceFiles.length > 0) {
        attachments.push({
          category: 'supporting',
          files: serviceFiles.map((a) => ({
            name: a.name ?? 'Attachment',
            mimeType: a.mimeType ?? null,
          })),
        });
      }

      useVisitHistoryStore.getState().addVisit({
        id: slipId,
        patientId: activePatient.id,
        patientName: activePatient.name,
        patientCardNumber: activePatient.cardNumber,
        completedAt: new Date().toISOString(),
        slipId,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.department,
        services,
        serviceAmounts: serviceAmountsSnapshot,
        totalAmount: amountStr,
        symptoms: symptomsStr,
        attachments,
      });

      let pdfUri: string | null = null;
      try {
        const { uri } = await printVisitSummaryPdf({
          slipId,
          clinicName,
          patientName: activePatient.name,
          patientCard: activePatient.cardNumber,
          department: selectedDoctor.department,
          doctorName: selectedDoctor.name,
          services,
          amount: amountStr,
          symptoms: symptomsStr || '—',
          generatedAtLabel: new Date().toLocaleString(),
        });
        pdfUri = uri;
      } catch {
        /* PDF optional */
      }

      if (useApiVisit) {
        clearHandoff();
      }
      clearVisitSession();
      clearActivePatient();
      router.replace('/patient-intake' as Href);
      requestAnimationFrame(() => {
        showSuccess(
          useApiVisit
            ? `Visit submitted · Ref ${slipId}`
            : `Visit saved locally · ${slipId}`,
        );
      });
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Could not save visit.');
    } finally {
      setSaving(false);
    }
  }

  if (!activePatient) {
    return <Redirect href="/patient-intake" />;
  }

  if (useApiVisit && !handoff) {
    return <Redirect href="/patient-intake" />;
  }

  const memberPersonId =
    activePatient.id != null && Number.isFinite(Number(activePatient.id))
      ? Number(activePatient.id)
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CompactScreenHeader
        title="Visit"
        onBackPress={() => router.replace('/patient-intake' as Href)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[clinicScreen.screenPadding, styles.scroll]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text variant="labelLarge" style={styles.heroKicker}>
              Step 2 · Services &amp; documents
            </Text>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              Record this visit
            </Text>
            <Text variant="bodyMedium" style={styles.intro}>
              {visitFromHandoff
                ? 'Doctor is set from Step 1. Choose services, amounts, and optional files per service; add visit notes and an entire bill below if needed, then submit.'
                : useApiVisit
                  ? 'Choose doctor and services with optional files per line; add notes and an entire bill below, then submit on the server.'
                  : 'Choose doctor and services with optional files per line; add notes and an entire bill below, then save the visit.'}
            </Text>
          </View>

          <Card style={[clinicScreen.card, styles.card, styles.patientCard]} mode="elevated">
            <Card.Content style={styles.patientRow}>
              <Image
                source={{ uri: activePatient.photo }}
                style={styles.patientPhoto}
              />
              <View style={styles.patientText}>
                <Text variant="titleSmall">{activePatient.name}</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {activePatient.cardNumber}
                  {activePatient.mobile ? ` · ${activePatient.mobile}` : ''}
                </Text>
              </View>
              {memberPersonId != null ? (
                <Button
                  mode="outlined"
                  compact
                  icon="history"
                  onPress={() => setHistoryOpen(true)}
                  disabled={saving || startingVisit}
                  style={styles.historyBtn}
                  labelStyle={styles.historyBtnLabel}
                  contentStyle={styles.historyBtnContent}>
                  History
                </Button>
              ) : null}
            </Card.Content>
          </Card>

          {memberPersonId != null ? (
            <MemberVisitHistorySheet
              visible={historyOpen}
              onDismiss={() => setHistoryOpen(false)}
              personId={memberPersonId}
              patientName={activePatient.name}
            />
          ) : null}

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Doctor &amp; department
              </Text>
              {visitFromHandoff ? (
                <View>
                  <Text variant="titleSmall">
                    {selectedDoctor?.name ?? '—'}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {selectedDoctor?.department ?? ''}
                  </Text>
                  {visitId != null ? (
                    <Text variant="labelSmall" style={styles.muted}>
                      Visit #{visitId}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <>
                  {doctorsQuery.isPending && !doctorsQuery.data ? (
                    <Text variant="bodySmall">Loading doctors…</Text>
                  ) : doctorsQuery.isError ? (
                    <Text variant="bodySmall" style={styles.errorText}>
                      Could not load doctors. Pull to retry from roster, or
                      continue with cached data if shown.
                    </Text>
                  ) : null}

                  <Text variant="labelLarge" style={styles.fieldLabel}>
                    Department
                  </Text>
                  <Menu
                    visible={deptMenuOpen}
                    onDismiss={() => setDeptMenuOpen(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setDeptMenuOpen(true)}
                        disabled={saving || departments.length === 0}
                        style={[styles.menuBtn, styles.menuBtnRaised]}
                        contentStyle={styles.menuBtnContent}>
                        {department ?? 'Choose department'}
                      </Button>
                    }>
                    {departments.map((d) => (
                      <Menu.Item
                        key={d}
                        title={d}
                        onPress={() => {
                          setDepartment(d);
                          setDeptMenuOpen(false);
                        }}
                      />
                    ))}
                  </Menu>

                  <Text
                    variant="labelLarge"
                    style={[styles.fieldLabel, styles.mt]}>
                    Doctor
                  </Text>
                  {!department ? (
                    <HelperText type="info" visible>
                      Select a department to see doctors.
                    </HelperText>
                  ) : doctorsInDept.length === 0 ? (
                    <HelperText type="info" visible>
                      No doctors listed for this department.
                    </HelperText>
                  ) : (
                    <View style={styles.doctorRadioCard}>
                      <RadioButton.Group
                        value={
                          selectedDoctor ? String(selectedDoctor.id) : ''
                        }
                        onValueChange={(value) => {
                          const id = Number(value);
                          const next = doctorsInDept.find(
                            (doc) => doc.id === id,
                          );
                          if (next) setSelectedDoctor(next);
                        }}>
                        {doctorsInDept.map((d) => (
                          <RadioButton.Item
                            key={d.id}
                            value={String(d.id)}
                            label={`${d.name}${d.available ? '' : ' (off roster)'} · ${d.timing}`}
                            position="leading"
                            style={styles.radioItem}
                          />
                        ))}
                      </RadioButton.Group>
                    </View>
                  )}
                  {useApiVisit && startingVisit ? (
                    <View style={styles.visitSyncRow}>
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                      />
                      <Text variant="bodySmall" style={styles.muted}>
                        Starting visit…
                      </Text>
                    </View>
                  ) : null}
                  {useApiVisit && visitStartError ? (
                    <HelperText type="error" visible>
                      {visitStartError}
                    </HelperText>
                  ) : null}
                </>
              )}
              {useApiVisit &&
              visitMeta?.concession &&
              typeof (visitMeta.concession as { applicable?: unknown })
                .applicable === 'boolean' &&
              (visitMeta.concession as { applicable: boolean }).applicable ? (
                <HelperText type="info" visible>
                  {(visitMeta.concession as { message?: string }).message ??
                    'Revisit concession is tracked for this patient; submit uses apply_concession false until enabled.'}
                </HelperText>
              ) : null}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Services
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {useApiVisit
                  ? 'Services come from your clinic catalogue. Tap to add or remove; set amount and optionally attach a photo or document per service.'
                  : 'Tap to add or remove. Enter amount and optionally attach a photo or document for each service.'}
              </Text>
              {useApiVisit && catalogLoading ? (
                <Text variant="bodySmall" style={styles.muted}>
                  Loading services…
                </Text>
              ) : null}
              {useApiVisit && catalogError ? (
                <HelperText type="error" visible>
                  {catalogError}
                </HelperText>
              ) : null}
              {useApiVisit &&
              !catalogLoading &&
              !catalogError &&
              apiReturnedEmptyServices ? (
                <>
                  <HelperText type="error" visible style={styles.servicesEmpty}>
                    No services found for this clinic.
                  </HelperText>
                  {usingMockCatalog ? (
                    <HelperText type="info" visible style={styles.servicesMockHint}>
                      Sample services below are shown because the API returned no
                      rows. Configure real services in clinic setup for production;
                      you can still try Submit visit (submit may fail if
                      IDs do not exist on the server).
                    </HelperText>
                  ) : (
                    <HelperText type="info" visible>
                      Complete clinic setup with at least one active service, then
                      refresh this screen.
                    </HelperText>
                  )}
                </>
              ) : null}
              <View style={styles.chipWrap}>
                {serviceChipRows.map(({ key, label }) => (
                  <Chip
                    key={key}
                    mode="flat"
                    selected={selectedServiceKeys.includes(key)}
                    onPress={() => {
                      const row = serviceChipRows.find((r) => r.key === key);
                      toggleServiceKey(key, row?.listPrice);
                    }}
                    style={[
                      styles.chip,
                      selectedServiceKeys.includes(key) && styles.chipSelected,
                    ]}
                    textStyle={
                      selectedServiceKeys.includes(key)
                        ? styles.chipTextSelected
                        : styles.chipText
                    }>
                    {label}
                  </Chip>
                ))}
              </View>
              {selectedServiceKeys.length === 0 ? (
                <HelperText type="info" visible>
                  Select at least one service to continue.
                </HelperText>
              ) : null}
              {selectedServiceKeys.length > 0 ? (
                <View style={styles.serviceBillingBlock}>
                  <Text variant="labelLarge" style={styles.fieldLabel}>
                    Service billing
                  </Text>
                  {selectedServiceKeys.map((key) => {
                    const label =
                      selectionKeysToServiceLabels([key], displayCatalog)[0] ??
                      key;
                    const consult = isConsultationServiceKey(
                      key,
                      displayCatalog,
                    );
                    return (
                      <View key={key} style={styles.serviceAmountRow}>
                        <Text variant="bodyMedium" style={styles.serviceAmountLabel}>
                          {label}
                        </Text>
                        <TextInput
                          label="Amount (₹)"
                          value={serviceAmounts[key] ?? ''}
                          onChangeText={(v) => setAmountForServiceKey(key, v)}
                          mode="outlined"
                          {...inputFocusProps}
                          keyboardType="decimal-pad"
                          style={styles.serviceAmountInput}
                          disabled={saving}
                        />
                        {consult ? (
                          <HelperText type="info" visible padding="normal">
                            Claimed consultation fee follows this doctor or your
                            clinic default — the amount above is for reference only.
                          </HelperText>
                        ) : null}
                        <ServiceLineAttachment
                          assets={serviceAttachments[key] ?? []}
                          disabled={attachmentsLocked}
                          showCamera={showCamera}
                          onPickDocument={() => void onPickServiceDocument(key)}
                          onPickPhoto={() =>
                            setCameraTarget({ kind: 'service', serviceKey: key })
                          }
                          onRemoveAt={(index) => removeServiceAssetAt(key, index)}
                        />
                      </View>
                    );
                  })}
                  <View style={styles.totalRow}>
                    <Text variant="titleSmall" style={styles.totalLabel}>
                      Total
                    </Text>
                    <Text variant="titleSmall" style={styles.totalValue}>
                      ₹ {totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Visit notes
              </Text>
              <TextInput
                label="Chief complaint / visit notes"
                value={symptoms}
                onChangeText={setSymptoms}
                mode="outlined"
                {...inputFocusProps}
                multiline
                numberOfLines={4}
                style={styles.input}
                disabled={saving}
              />
            </Card.Content>
          </Card>

          <Card style={[clinicScreen.card, styles.card, styles.sectionCard]} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Documents (optional)
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {useApiVisit
                  ? 'Upload or capture one combined bill for the whole visit. Per-service files are added under each service above.'
                  : 'One combined bill for the visit. Service-level files are added under each selected service.'}
              </Text>
              <IntakeAttachmentRow
                label={VISIT_ENTIRE_BILL_UPLOAD.label}
                icon={VISIT_ENTIRE_BILL_UPLOAD.icon}
                assets={entireBillAssets}
                disabled={attachmentsLocked}
                busy={upload.isPending && upload.variables?.category === 'bill'}
                showCamera={showCamera}
                onPickDocument={() => void onPickEntireBillDocument()}
                onPickPhoto={() => setCameraTarget({ kind: 'bill' })}
                onRemoveAt={(index) => removeEntireBillAt(index)}
                onClearAll={() => setEntireBillAssets([])}
              />
            </Card.Content>
          </Card>

          {completeVisitBlockHint ? (
            <HelperText
              type={visitStartError ? 'error' : 'info'}
              visible
              style={styles.completeHint}>
              {completeVisitBlockHint}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={() => void onCompleteVisit()}
            loading={saving}
            disabled={!canComplete}
            style={[clinicScreen.button, styles.completeCta]}
            contentStyle={clinicScreen.buttonContent}>
            Submit visit
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={saving}
        message={savingOverlayMessage || 'Saving visit…'}
      />

      <ClaimCameraModal
        visible={cameraTarget != null}
        onClose={() => setCameraTarget(null)}
        onCaptured={onCameraCaptured}
        allowMultiple
        stagedAssets={cameraStagedAssets}
        onRemoveStaged={(index) => {
          if (!cameraTarget) return;
          if (cameraTarget.kind === 'bill') {
            removeEntireBillAt(index);
          } else {
            removeServiceAssetAt(cameraTarget.serviceKey, index);
          }
        }}
      />
    </SafeAreaView>
  );
}

const PHOTO = 56;
const PHOTO_R = 28;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xl * 2 },
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
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  intro: { color: colors.textMuted, lineHeight: 22 },
  card: { marginBottom: spacing.md },
  sectionCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  patientPhoto: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO_R,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.surfaceVariant,
  },
  patientText: { flex: 1, minWidth: 0 },
  historyBtn: {
    borderColor: colors.primary,
    borderRadius: 10,
    minWidth: 0,
  },
  historyBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 0,
  },
  historyBtnContent: {
    height: 36,
    paddingHorizontal: 4,
  },
  muted: { color: colors.textMuted, marginTop: 4 },
  visitSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTitle: {
    ...typography.title,
    marginBottom: spacing.md,
    fontWeight: '700',
    color: colors.secondary,
    fontSize: 18,
  },
  fieldLabel: { marginBottom: spacing.xs, color: colors.secondary },
  mt: { marginTop: spacing.md },
  menuBtn: { alignSelf: 'stretch', borderColor: colors.border },
  menuBtnRaised: { backgroundColor: colors.surface },
  menuBtnContent: { justifyContent: 'flex-start' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  servicesEmpty: {
    marginTop: spacing.xs,
  },
  servicesMockHint: {
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  chip: { marginBottom: 0, backgroundColor: colors.surfaceVariant },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.secondary },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
  serviceBillingBlock: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  serviceAmountRow: {
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  serviceAmountLabel: {
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  serviceAmountInput: {
    backgroundColor: colors.surface,
  },
  serviceAttachBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  serviceAttachHint: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  serviceAttachActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceAttachBtn: {
    flexGrow: 1,
    minWidth: 120,
  },
  serviceAttachThumbStrip: {
    height: 72,
    marginTop: spacing.sm,
    width: '100%',
  },
  serviceAttachThumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  serviceAttachThumbWrap: {
    width: 64,
    height: 64,
    marginRight: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceAttachThumbImage: {
    width: '100%',
    height: '100%',
  },
  serviceAttachThumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    margin: 0,
    backgroundColor: colors.surface,
  },
  totalRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.textMuted,
  },
  totalValue: {
    color: colors.secondary,
    fontWeight: '700',
  },
  completeHint: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  completeCta: { marginTop: spacing.sm, borderRadius: radii.button },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  errorText: { color: colors.error, marginBottom: spacing.sm },
  attachRow: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  attachHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  attachLabel: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  attachFile: { ...typography.small, marginBottom: spacing.sm },
  /** Explicit height so nested horizontal ScrollView is not collapsed inside the page ScrollView. */
  attachThumbStrip: {
    height: 100,
    marginBottom: spacing.sm,
    width: '100%',
  },
  attachThumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    minHeight: 96,
  },
  attachThumbWrap: {
    width: 88,
    height: 88,
    marginRight: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attachThumbWrapSelected: {
    borderColor: colors.primary,
  },
  attachThumbWrapPressed: {
    opacity: 0.85,
  },
  attachThumbHit: {
    width: 88,
    height: 88,
  },
  attachThumbImage: {
    width: 88,
    height: 88,
  },
  attachThumbDoc: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  attachThumbDocText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.text,
  },
  attachThumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    margin: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    zIndex: 2,
  },
  attachLargePreviewWrap: {
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  attachLargePreviewLabel: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 2,
    color: colors.textMuted,
  },
  attachLargePreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#0a0a0a',
  },
  attachLargeDoc: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  attachLargeDocText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  attachActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  doctorRadioCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  radioItem: {
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  attachBtn: { marginRight: 0 },
});
