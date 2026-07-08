import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { SectionCard } from "@/components/section-card";
import { palette, radius, spacing } from "@/constants/theme";
import { useRecipeStore } from "@/store/useRecipeStore";

function formatIngredientLine(
  ingredientName: string,
  quantity?: number,
  unit?: string,
) {
  if (quantity === undefined) {
    return ingredientName;
  }

  return `${ingredientName} • ${quantity} ${unit ?? "item"}`;
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const recipeId = typeof params.id === "string" ? params.id : undefined;

  const recipes = useRecipeStore((state) => state.recipes);
  const recipe = recipes.find((item) => item.id === recipeId);

  if (!recipe) {
    return (
      <Screen title="อาหาร" subtitle="ไม่พบอาหารในตอนนี้">
        <EmptyState
          title="ไม่พบอาหาร"
          description="อาจถูกลบหรือเปลี่ยนแปลงแล้ว โปรดเปิดรายการอาหารเพื่อเลือกอีกครั้ง"
        />
        <AppButton
          label="เปิดรายการอาหาร"
          onPress={() => router.push("/recipes")}
        />
      </Screen>
    );
  }

  const requiredIngredients = recipe.ingredients.filter(
    (ingredient) => !ingredient.optional,
  );
  const optionalIngredients = recipe.ingredients.filter(
    (ingredient) => ingredient.optional,
  );
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <Screen
      title={recipe.name}
      subtitle="ทบทวนวัตถุดิบและขั้นตอน แล้วเปลี่ยนไปที่โหมดแก้ไขหากคุณต้องการปรับปรุงสูตร"
    >
      <SectionCard title="ภาพรวม">
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{totalMinutes} นาที </Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{recipe.servings} จาน</Text>
          </View>
          {recipe.isFavorite ? (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>ถูกใจ</Text>
            </View>
          ) : null}
        </View>

        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}

        {recipe.tags.length ? (
          <View style={styles.tagRow}>
            {recipe.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <AppButton
          label="แก้ไขวิธีทำอาหาร"
          onPress={() =>
            router.push({
              pathname: "/recipes/recipe-form",
              params: { id: recipe.id },
            })
          }
          variant="secondary"
        />
      </SectionCard>

      <SectionCard
        title="วัตถุดิบที่จำเป็น"
        subtitle="นี่คือวัตถุดิบหลักสำหรับการทำอาหารเมนูนี้"
      >
        <View style={styles.listGroup}>
          {requiredIngredients.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientRow}>
              <Text style={styles.ingredientText}>
                {formatIngredientLine(
                  ingredient.ingredientName,
                  ingredient.quantity,
                  ingredient.unit,
                )}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {optionalIngredients.length ? (
        <SectionCard
          title="วัตถุดิบที่เสริม"
          subtitle="สิ่งที่ช่วยเสริมแต่ไม่จำเป็นต้องใส่"
        >
          <View style={styles.listGroup}>
            {optionalIngredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredientRow}>
                <Text style={styles.ingredientText}>
                  {formatIngredientLine(
                    ingredient.ingredientName,
                    ingredient.quantity,
                    ingredient.unit,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title="ขั้นตอน" subtitle="ทำตามวิธีการจากบนลงล่าง">
        <View style={styles.listGroup}>
          {recipe.instructions.map((instruction, index) => (
            <View key={`${recipe.id}-step-${index + 1}`} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {recipe.notes ? (
        <SectionCard title="Notes">
          <Text style={styles.noteText}>{recipe.notes}</Text>
        </SectionCard>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaPill: {
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metaPillText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: palette.accentStrong,
    fontSize: 12,
    fontWeight: "700",
  },
  listGroup: {
    gap: spacing.md,
  },
  ingredientRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
  },
  ingredientText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 21,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepBadgeText: {
    color: palette.surface,
    fontSize: 13,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  noteText: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
