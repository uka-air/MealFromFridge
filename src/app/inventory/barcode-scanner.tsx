import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { findMockProductByBarcode } from '@/data';
import { palette, spacing } from '@/constants/theme';

const SCANNABLE_BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'codabar',
];

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isFocused, setIsFocused] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const scannedBarcode = result.data.trim();
      if (!scannedBarcode || hasScanned) {
        return;
      }

      setHasScanned(true);

      const product = findMockProductByBarcode(scannedBarcode);
      const params: Record<string, string> = {
        barcode: scannedBarcode,
        source: 'barcode',
      };

      if (product) {
        params.productName = product.name;
        params.productCategory = product.category;
        params.productUnit = product.defaultUnit;
        if (product.brand) {
          params.productBrand = product.brand;
        }
        if (product.suggestedShelfLifeDays !== null) {
          params.productShelfLifeDays = String(product.suggestedShelfLifeDays);
        }
      }

      router.replace({
        pathname: '/inventory/ingredient-form',
        params,
      });
    },
    [hasScanned, router]
  );

  if (!permission) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fallbackScreen}>
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.stateTitle}>Preparing camera</Text>
          <Text style={styles.stateDescription}>
            Getting barcode scanning ready.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fallbackScreen}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Allow camera access</Text>
          <Text style={styles.stateDescription}>
            Camera permission is needed to scan a product barcode.
          </Text>
          <View style={styles.stateActions}>
            <AppButton label="Allow camera" onPress={() => void requestPermission()} />
            <AppButton label="Go back" onPress={() => router.back()} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (mountError) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fallbackScreen}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Camera unavailable</Text>
          <Text style={styles.stateDescription}>{mountError}</Text>
          <View style={styles.stateActions}>
            <AppButton label="Go back" onPress={() => router.back()} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          active={!hasScanned}
          barcodeScannerSettings={{
            barcodeTypes: SCANNABLE_BARCODE_TYPES,
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
          onMountError={(event) => setMountError(event.message)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.overlayRoot}>
        <View style={styles.overlayTop}>
          <Text style={styles.overlayTitle}>สแกนบาร์โค้ด</Text>
          <Text style={styles.overlayDescription}>
            สแกนสินค้าเพื่อเปิดฟอร์มวัตถุดิบพร้อมข้อมูลที่หาได้จาก mock database
          </Text>
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>How it works</Text>
            <Text style={styles.tipText}>
              If the barcode matches a mock product, the ingredient form will be prefilled.
              If not, the barcode is still carried over so you can finish the details manually.
            </Text>
          </View>
          <AppButton label="Cancel" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  fallbackScreen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  stateTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateDescription: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  overlayRoot: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  overlayTop: {
    gap: spacing.sm,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  overlayDescription: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 420,
  },
  overlayBottom: {
    gap: spacing.md,
  },
  tipCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(17, 17, 17, 0.56)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tipTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  tipText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
});
