import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, spacing } from '@/constants/theme';
import {
  ocrService,
  isRemoteOCRProvider,
  ocrServiceMode,
  remoteOCRDebugEndpoint,
} from '@/services/ocr';
import { OCRServiceError, type OCRService } from '@/services/ocr/OCRService';
import { mockOCRService } from '@/services/ocr/mockOCRService';
import { useReceiptImportStore } from '@/store/useReceiptImportStore';
import { getTodayDateInputValue } from '@/utils/date';
import { createReceiptReviewItem } from '@/utils/receiptImport';
import { parseReceiptText } from '@/utils/receiptParser';

const RECEIPT_TIPS = [
  'ถ่ายให้เห็นทั้งใบ',
  'วางบนพื้นสีเข้ม',
  'อย่าให้เงาทับตัวหนังสือ',
  'ถ่ายให้ตรงและชัด',
  'ถ้าใบยาว ให้ถ่ายทีละครึ่งใบได้ในอนาคต',
] as const;

function getOCRFailureMessage(error: unknown) {
  if (error instanceof OCRServiceError) {
    if (error.code === 'config') {
      return __DEV__ && error.message
        ? `ตั้งค่า OCR ยังไม่ครบ: ${error.message}`
        : 'การตั้งค่า OCR ยังไม่ครบ';
    }

    if (error.status === 400 || error.code === 'invalid_image') {
      return 'รูปใบเสร็จยังไม่พร้อมใช้งาน ลองถ่ายใหม่ให้ครบและคมชัด';
    }

    if (error.status === 413) {
      return 'รูปมีขนาดใหญ่เกินไป ลองถ่ายให้ใกล้ขึ้นหรือครอปให้เหลือเฉพาะใบเสร็จ';
    }

    if (error.status === 504 || error.code === 'timeout') {
      return 'อ่านข้อความใช้เวลานานเกินไป ลองถ่ายใหม่ให้ใบเสร็จตรงและชัดขึ้น';
    }

    if (error.code === 'network') {
      return isRemoteOCRProvider
        ? 'ติดต่อเซิร์ฟเวอร์ OCR ไม่ได้ ตรวจสอบว่าแบ็กเอนด์เปิดอยู่ และถ้าใช้มือถือจริงให้เชื่อมผ่าน IP ของคอมพิวเตอร์'
        : 'ติดต่อเซิร์ฟเวอร์ OCR ไม่ได้';
    }

    if (error.code === 'empty') {
      return 'อ่านข้อความไม่สำเร็จ ลองถ่ายใหม่ให้ใบเสร็จชัดขึ้น';
    }

    if (error.code === 'server') {
      return __DEV__ && error.message
        ? `OCR server error: ${error.message}`
        : 'เซิร์ฟเวอร์ OCR มีปัญหา ลองใหม่อีกครั้ง';
    }

    if (error.code === 'unknown') {
      return __DEV__ && error.message
        ? `Unexpected OCR error: ${error.message}`
        : 'อ่านข้อความไม่สำเร็จ ลองใหม่อีกครั้ง';
    }
  }

  return 'อ่านข้อความไม่สำเร็จ ลองถ่ายใหม่ให้ใบเสร็จชัดขึ้น';
}

