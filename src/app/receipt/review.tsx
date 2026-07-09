import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/app-button';
import { ChipSelect, type SelectOption } from '@/components/chip-select';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useReceiptImportStore } from '@/store/useReceiptImportStore';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '@/types/ingredient';
import type { ParsedReceiptItem, ReceiptReviewItem } from '@/types/receipt';
import { isValidDateInput } from '@/utils/date';
import { suggestExpiryDate } from '@/utils/expirySuggestion';
import {
  buildMergeIngredientUpdate,
  findDuplicateActiveIngredient,
  normalizeReceiptUnitToIngredientUnit,
} from '@/utils/receiptImport';
import { createId } from '@/utils/id';
import { isIngredientActive } from '@/utils/inventory';
import { categoryLabel } from '@/utils/receiptParser';

const categoryOptions: SelectOption<IngredientCategory>[] = INGREDIENT_CATEGORIES.map((category) => ({
  label: categoryLabel(category),
  value: category,
}));

const duplicateActionOptions = (hasDuplicate: boolean): SelectOption<ReceiptReviewItem['duplicateAction']>[] =>
  hasDuplicate
    ? [
        { label: 'ให้เลือกก่อน', value: 'ask' },
        { label: 'รวมปริมาณ', value: 'merge' },
        { label: 'เพิ่มแยกชิ้น', value: 'separate' },
        { label: 'ข้ามรายการนี้', value: 'skip' },
      ]
    : [{ label: 'เพิ่มแยกชิ้น', value: 'separate' }];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getConfidencePresentation(confidence: number) {
  if (confidence >= 0.75) {
    return {
      label: 'มั่นใจสูง',
      containerStyle: styles.confidenceHigh,
      textStyle: styles.confidenceHighText,
    };
  }

  if (confidence >= 0.55) {
    return {
      label: 'ควรตรวจอีกนิด',
      containerStyle: styles.confidenceMedium,
      textStyle: styles.confidenceMediumText,
    };
  }

  return {
    label: 'ความมั่นใจต่ำ',
    containerStyle: styles.confidenceLow,
    textStyle: styles.confidenceLowText,
  };
}

function toParsedReceiptItem(reviewItem: ReceiptReviewItem): ParsedReceiptItem {
  const parsedQuantity = Number(reviewItem.quantity);

  return {
    rawLine: reviewItem.rawLine,
    name: reviewItem.name.trim(),
    quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : undefined,
    unit: reviewItem.unit.trim() || undefined,
    price: reviewItem.price,
    barcode: reviewItem.barcode,
    confidence: reviewItem.confidence,
    category: reviewItem.category,
  };
}

function ReceiptItemEditor({
  duplicateName,
  hasDuplicate,
  item,
  onChange,
  onToggleInclude,
}: {
  duplicateName?: string;
  hasDuplicate: boolean;
  item: ReceiptReviewItem;
  onChange: (updates: Partial<ReceiptReviewItem>) => void;
  onToggleInclude: () => void;
}) {
  const confidence = getConfidencePresentation(item.confidence);

  return (
    <View style={[styles.itemCard, !item.included && styles.itemCardMuted]}>
      <View style={styles.itemHeader}>
        <Pressable onPress={onToggleInclude} style={styles.checkboxRow}>
          <View style={[styles.checkbox, item.included && styles.checkboxActive]}>
            {item.included ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <View style={styles.itemHeaderCopy}>
            <Text style={styles.itemTitle}>{item.name || 'ยังไม่มีชื่อสินค้า'}</Text>
            <Text style={styles.itemRawLine}>{item.rawLine}</Text>
          </View>
        </Pressable>
        <View style={[styles.confidenceBadge, confidence.containerStyle]}>
          <Text style={[styles.confidenceText, confidence.textStyle]}>{confidence.label}</Text>
        </View>
      </View>

      {hasDuplicate ? (
        <View style={styles.duplicateNotice}>
          <Text style={styles.duplicateNoticeText}>ซ้ำกับสต็อกเดิม: {duplicateName}</Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>ชื่อสินค้า</Text>
        <TextInput
          onChangeText={(value) => onChange({ name: value })}
          placeholder="ชื่อวัตถุดิบ"
          placeholderTextColor={palette.textMuted}
          style={styles.fieldInput}
          value={item.name}
        />
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.inlineField}>
          <Text style={styles.fieldLabel}>ปริมาณ</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => onChange({ quantity: value })}
            placeholder="1"
            placeholderTextColor={palette.textMuted}
            style={styles.fieldInput}
            value={item.quantity}
          />
        </View>
        <View style={styles.inlineField}>
          <Text style={styles.fieldLabel}>หน่วย</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => onChange({ unit: value })}
            placeholder="item / g / pack"
            placeholderTextColor={palette.textMuted}
            style={styles.fieldInput}
            value={item.unit}
          />
        </View>
      </View>

      <ChipSelect
        label="หมวดหมู่"
        onChange={(value) => onChange({ category: value })}
        options={categoryOptions}
        value={item.category}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>วันหมดอายุ</Text>
        <TextInput
          autoCapitalize="none"
          onChangeText={(value) => onChange({ expiresAt: value })}
          placeholder="YYYY-MM-DD หรือเว้นว่าง"
          placeholderTextColor={palette.textMuted}
          style={styles.fieldInput}
          value={item.expiresAt}
        />
      </View>

      <ChipSelect
        label="จัดการรายการซ้ำ"
        onChange={(value) => onChange({ duplicateAction: value })}
        options={duplicateActionOptions(hasDuplicate)}
        value={hasDuplicate ? item.duplicateAction : 'separate'}
      />
    </View>
  );
}

