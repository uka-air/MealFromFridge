import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, spacing } from '@/constants/theme';
import { useCookingHistoryStore } from '@/store/useCookingHistoryStore';
import { useCookingSessionStore } from '@/store/useCookingSessionStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import type { RecipeDeductionItem, RecipeDeductionPlan, RecipeDeductionSkippedItem } from '@/types/cooking';
import { isIngredientActive } from '@/utils/inventory';
import { applyRecipeDeduction, calculateRecipeDeduction } from '@/utils/recipe-deduction';

function clampQuantity(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatQuantity(quantity?: number, unit?: string) {
  if (quantity === undefined) {
    return 'ไม่ระบุ';
  }

  return `${quantity} ${unit ?? ''}`.trim();
}

function buildAdjustedPlan(
  deductionPlan: RecipeDeductionPlan,
  draftQuantities: Record<string, string>
): RecipeDeductionPlan {
  return {
    ...deductionPlan,
    deductibleItems: deductionPlan.deductibleItems.map((item) => {
      const draftValue = draftQuantities[item.inventoryIngredientId];
      const parsedQuantity = Number(draftValue);
      const nextDeductionQuantity =
        draftValue?.trim().length && Number.isFinite(parsedQuantity)
          ? clampQuantity(parsedQuantity, 0, item.currentQuantity)
          : 0;

      return {
        ...item,
        deductionQuantity: nextDeductionQuantity,
        remainingQuantity: Math.max(0, item.currentQuantity - nextDeductionQuantity),
      };
    }),
  };
}

function DeductionItemCard({
  item,
  value,
  onChange,
}: {
  item: RecipeDeductionItem;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.inventoryIngredientName}</Text>
        <View style={styles.unitBadge}>
          <Text style={styles.unitBadgeText}>{item.unit}</Text>
        </View>
      </View>

      <Text style={styles.itemMeta}>
        ใช้กับ: {item.matchedRecipeIngredients.map((ingredient) => ingredient.recipeIngredientName).join(', ')}
      </Text>
      <Text style={styles.itemMeta}>
        สูตรต้องการ:{' '}
        {item.matchedRecipeIngredients
          .map((ingredient) => formatQuantity(ingredient.recipeQuantity, ingredient.recipeUnit))
          .join(' + ')}
      </Text>
      <Text style={styles.itemMeta}>สต็อกปัจจุบัน: {formatQuantity(item.currentQuantity, item.unit)}</Text>
      <Text style={styles.itemMeta}>จะเหลือ: {formatQuantity(item.remainingQuantity, item.unit)}</Text>

      <View style={styles.quantityEditor}>
        <Text style={styles.editorLabel}>จำนวนที่จะตัด</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={palette.textMuted}
          style={styles.quantityInput}
          value={value}
        />
      </View>
    </View>
  );
}