export default function ReceiptScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const setDraftImport = useReceiptImportStore((state) => state.setDraftImport);
  const clearDraftImport = useReceiptImportStore((state) => state.clearDraftImport);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);
  const [lastAttemptUsedRemoteOCR, setLastAttemptUsedRemoteOCR] = useState(false);

  const handlePickFromLibrary = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'ยังไม่ได้รับสิทธิ์',
        'กรุณาอนุญาตให้แอปเข้าถึงรูปภาพ เพื่อเลือกใบเสร็จจากแกลเลอรี'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length) {
      setImageUri(result.assets[0].uri);
      setOcrErrorMessage(null);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });
      if (photo?.uri) {
        setImageUri(photo.uri);
        setOcrErrorMessage(null);
      }
    } catch {
      Alert.alert('ถ่ายรูปไม่สำเร็จ', 'ลองถ่ายใหม่อีกครั้งได้เลย');
    } finally {
      setIsCapturing(false);
    }
  };

  const processImageWithOCR = async (service: OCRService, usingRemoteOCR: boolean) => {
    if (!imageUri) {
      Alert.alert('ยังไม่มีรูปภาพ', 'กรุณาถ่ายรูปหรือเลือกรูปใบเสร็จก่อน');
      return;
    }

    try {
      setIsProcessing(true);
      setOcrErrorMessage(null);
      setLastAttemptUsedRemoteOCR(usingRemoteOCR);
      clearDraftImport();

      const ocrResult = await service.extractTextFromImage(imageUri);
      const parsedReceipt = parseReceiptText(ocrResult.rawText);

      if (!parsedReceipt.items.length) {
        Alert.alert(
          'ยังไม่เจอรายการสินค้า',
          'ระบบยังแยกรายการวัตถุดิบจากใบเสร็จไม่ได้ ลองใช้รูปที่ชัดขึ้นหรือแก้ไขในภายหลัง'
        );
        return;
      }

      const purchasedAt = parsedReceipt.purchasedAt ?? getTodayDateInputValue();
      setDraftImport({
        imageUri,
        parsedReceipt,
        purchasedAt,
        items: parsedReceipt.items.map((item) => createReceiptReviewItem(item, purchasedAt)),
      });

      router.push('/receipt/review');
    } catch (error) {
      const message = getOCRFailureMessage(error);
      setOcrErrorMessage(message);
      Alert.alert('อ่านข้อความไม่สำเร็จ', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseImage = async () => {
    await processImageWithOCR(ocrService, isRemoteOCRProvider);
  };

  const handleUseMockFallback = async () => {
    await processImageWithOCR(mockOCRService, false);
  };

  const cameraReady = cameraPermission?.granted;

  return (
    <Screen
      title="สแกนใบเสร็จ"
      subtitle="ถ่ายรูปหรือเลือกรูปใบเสร็จ แล้วให้ระบบดึงรายการวัตถุดิบมาให้ตรวจสอบก่อนเพิ่มเข้าสต็อก">
      <SectionCard
        title="เคล็ดลับให้ OCR อ่านง่ายขึ้น"
        subtitle={`ตอนนี้ใช้ OCR แบบ ${ocrServiceMode === 'remote' ? 'Google Vision ผ่านแบ็กเอนด์' : 'ข้อมูลตัวอย่างในเครื่อง'}`}>
        <View style={styles.tipsList}>
          {RECEIPT_TIPS.map((tip) => (
            <Text key={tip} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
          {__DEV__ && remoteOCRDebugEndpoint ? (
            <Text style={styles.endpointText}>OCR endpoint: {remoteOCRDebugEndpoint}</Text>
          ) : null}
        </View>
      </SectionCard>

      <View style={styles.actionsRow}>
        <AppButton label="เลือกรูปจากแกลเลอรี" onPress={handlePickFromLibrary} variant="secondary" />
      </View>

      {imageUri ? (
        <SectionCard title="ตัวอย่างใบเสร็จ" subtitle="ตรวจดูรูปก่อนส่งเข้า OCR">
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.actionsRow}>
            <AppButton
              label="ถ่ายใหม่"
              onPress={() => {
                setImageUri(null);
                setOcrErrorMessage(null);
              }}
              variant="secondary"
            />
            <AppButton
              label={isProcessing ? 'กำลังอ่านข้อความจากใบเสร็จ...' : 'ใช้รูปนี้'}
              onPress={handleUseImage}
              disabled={isProcessing}
              style={styles.primaryAction}
            />
          </View>
          {ocrErrorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>ลองอีกครั้งได้เลย</Text>
              <Text style={styles.errorText}>{ocrErrorMessage}</Text>
              <View style={styles.actionsRow}>
                <AppButton
                  label="ลองอีกครั้ง"
                  onPress={handleUseImage}
                  variant="secondary"
                />
                {__DEV__ && isRemoteOCRProvider && lastAttemptUsedRemoteOCR ? (
                  <AppButton
                    label="ลองใช้ข้อมูลตัวอย่างแทน"
                    onPress={handleUseMockFallback}
                    variant="ghost"
                  />
                ) : null}
              </View>
            </View>
          ) : null}
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color={palette.accentStrong} />
              <Text style={styles.processingText}>กำลังอ่านข้อความจากใบเสร็จ...</Text>
            </View>
          ) : null}
        </SectionCard>
      ) : cameraReady ? (
        <SectionCard title="กล้อง" subtitle="เล็งให้เห็นทั้งใบเสร็จในภาพเดียวเพื่อให้ OCR อ่านง่ายขึ้น">
          <View style={styles.cameraFrame}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          </View>
          <Pressable onPress={handleTakePhoto} style={styles.captureButton}>
            <View style={styles.captureButtonInner} />
          </Pressable>
          <Text style={styles.captureHint}>
            {isCapturing ? 'กำลังถ่ายรูป...' : 'แตะปุ่มกลมเพื่อถ่ายรูปใบเสร็จ'}
          </Text>
        </SectionCard>
      ) : (
        <SectionCard title="กล้องยังไม่พร้อม">
          {!cameraPermission ? (
            <View style={styles.permissionState}>
              <ActivityIndicator color={palette.accentStrong} />
              <Text style={styles.permissionText}>กำลังตรวจสอบสิทธิ์กล้อง</Text>
            </View>
          ) : (
            <>
              <EmptyState
                title="ยังไม่ได้รับสิทธิ์กล้อง"
                description="ถ้าต้องการถ่ายใบเสร็จจากในแอป กรุณาอนุญาตการใช้งานกล้องก่อน"
              />
              <AppButton label="อนุญาตกล้อง" onPress={requestCameraPermission} />
            </>
          )}
        </SectionCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  primaryAction: {
    flex: 1,
  },
  tipsList: {
    gap: spacing.xs,
  },
  tipText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  endpointText: {
    color: palette.info,
    fontSize: 12,
    lineHeight: 18,
  },
  previewImage: {
    width: '100%',
    height: 360,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    resizeMode: 'cover',
  },
  cameraFrame: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: '#000000',
    height: 360,
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: palette.surface,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.accentStrong,
  },
  captureHint: {
    color: palette.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  processingText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: palette.danger,
    borderRadius: radius.md,
    backgroundColor: palette.dangerSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorTitle: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 18,
  },
  permissionState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  permissionText: {
    color: palette.textMuted,
    fontSize: 14,
  },
});
