import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { EmptyState } from "@/components/empty-state";
import { HomeHeader } from "@/components/home-header";
import { type HomeShortcutMenuItem } from "@/components/home-shortcut-menu";
import { RecipeCard } from "@/components/recipe-card";
import { Screen } from "@/components/screen";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { palette, spacing } from "@/constants/theme";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useRecipeStore } from "@/store/useRecipeStore";
import { formatDate, isExpired, isExpiringSoon } from "@/utils/date";
import { isIngredientActive } from "@/utils/inventory";
import { calculateRecipeDeduction } from "@/utils/recipe-deduction";
import { buildRecipeSuggestions } from "@/utils/suggestionEngine";

type SuggestionMode = "expiring" | "easy";

const EASY_RECIPE_TAGS = ["เร็ว", "ทำง่าย"];

function getSuggestionSectionSubtitle(mode: SuggestionMode) {
  if (mode === "easy") {
    return "เมนูที่เน้นทำง่ายและใช้เวลาน้อยที่สุดจากวัตถุดิบที่มีตอนนี้";
  }

  return "เมนูที่ช่วยใช้วัตถุดิบใกล้หมดอายุให้คุ้มที่สุดก่อน";
}

export default function HomeScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const loadDevelopmentInventorySeedData = useInventoryStore(
    (state) => state.loadDevelopmentSeedData,
  );
  const recipes = useRecipeStore((state) => state.recipes);
  const loadDevelopmentRecipeSeedData = useRecipeStore(
    (state) => state.loadDevelopmentSeedData,
  );
  const [suggestionMode, setSuggestionMode] =
    useState<SuggestionMode>("expiring");
  const activeIngredients = useMemo(
    () => ingredients.filter(isIngredientActive),
    [ingredients],
  );

  const expiringSoonItems = useMemo(
    () => activeIngredients.filter((item) => isExpiringSoon(item.expiresAt, 3)),
    [activeIngredients],
  );
  const expiredItems = useMemo(
    () => activeIngredients.filter((item) => isExpired(item.expiresAt)),
    [activeIngredients],
  );
  const favoriteRecipesCount = useMemo(
    () => recipes.filter((recipe) => recipe.isFavorite).length,
    [recipes],
  );
  const topSuggestions = useMemo(() => {
    if (!activeIngredients.length || !recipes.length) {
      return [];
    }

    const selectedTags =
      suggestionMode === "easy" ? EASY_RECIPE_TAGS : undefined;

    return buildRecipeSuggestions(activeIngredients, recipes, {
      preferExpiringSoon: suggestionMode === "expiring",
      maxMissingIngredients: 3,
      selectedTags,
    }).slice(0, 3);
  }, [activeIngredients, recipes, suggestionMode]);
  const topSuggestionPlans = useMemo(
    () =>
      Object.fromEntries(
        topSuggestions.map((suggestion) => [
          suggestion.recipe.id,
          calculateRecipeDeduction(suggestion.recipe, activeIngredients),
        ]),
      ),
    [activeIngredients, topSuggestions],
  );
  const highlightedExpiringItems = useMemo(
    () => expiringSoonItems.slice(0, 4),
    [expiringSoonItems],
  );
  const shortcutMenuItems = useMemo<HomeShortcutMenuItem[]>(() => {
    const items: HomeShortcutMenuItem[] = [
      {
        key: "suggest-expiring",
        label: "ของใกล้เสียก่อน",
        helper: "เน้นวัตถุดิบที่ควรใช้ในช่วง 3 วันถัดไป",
        isActive: suggestionMode === "expiring",
        onPress: () => setSuggestionMode("expiring"),
      },
      {
        key: "suggest-easy",
        label: "เมนูง่ายสุด",
        helper: "จัดอันดับสูตรที่ทำง่ายและใช้เวลาน้อยกว่า",
        isActive: suggestionMode === "easy",
        onPress: () => setSuggestionMode("easy"),
      },
      {
        key: "inventory-all",
        label: "วัตถุดิบทั้งหมด",
        helper: "เปิดคลังวัตถุดิบทั้งหมด",
        onPress: () => router.push("/inventory"),
      },
      {
        key: "inventory-add",
        label: "เพิ่มวัตถุดิบ",
        helper: "บันทึกของใหม่เข้าตู้เย็น",
        onPress: () => router.push("/inventory/ingredient-form"),
      },
      {
        key: "recipes-all",
        label: "อาหารทั้งหมด",
        helper: "ดูสูตรอาหารที่บันทึกไว้",
        onPress: () => router.push("/recipes"),
      },
      {
        key: "recipes-add",
        label: "เพิ่มสูตรอาหาร",
        helper: "สร้างสูตรอาหารใหม่",
        onPress: () => router.push("/recipes/recipe-form"),
      },
    ];

    if (__DEV__) {
      items.push({
        key: "seed-dev-data",
        label: "เติมข้อมูลตัวอย่าง",
        helper: "โหลดวัตถุดิบและสูตรตัวอย่างสำหรับทดสอบ",
        onPress: () => {
          loadDevelopmentInventorySeedData();
          loadDevelopmentRecipeSeedData();
          Alert.alert(
            "เติมข้อมูลตัวอย่างแล้ว",
            "เพิ่มวัตถุดิบตัวอย่าง 7 รายการและสูตรตัวอย่าง 6 เมนูเรียบร้อยแล้ว",
          );
        },
      });
    }

    return items;
  }, [
    loadDevelopmentInventorySeedData,
    loadDevelopmentRecipeSeedData,
    router,
    suggestionMode,
  ]);

  return (
    <>
      <Stack.Header asChild>
        <HomeHeader menuItems={shortcutMenuItems} title="Meal From Fridge" />
      </Stack.Header>

      <Screen
        title="วันนี้กินอะไรดี?"
        subtitle="ภาพรวมวัตถุดิบ เลือกแนวที่อยากได้ แล้วได้มื้อที่ถูกใจ"
      >
        <View style={styles.statGrid}>
          <StatCard
            helper="วัตถุดิบที่บันทึกไว้"
            label="วัตถุดิบทั้งหมด"
            value={String(activeIngredients.length)}
          />
          <StatCard
            helper="ควรใช้ก่อนใน 3 วัน"
            label="ใกล้หมดอายุ"
            value={String(expiringSoonItems.length)}
          />
          <StatCard
            helper="เลยวันหมดอายุแล้ว"
            label="หมดอายุ"
            value={String(expiredItems.length)}
          />
          <StatCard
            helper="สูตรที่ทำเครื่องหมายไว้"
            label="เมนูโปรด"
            value={String(favoriteRecipesCount)}
          />
        </View>

        <SectionCard
          title="เมนูแนะนำ 3 อันดับแรก"
          subtitle={getSuggestionSectionSubtitle(suggestionMode)}
        >
          {topSuggestions.length ? (
            <View style={styles.listGroup}>
              {topSuggestions.map((suggestion) => (
                <RecipeCard
                  key={suggestion.recipe.id}
                  footer={
                    <View style={styles.recipeSummary}>
                      <Text style={styles.recipeFooter}>
                        คะแนน {suggestion.score} • ตรงวัตถุดิบ{" "}
                        {suggestion.matchedIngredients.length} อย่าง
                      </Text>
                      {suggestion.expiringIngredientsUsed.length ? (
                        <Text style={styles.recipeFooter}>
                          ใช้วัตถุดิบใกล้หมดอายุ{" "}
                          {suggestion.expiringIngredientsUsed.length} อย่าง
                        </Text>
                      ) : null}
                      {suggestion.missingIngredients.length ? (
                        <Text style={styles.recipeFooter}>
                          ยังขาด:{" "}
                          {suggestion.missingIngredients
                            .map((item) => item.ingredientName)
                            .join(", ")}
                        </Text>
                      ) : (
                        <Text style={styles.recipeFooter}>
                          มีวัตถุดิบพร้อมทำแล้ว
                        </Text>
                      )}
                      <View style={styles.recipeActionRow}>
                        <AppButton
                          label="ดูสูตร"
                          onPress={() =>
                            router.push({
                              pathname: "/recipes/[id]",
                              params: { id: suggestion.recipe.id },
                            })
                          }
                          variant="secondary"
                        />
                        <AppButton
                          disabled={
                            topSuggestionPlans[suggestion.recipe.id]
                              ?.allRequiredIngredientsMissing ?? true
                          }
                          label="ทำเมนูนี้"
                          onPress={() =>
                            router.push({
                              pathname: "/recipes/cook-confirmation",
                              params: { id: suggestion.recipe.id },
                            })
                          }
                          style={styles.recipeActionButton}
                        />
                      </View>
                      {topSuggestionPlans[suggestion.recipe.id]
                        ?.allRequiredIngredientsMissing ? (
                        <Text style={styles.recipeWarning}>
                          ยังไม่มีวัตถุดิบพอทำเมนูนี้
                        </Text>
                      ) : null}
                    </View>
                  }
                  recipe={suggestion.recipe}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              description="เพิ่มวัตถุดิบและสูตรอาหารอีกนิด แล้วส่วนนี้จะเริ่มจัดอันดับเมนูที่เหมาะที่สุดให้เอง"
              title="ยังไม่มีเมนูที่แนะนำได้"
            />
          )}
          <AppButton
            label="เมนูแนะนำ"
            onPress={() => router.push("/suggestions")}
            style={{ marginTop: spacing.md }}
            variant="secondary"
          />
        </SectionCard>

        <SectionCard
          title="วัตถุดิบใกล้หมดอายุ"
          subtitle="เช็กของที่ควรหยิบมาใช้ก่อนในช่วง 3 วันนี้"
        >
          {highlightedExpiringItems.length ? (
            <View style={styles.listGroup}>
              {highlightedExpiringItems.map((item) => (
                <View key={item.id} style={styles.previewRow}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>{item.name}</Text>
                    <View style={styles.previewBadge}>
                      <Text style={styles.previewBadgeText}>ใกล้หมดอายุ</Text>
                    </View>
                  </View>
                  <Text style={styles.previewMeta}>
                    {item.quantity} {item.unit} • {item.category}
                  </Text>
                  <Text style={styles.previewMeta}>
                    {item.expiresAt
                      ? `หมดอายุ ${formatDate(item.expiresAt)}`
                      : "ยังไม่ได้ตั้งวันหมดอายุ"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              description="เมื่อเพิ่มวันหมดอายุให้วัตถุดิบ ส่วนนี้จะแสดงรายการที่ควรใช้ก่อนให้อัตโนมัติ"
              title="ยังไม่มีของใกล้หมดอายุ"
            />
          )}
        </SectionCard>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  listGroup: {
    gap: spacing.md,
  },
  recipeSummary: {
    gap: spacing.xs,
  },
  recipeActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recipeActionButton: {
    flex: 1,
  },
  previewRow: {
    borderRadius: 14,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  previewMeta: {
    color: palette.textMuted,
    fontSize: 13,
  },
  previewBadge: {
    borderRadius: 999,
    backgroundColor: palette.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewBadgeText: {
    color: palette.warning,
    fontSize: 12,
    fontWeight: "700",
  },
  recipeFooter: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  recipeWarning: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