function SkippedIngredientList({
  items,
}: {
  items: RecipeDeductionSkippedItem[];
}) {
  return (
    <View style={styles.listGroup}>
      {items.map((item) => (
        <View key={`${item.recipeIngredientId}-${item.reason}`} style={styles.skippedRow}>
          <Text style={styles.skippedTitle}>{item.recipeIngredientName}</Text>
          <Text style={styles.skippedMeta}>
            {item.inventoryIngredientName
              ? `${item.inventoryIngredientName} • สต็อก ${formatQuantity(
                  item.inventoryQuantity,
                  item.inventoryUnit
                )}`
              : 'ยังไม่มีในสต็อก'}
          </Text>
          <Text style={styles.skippedMeta}>
            {item.recipeQuantity !== undefined
              ? `สูตรต้องการ ${formatQuantity(item.recipeQuantity, item.recipeUnit)}`
              : 'สูตรไม่ได้ระบุจำนวน/หน่วย'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function CookConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof params.id === 'string' ? params.id : undefined;

  const inventoryIngredients = useInventoryStore((state) => state.ingredients);
  const applyIngredientQuantityPatches = useInventoryStore(
    (state) => state.applyIngredientQuantityPatches
  );
  const recipes = useRecipeStore((state) => state.recipes);
  const addCookingHistoryRecord = useCookingHistoryStore(
    (state) => state.addCookingHistoryRecord
  );
  const setPendingUndoHistory = useCookingSessionStore(
    (state) => state.setPendingUndoHistory
  );

  const recipe = recipes.find((item) => item.id === recipeId);
  const activeInventory = useMemo(
    () => inventoryIngredients.filter(isIngredientActive),
    [inventoryIngredients]
  );
  const basePlan = useMemo(
    () => (recipe ? calculateRecipeDeduction(recipe, activeInventory) : null),
    [activeInventory, recipe]
  );
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!basePlan) {
      setDraftQuantities({});
      return;
    }

    setDraftQuantities(
      Object.fromEntries(
        basePlan.deductibleItems.map((item) => [
          item.inventoryIngredientId,
          String(item.deductionQuantity),
        ])
      )
    );
  }, [basePlan]);

  const adjustedPlan = useMemo(
    () => (basePlan ? buildAdjustedPlan(basePlan, draftQuantities) : null),
    [basePlan, draftQuantities]
  );

  const handleConfirm = () => {
    if (!adjustedPlan) {
      return;
    }

    const result = applyRecipeDeduction(adjustedPlan);
    applyIngredientQuantityPatches(result.ingredientPatches);
    addCookingHistoryRecord(result.historyRecord);
    setPendingUndoHistory(result.historyRecord);
    router.back();
  };

  if (!recipe || !adjustedPlan) {
    return (
      <Screen title="ยืนยันว่าทำเมนูนี้?" subtitle="ไม่พบสูตรอาหารที่ต้องการทำในตอนนี้">
        <EmptyState
          title="ไม่พบสูตรอาหาร"
          description="สูตรอาจถูกลบหรือยังโหลดไม่เสร็จ ลองกลับไปเลือกเมนูอีกครั้ง"
        />
        <AppButton label="กลับไปที่สูตรอาหาร" onPress={() => router.replace('/recipes')} />
      </Screen>
    );
  }

  const optionalUnavailableItems = adjustedPlan.skippedItems.filter(
    (item) => item.reason === 'optional_not_available'
  );

  return (
    <Screen
      title="ยืนยันว่าทำเมนูนี้?"
      subtitle="ตรวจสอบจำนวนที่จะตัดก่อนยืนยัน คุณยังปรับจำนวนเองได้ถ้าทำจริงไม่ตรงสูตร">
      <SectionCard title={recipe.name} subtitle="สรุปสิ่งที่จะเกิดกับสต็อกหลังทำเมนูนี้">
        <Text style={styles.summaryText}>
          ตรงวัตถุดิบหลัก {adjustedPlan.matchedRequiredIngredientCount} จาก{' '}
          {adjustedPlan.requiredIngredientCount} อย่าง
        </Text>
        {adjustedPlan.allRequiredIngredientsMissing ? (
          <Text style={styles.warningText}>ยังไม่มีวัตถุดิบพอทำเมนูนี้</Text>
        ) : null}
      </SectionCard>

      <SectionCard
        title="วัตถุดิบที่จะตัด"
        subtitle="แก้จำนวนที่จะตัดได้ก่อนกดยืนยัน ระบบจะไม่ตัดเกินจากสต็อกที่มี">
        {adjustedPlan.deductibleItems.length ? (
          <View style={styles.listGroup}>
            {adjustedPlan.deductibleItems.map((item) => (
              <DeductionItemCard
                item={item}
                key={item.inventoryIngredientId}
                onChange={(value) =>
                  setDraftQuantities((current) => ({
                    ...current,
                    [item.inventoryIngredientId]: value,
                  }))
                }
                value={draftQuantities[item.inventoryIngredientId] ?? ''}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>
            ไม่มีรายการที่ระบบตัดอัตโนมัติได้ คุณยังทำเมนูนี้ต่อได้ถ้าจะจัดการสต็อกเอง
          </Text>
        )}
      </SectionCard>

      {adjustedPlan.missingIngredients.length ? (
        <SectionCard title="วัตถุดิบที่ยังขาด" subtitle="ยังไม่มีในสต็อกตอนนี้">
          <SkippedIngredientList items={adjustedPlan.missingIngredients} />
        </SectionCard>
      ) : null}

      {adjustedPlan.ingredientsWithoutQuantity.length ? (
        <SectionCard
          title="วัตถุดิบที่ข้อมูลยังไม่ครบ"
          subtitle="สูตรหรือสต็อกยังไม่มีข้อมูลปริมาณ/หน่วยที่ใช้ตัดอัตโนมัติ">
          <SkippedIngredientList items={adjustedPlan.ingredientsWithoutQuantity} />
        </SectionCard>
      ) : null}

      {adjustedPlan.manualAdjustmentItems.length ? (
        <SectionCard title="ต้องปรับเอง" subtitle="หน่วยไม่ตรงกัน จึงยังไม่ตัดให้อัตโนมัติ">
          <SkippedIngredientList items={adjustedPlan.manualAdjustmentItems} />
        </SectionCard>
      ) : null}

      {optionalUnavailableItems.length ? (
        <SectionCard
          title="วัตถุดิบเสริมที่ไม่มีตอนนี้"
          subtitle="เป็นของเสริม จึงไม่บล็อกการทำเมนู">
          <SkippedIngredientList items={optionalUnavailableItems} />
        </SectionCard>
      ) : null}

      <View style={styles.actionsRow}>
        <AppButton label="ย้อนกลับ" onPress={() => router.back()} variant="secondary" />
        <AppButton
          disabled={!adjustedPlan.canCook}
          label="ยืนยันและตัดสต็อก"
          onPress={handleConfirm}
          style={styles.confirmButton}
        />
      </View>
      {!adjustedPlan.canCook ? (
        <Text style={styles.disabledHint}>ยังไม่มีวัตถุดิบพอทำเมนูนี้</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  warningText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  mutedText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  listGroup: {
    gap: spacing.md,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  unitBadge: {
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  unitBadgeText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  itemMeta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  quantityEditor: {
    gap: spacing.sm,
  },
  editorLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    color: palette.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  skippedRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  skippedTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  skippedMeta: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
  disabledHint: {
    color: palette.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});
