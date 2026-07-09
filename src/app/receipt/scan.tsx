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
import { mockOCRService } from '@/services/ocr/mockOCRService';
import { useReceiptImportStore } from '@/store/useReceiptImportStore';
import { getTodayDateInputValue } from '@/utils/date';
import { createReceiptReviewItem } from '@/utils/receiptImport';
import { parseReceiptText } from '@/utils/receiptParser';

export default function ReceiptScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const setDraftImport = useReceiptImportStore((state) => state.setDraftImport);
  const clearDraftImport = useReceiptImportStore((state) => state.clearDraftImport);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
      }
    } catch {
      Alert.alert('ถ่ายรูปไม่สำเร็จ', 'ลองถ่ายใหม่อีกครั้งได้เลย');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUseImage = async () => {
    if (!imageUri) {
      Alert.alert('ยังไม่มีรูปภาพ', 'กรุณาถ่ายรูปหรือเลือกรูปใบเสร็จก่อน');
      return;
    }

    try {
      setIsProcessing(true);
      clearDraftImport();

      const ocrResult = await mockOCRService.extractTextFromImage(imageUri);
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
    } catch {
      Alert.alert(
        'อ่านข้อความจากใบเสร็จไม่สำเร็จ',
        'ตอนนี้ระบบ OCR แบบจำลองยังประมวลผลรูปนี้ไม่ได้ ลองเปลี่ยนรูปแล้วอีกครั้ง'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const cameraReady = cameraPermission?.granted;

  return (
    <Screen
      title="สแกนใบเสร็จ"
      subtitle="ถ่ายรูปหรือเลือกรูปใบเสร็จ แล้วให้ระบบดึงรายการวัตถุดิบมาให้ตรวจสอบก่อนเพิ่มเข้าสต็อก">
      <View style={styles.actionsRow}>
        <AppButton label="เลือกรูปจากแกลเลอรี" onPress={handlePickFromLibrary} variant="secondary" />
      </View>

      {imageUri ? (
        <SectionCard title="ตัวอย่างใบเสร็จ" subtitle="ตรวจดูรูปก่อนส่งเข้า OCR แบบจำลอง">
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.actionsRow}>
            <AppButton
              label="ถ่ายใหม่"
              onPress={() => setImageUri(null)}
              variant="secondary"
            />
            <AppButton
              label={isProcessing ? 'กำลังอ่านใบเสร็จ...' : 'ใช้รูปนี้'}
              onPress={handleUseImage}
              disabled={isProcessing}
              style={styles.primaryAction}
            />
          </View>
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color={palette.accentStrong} />
              <Text style={styles.processingText}>กำลังอ่านข้อความและแยกรายการสินค้า</Text>
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
  },
  primaryAction: {
    flex: 1,
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
