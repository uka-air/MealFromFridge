import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { ChipSelect, type SelectOption } from "@/components/chip-select";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { IngredientCard } from "@/components/ingredient-card";
import { Screen } from "@/components/screen";
import { SectionCard } from "@/components/section-card";
import { palette, spacing } from "@/constants/theme";
import { useInventoryStore } from "@/store/useInventoryStore";
import {
  INGREDIENT_CATEGORIES,
  type Ingredient,
  type IngredientCategory,
} from "@/types/ingredient";
import { isIngredientActive } from "@/utils/inventory";

type IngredientCategoryFilter = IngredientCategory | "all";

const categoryOptions: SelectOption<IngredientCategoryFilter>[] = [
  {
    label: "All",
    value: "all",
  },
  ...INGREDIENT_CATEGORIES.map((value) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  })),
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function InventoryScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const deleteIngredient = useInventoryStore((state) => state.deleteIngredient);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<IngredientCategoryFilter>("all");
  const activeIngredients = useMemo(
    () => ingredients.filter(isIngredientActive),
    [ingredients],
  );

  const filteredIngredients = useMemo(() => {
    const normalizedSearchQuery = normalize(searchQuery);

    return activeIngredients.filter((ingredient) => {
      const matchesSearch =
        !normalizedSearchQuery ||
        normalize(ingredient.name).includes(normalizedSearchQuery);
      const matchesCategory =
        categoryFilter === "all" || ingredient.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [activeIngredients, categoryFilter, searchQuery]);

  const handleDelete = (ingredient: Ingredient) => {
    Alert.alert("ลบวัตถุดิบ?", `ลบ ${ingredient.name} จากสตอค?`, [
      {
        text: "ยกเลิก",
        style: "cancel",
      },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => deleteIngredient(ingredient.id),
      },
    ]);
  };

  return (
    <Screen
      title="สต็อกวัตถุดิบ"
      subtitle="ติดตามของที่มี ค้นหาได้เร็ว และค้นของที่ต้องใช้ง่ายขึ้น"
    >
      <View style={styles.actionsRow}>
        <AppButton
          label="เพิ่มวัตถุดิบ"
          onPress={() => router.push("/inventory/ingredient-form")}
        />
        <AppButton
          label="ดูคำแนะนำ"
          onPress={() => router.push("/suggestions")}
          variant="secondary"
        />
      </View>

      <SectionCard
        title="ค้นหาวัตถุดิบ"
        subtitle="ค้นหาตามชื่อและจำกัดรายการตามหมวดหมู่."
      >
        <FormField
          autoCapitalize="none"
          label="ค้นหาวัตถุดิบ"
          onChangeText={setSearchQuery}
          placeholder="ค้นหา ไข่, ผัก, นม..."
          value={searchQuery}
        />
        <ChipSelect
          label="ประเภทวัตถุดิบ"
          onChange={setCategoryFilter}
          options={categoryOptions}
          value={categoryFilter}
        />
        <Text style={styles.resultCount}>
          {filteredIngredients.length} of {activeIngredients.length} ingredient
          {activeIngredients.length === 1 ? "" : "s"}
        </Text>
        {!!filteredIngredients.length && (
          <Text style={styles.helperText}>
            Tap any ingredient card to edit it.
          </Text>
        )}
      </SectionCard>

      {activeIngredients.length ? (
        filteredIngredients.length ? (
          <View style={styles.listGroup}>
            {filteredIngredients.map((ingredient) => (
              <IngredientCard
                ingredient={ingredient}
                key={ingredient.id}
                onDelete={() => handleDelete(ingredient)}
                onPress={() =>
                  router.push({
                    pathname: "/inventory/ingredient-form",
                    params: { id: ingredient.id },
                  })
                }
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="ลองใช้คำค้นหาอื่นหรือเปลี่ยนตัวกรองหมวดหมู่เพื่อดูวัตถุดิบเพิ่มเติม"
            title="ไม่มีวัตถุดิบที่ตรงกัน"
          />
        )
      ) : (
        <EmptyState
          description="เพิ่มวัตถุดิบบางอย่างพร้อมปริมาณและวันหมดอายุ (ถ้ามี) นี่จะกลายเป็นพื้นฐานสำหรับการจับคู่สูตรอาหาร"
          title="สตอคของคุณว่าง"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  listGroup: {
    gap: spacing.md,
  },
  resultCount: {
    color: palette.textMuted,
    fontSize: 13,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});
