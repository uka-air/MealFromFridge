import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { RecipeCard } from '@/components/recipe-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { StatCard } from '@/components/stat-card';
import { palette, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import { formatDate, isExpired, isExpiringSoon } from '@/utils/date';
import { buildRecipeSuggestions } from '@/utils/suggestionEngine';

type SuggestionMode = 'expiring' | 'easy';

const EASY_RECIPE_TAGS = ['เร็ว', 'ทำง่าย'];
const FAVORITE_RECIPE_TAGS = ['favorite', 'favourite', 'ของโปรด'];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isFavoriteRecipe(tags: string[]) {
  const normalizedTags = new Set(tags.map((tag) => normalize(tag)));

  return FAVORITE_RECIPE_TAGS.some((tag) => normalizedTags.has(normalize(tag)));
}

function getSuggestionSectionSubtitle(mode: SuggestionMode) {
  if (mode === 'easy') {
    return 'เมนูที่เน้นทำง่ายและใช้เวลาน้อยที่สุดจากวัตถุดิบที่มีตอนนี้';
  }

  return 'เมนูที่ช่วยใช้วัตถุดิบใกล้หมดอายุให้คุ้มที่สุดก่อน';
}

export default function HomeScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>('expiring');

  const expiringSoonItems = useMemo(
    () => ingredients.filter((item) => isExpiringSoon(item.expiresAt, 3)),
    [ingredients]
  );
  const expiredItems = useMemo(
    () => ingredients.filter((item) => isExpired(item.expiresAt)),
    [ingredients]
  );
  const favoriteRecipesCount = useMemo(
    () => recipes.filter((recipe) => isFavoriteRecipe(recipe.tags)).length,
    [recipes]
  );
  const topSuggestions = useMemo(() => {
    if (!ingredients.length || !recipes.length) {
      return [];
    }

    const selectedTags = suggestionMode === 'easy' ? EASY_RECIPE_TAGS : undefined;

    return buildRecipeSuggestions(ingredients, recipes, {
      preferExpiringSoon: suggestionMode === 'expiring',
      maxMissingIngredients: 3,
      selectedTags,
    }).slice(0, 3);
  }, [ingredients, recipes, suggestionMode]);
  const highlightedExpiringItems = useMemo(() => expiringSoonItems.slice(0, 4), [expiringSoonItems]);

  return (
    <Screen
      title="วันนี้กินอะไรดี?"
      subtitle="ดูภาพรวมวัตถุดิบ เลือกแนวแนะนำที่อยากได้ แล้วตัดสินใจมื้อถัดไปได้เร็วขึ้น">
      <View style={styles.statGrid}>
        <StatCard
          helper="วัตถุดิบที่บันทึกไว้"
          label="วัตถุดิบทั้งหมด"
          value={String(ingredients.length)}
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
          helper="นับจากแท็ก favorite / ของโปรด"
          label="เมนูโปรด"
          value={String(favoriteRecipesCount)}
        />
      </View>

      <SectionCard
        title="ทางลัด"
        subtitle="เลือกมุมมองที่อยากได้ หรือไปจัดการวัตถุดิบต่อได้ทันที">
        <View style={styles.buttonGrid}>
          <AppButton
            label="ใช้ของใกล้เสียก่อน"
            onPress={() => setSuggestionMode('expiring')}
            style={styles.actionButton}
            variant={suggestionMode === 'expiring' ? 'primary' : 'secondary'}
          />
          <AppButton
            label="เมนูง่ายสุด"
            onPress={() => setSuggestionMode('easy')}
            style={styles.actionButton}
            variant={suggestionMode === 'easy' ? 'primary' : 'secondary'}
          />
          <AppButton
            label="ดูวัตถุดิบทั้งหมด"
            onPress={() => router.push('/inventory')}
            style={styles.actionButton}
            variant="secondary"
          />
          <AppButton
            label="เพิ่มวัตถุดิบ"
            onPress={() => router.push('/inventory/ingredient-form')}
            style={styles.actionButton}
            variant="secondary"
          />
        </View>
      </SectionCard>

      <SectionCard
        title="เมนูแนะนำ 3 อันดับแรก"
        subtitle={getSuggestionSectionSubtitle(suggestionMode)}>
        {topSuggestions.length ? (
          <View style={styles.listGroup}>
            {topSuggestions.map((suggestion) => (
              <RecipeCard
                key={suggestion.recipe.id}
                footer={
                  <View style={styles.recipeSummary}>
                    <Text style={styles.recipeFooter}>
                      คะแนน {suggestion.score} • ตรงวัตถุดิบ {suggestion.matchedIngredients.length}{' '}
                      อย่าง
                    </Text>
                    {suggestion.expiringIngredientsUsed.length ? (
                      <Text style={styles.recipeFooter}>
                        ใช้วัตถุดิบใกล้หมดอายุ {suggestion.expiringIngredientsUsed.length} อย่าง
                      </Text>
                    ) : null}
                    {suggestion.missingIngredients.length ? (
                      <Text style={styles.recipeFooter}>
                        ยังขาด: {suggestion.missingIngredients.map((item) => item.ingredientName).join(', ')}
                      </Text>
                    ) : (
                      <Text style={styles.recipeFooter}>มีวัตถุดิบพร้อมทำแล้ว</Text>
                    )}
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
      </SectionCard>

      <SectionCard title="วัตถุดิบใกล้หมดอายุ" subtitle="เช็กของที่ควรหยิบมาใช้ก่อนในช่วง 3 วันนี้">
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
                  {item.expiresAt ? `หมดอายุ ${formatDate(item.expiresAt)}` : 'ยังไม่ได้ตั้งวันหมดอายุ'}
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
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  listGroup: {
    gap: spacing.md,
  },
  recipeSummary: {
    gap: spacing.xs,
  },
  previewRow: {
    borderRadius: 14,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  recipeFooter: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