export default function ReceiptReviewScreen() {
  const router = useRouter();
  const draftImport = useReceiptImportStore((state) => state.draftImport);
  const setDraftImport = useReceiptImportStore((state) => state.setDraftImport);
  const clearDraftImport = useReceiptImportStore((state) => state.clearDraftImport);
  const addReceiptImportHistory = useReceiptImportStore(
    (state) => state.addReceiptImportHistory
  );

  const inventoryIngredients = useInventoryStore((state) => state.ingredients);
  const addIngredient = useInventoryStore((state) => state.addIngredient);
  const updateIngredient = useInventoryStore((state) => state.updateIngredient);

  const activeIngredients = useMemo(
    () => inventoryIngredients.filter(isIngredientActive),
    [inventoryIngredients]
  );
  const [bulkPurchasedAt, setBulkPurchasedAt] = useState(
    draftImport?.purchasedAt ?? ''
  );

  const duplicateMap = useMemo(() => {
    if (!draftImport) {
      return {};
    }

    return Object.fromEntries(
      draftImport.items.map((item) => {
        const normalizedUnit = normalizeReceiptUnitToIngredientUnit(item.unit);
        const duplicate = normalizedUnit
          ? findDuplicateActiveIngredient(activeIngredients, item.name, normalizedUnit)
          : undefined;

        return [item.id, duplicate];
      })
    );
  }, [activeIngredients, draftImport]);

  const lowConfidenceCount = useMemo(
    () =>
      draftImport?.items.filter((item) => item.confidence < 0.55).length ?? 0,
    [draftImport]
  );

  const updateReviewItem = (itemId: string, updates: Partial<ReceiptReviewItem>) => {
    if (!draftImport) {
      return;
    }

    setDraftImport({
      ...draftImport,
      items: draftImport.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              duplicateAction:
                updates.name !== undefined || updates.unit !== undefined
                  ? 'ask'
                  : updates.duplicateAction ?? item.duplicateAction,
            }
          : item
      ),
    });
  };

  const setAllIncluded = (included: boolean) => {
    if (!draftImport) {
      return;
    }

    setDraftImport({
      ...draftImport,
      items: draftImport.items.map((item) => ({
        ...item,
        included,
      })),
    });
  };

  const applyBulkPurchasedAt = () => {
    if (!draftImport) {
      return;
    }

    if (!isValidDateInput(bulkPurchasedAt)) {
      Alert.alert('วันที่ซื้อไม่ถูกต้อง', 'กรุณาใช้รูปแบบ YYYY-MM-DD');
      return;
    }

    setDraftImport({
      ...draftImport,
      purchasedAt: bulkPurchasedAt,
    });
  };

  const applySuggestedExpiryDates = () => {
    if (!draftImport) {
      return;
    }

    setDraftImport({
      ...draftImport,
      items: draftImport.items.map((item) => ({
        ...item,
        expiresAt:
          suggestExpiryDate(
            {
              name: item.name,
              category: item.category,
            },
            bulkPurchasedAt || draftImport.purchasedAt
          ) ?? '',
      })),
    });
  };

  const handleCancel = () => {
    Alert.alert('ยกเลิกการนำเข้า?', 'รายการที่อ่านจากใบเสร็จหน้านี้จะถูกล้างออก', [
      {
        text: 'กลับไปแก้ต่อ',
        style: 'cancel',
      },
      {
        text: 'ยกเลิก',
        style: 'destructive',
        onPress: () => {
          clearDraftImport();
          router.back();
        },
      },
    ]);
  };

  const handleAddToInventory = () => {
    if (!draftImport) {
      return;
    }

    const purchasedAt = bulkPurchasedAt || draftImport.purchasedAt;
    if (!isValidDateInput(purchasedAt)) {
      Alert.alert('วันที่ซื้อไม่ถูกต้อง', 'กรุณาใช้รูปแบบ YYYY-MM-DD ก่อนเพิ่มเข้าสต็อก');
      return;
    }

    const unresolvedDuplicate = draftImport.items.find((item) => {
      const duplicate = duplicateMap[item.id];
      return item.included && duplicate && item.duplicateAction === 'ask';
    });

    if (unresolvedDuplicate) {
      Alert.alert(
        'ยังมีรายการซ้ำที่ต้องตัดสินใจ',
        `กรุณาเลือกว่าจะรวม แยก หรือข้าม สำหรับ ${unresolvedDuplicate.name}`
      );
      return;
    }

    const invalidItem = draftImport.items.find((item) => {
      if (!item.included || item.duplicateAction === 'skip') {
        return false;
      }

      if (!item.name.trim()) {
        return true;
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return true;
      }

      if (item.expiresAt.trim() && !isValidDateInput(item.expiresAt.trim())) {
        return true;
      }

      return normalizeReceiptUnitToIngredientUnit(item.unit.trim()) === null;
    });

    if (invalidItem) {
      Alert.alert(
        'ข้อมูลบางรายการยังไม่พร้อม',
        `ตรวจสอบชื่อ ปริมาณ หน่วย หรือวันหมดอายุของ ${invalidItem.name || invalidItem.rawLine}`
      );
      return;
    }

    const addedIngredientIds: string[] = [];
    const skippedItems: ParsedReceiptItem[] = [];

    draftImport.items.forEach((item) => {
      if (!item.included || item.duplicateAction === 'skip') {
        skippedItems.push(toParsedReceiptItem(item));
        return;
      }

      const quantity = Number(item.quantity);
      const normalizedUnit = normalizeReceiptUnitToIngredientUnit(item.unit.trim());
      if (!normalizedUnit) {
        skippedItems.push(toParsedReceiptItem(item));
        return;
      }

      const duplicate = findDuplicateActiveIngredient(activeIngredients, item.name, normalizedUnit);
      if (duplicate && item.duplicateAction === 'merge') {
        const latestDuplicate =
          useInventoryStore
            .getState()
            .ingredients.find((ingredient) => ingredient.id === duplicate.id) ?? duplicate;
        updateIngredient(
          duplicate.id,
          buildMergeIngredientUpdate(
            latestDuplicate,
            item,
            quantity,
            normalizedUnit,
            purchasedAt
          )
        );
        addedIngredientIds.push(duplicate.id);
        return;
      }

      const ingredient = addIngredient({
        name: item.name.trim(),
        quantity,
        unit: normalizedUnit,
        category: item.category,
        purchasedAt,
        expiresAt: item.expiresAt.trim() || null,
        note: `Receipt: ${item.rawLine}`,
        source: 'receipt',
        receiptRawLine: item.rawLine,
        price: item.price ?? null,
      });
      addedIngredientIds.push(ingredient.id);
    });

    addReceiptImportHistory({
      id: createId('receipt-import'),
      importedAt: new Date().toISOString(),
      storeName: draftImport.parsedReceipt.storeName,
      purchasedAt,
      imageUri: draftImport.imageUri,
      rawText: draftImport.parsedReceipt.rawText,
      addedIngredientIds: [...new Set(addedIngredientIds)],
      skippedItems,
    });

    clearDraftImport();
    Alert.alert(
      'เพิ่มเข้าสต็อกแล้ว',
      `เพิ่มหรืออัปเดตวัตถุดิบ ${[...new Set(addedIngredientIds)].length} รายการ`
    );
    router.replace('/inventory');
  };

  if (!draftImport) {
    return (
      <Screen
        title="ตรวจสอบรายการจากใบเสร็จ"
        subtitle="ยังไม่มีรายการใบเสร็จที่พร้อมให้ตรวจสอบตอนนี้">
        <EmptyState
          title="ยังไม่มีข้อมูลใบเสร็จ"
          description="เริ่มจากการถ่ายรูปหรือเลือกรูปใบเสร็จก่อน แล้วค่อยกลับมาตรวจรายการอีกครั้ง"
        />
        <AppButton label="ไปสแกนใบเสร็จ" onPress={() => router.replace('/receipt/scan')} />
      </Screen>
    );
  }

  return (
    <Screen
      title="ตรวจสอบรายการจากใบเสร็จ"
      subtitle="แก้ชื่อ ปริมาณ หน่วย และวันหมดอายุได้ก่อนเพิ่มเข้าสต็อกจริง">
      <SectionCard
        title={draftImport.parsedReceipt.storeName ?? 'นำเข้าจากใบเสร็จ'}
        subtitle={`เจอ ${draftImport.items.length} รายการจาก OCR แบบจำลอง`}>
        <Text style={styles.metaText}>วันที่ซื้อ: {draftImport.purchasedAt}</Text>
        {draftImport.parsedReceipt.total !== undefined ? (
          <Text style={styles.metaText}>ยอดรวม: {draftImport.parsedReceipt.total.toFixed(2)}</Text>
        ) : null}
        {lowConfidenceCount ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              มี {lowConfidenceCount} รายการที่ความมั่นใจต่ำ ควรตรวจชื่อและหน่วยก่อนเพิ่มเข้าสต็อก
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="จัดการหลายรายการพร้อมกัน" subtitle="เลือกทั้งหมด ตั้งวันที่ซื้อ และคำนวณวันหมดอายุแบบเร็ว ๆ">
        <View style={styles.actionsRow}>
          <AppButton label="เลือกทั้งหมด" onPress={() => setAllIncluded(true)} variant="secondary" />
          <AppButton label="ไม่เลือกทั้งหมด" onPress={() => setAllIncluded(false)} variant="secondary" />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>วันที่ซื้อสำหรับทั้งหมด</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setBulkPurchasedAt}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.textMuted}
            style={styles.fieldInput}
            value={bulkPurchasedAt}
          />
        </View>
        <View style={styles.actionsRow}>
          <AppButton label="ตั้งวันที่ซื้อ" onPress={applyBulkPurchasedAt} variant="secondary" />
          <AppButton label="ตั้งหมดอายุอัตโนมัติ" onPress={applySuggestedExpiryDates} variant="secondary" />
        </View>
      </SectionCard>

      <SectionCard title="แก้ไขรายการ" subtitle="ติ๊กออกได้ถ้าไม่ใช่วัตถุดิบ หรือเลือกวิธีจัดการกรณีรายการซ้ำ">
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}>
          {draftImport.items.map((item) => {
            const duplicate = duplicateMap[item.id];
            const normalizedUnit = normalizeReceiptUnitToIngredientUnit(item.unit.trim());
            const hasDuplicate =
              !!duplicate &&
              normalizedUnit !== null &&
              duplicate.unit === normalizedUnit &&
              normalize(duplicate.name) === normalize(item.name);

            return (
              <ReceiptItemEditor
                duplicateName={duplicate?.name}
                hasDuplicate={hasDuplicate}
                item={item}
                key={item.id}
                onChange={(updates) => updateReviewItem(item.id, updates)}
                onToggleInclude={() =>
                  updateReviewItem(item.id, {
                    included: !item.included,
                  })
                }
              />
            );
          })}
        </ScrollView>
      </SectionCard>

      <View style={styles.actionsColumn}>
        <AppButton label="เพิ่มเข้าสต็อก" onPress={handleAddToInventory} />
        <AppButton label="ยกเลิก" onPress={handleCancel} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaText: {
    color: palette.textMuted,
    fontSize: 14,
  },
  warningBanner: {
    borderRadius: radius.md,
    backgroundColor: palette.warningSoft,
    borderWidth: 1,
    borderColor: palette.warning,
    padding: spacing.md,
  },
  warningBannerText: {
    color: palette.warning,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionsColumn: {
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  editorScroll: {
    maxHeight: 860,
  },
  editorScrollContent: {
    gap: spacing.md,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.md,
  },
  itemCardMuted: {
    opacity: 0.6,
  },
  itemHeader: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  checkboxTick: {
    color: palette.accentStrong,
    fontSize: 14,
    fontWeight: '800',
  },
  itemHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemRawLine: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidenceHigh: {
    backgroundColor: palette.successSoft,
  },
  confidenceHighText: {
    color: palette.success,
  },
  confidenceMedium: {
    backgroundColor: palette.warningSoft,
  },
  confidenceMediumText: {
    color: palette.warning,
  },
  confidenceLow: {
    backgroundColor: palette.dangerSoft,
  },
  confidenceLowText: {
    color: palette.danger,
  },
  duplicateNotice: {
    borderRadius: radius.md,
    backgroundColor: palette.infoSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  duplicateNoticeText: {
    color: palette.info,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
    gap: spacing.sm,
  },
});
