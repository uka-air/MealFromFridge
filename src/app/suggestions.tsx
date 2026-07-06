import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, shadow, spacing } from '@/constants/theme';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useRecipeStore } from '@/store/useRecipeStore';
import type { RecipeSuggestion } from '@/utils/suggestionEngine';
import { buildRecipeSuggestions } from '@/utils/suggestionEngine';

type SuggestionFilterKey =
  | 'expiringSoon'
  | 'readyNow'
  | 'under15'
  | 'airFryer'
  | 'clean'
  | 'kidFriendly';

interface SuggestionFilterOption {
  key: SuggestionFilterKey;
  label: string;
}

const FILTER_OPTIONS: SuggestionFilterOption[] = [
  { key: 'expiringSoon', label: 'ใช้ของใกล้เสียก่อน' },
  { key: 'readyNow', label: 'ไม่ขาดวัตถุดิบ' },
  { key: 'under15', label: 'ไม่เกิน 15 นาที' },
  { key: 'airFryer', label: 'หม้อทอด' },
  { key: 'clean', label: 'คลีน' },
  { key: 'kidFriendly', label: 'ลูกกินได้' },
];

const TAG_FILTER_ALIASES: Record<
  Exclude<SuggestionFilterKey, 'expiringSoon' | 'readyNow' | 'under15'>,
  string[]
> = {
  airFryer: ['หม้อทอด'],
  clean: ['คลีน', 'สุขภาพ'],
  kidFriendly: ['ลูกกินได้', 'เด็กกินได้'],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getUniqueIngredientNames(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function formatIngredientList(values: string[], emptyLabel: string) {
  const names = getUniqueIngredientNames(values);
  return names.length ? names.join(', ') : emptyLabel;
}

function getSelectedTagBoosts(activeFilters: SuggestionFilterKey[]) {
  const tagFilters = activeFilters.filter(
    (filter): filter is keyof typeof TAG_FILTER_ALIASES => filter in TAG_FILTER_ALIASES
  );

  return [...new Set(tagFilters.flatMap((filter) => TAG_FILTER_ALIASES[filter]))];
}

function recipeMatchesTagFilter(
  suggestion: RecipeSuggestion,
  filter: keyof typeof TAG_FILTER_ALIASES
) {
  const normalizedRecipeTags = new Set(suggestion.recipe.tags.map((tag) => normalize(tag)));

  return TAG_FILTER_ALIASES[filter].some((tag) => normalizedRecipeTags.has(normalize(tag)));
}

function SuggestionFilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text style={[styles.filterChipLabel, selected && styles.filterChipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SuggestionCard({
  suggestion,
  onPress,
}: {
  suggestion: RecipeSuggestion;
  onPress: () => void;
}) {
  const matchedIngredientNames = suggestion.matchedIngredients.map((ingredient) => ingredient.name);
  const missingIngredientNames = suggestion.missingIngredients.map(
    (ingredient) => ingredient.ingredientName
  );
  const expiringIngredientNames = suggestion.expiringIngredientsUsed.map(
    (ingredient) => ingredient.name
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{suggestion.recipe.name}</Text>
          <Text style={styles.cardMeta}>{suggestion.recipe.cookMinutes} นาที • {suggestion.recipe.ingredients.length} วัตถุดิบ</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreLabel}>คะแนน</Text>
          <Text style={styles.scoreValue}>{suggestion.score}</Text>
        </View>
      </View>

      <View style={styles.detailsGroup}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ตรงวัตถุดิบ</Text>
          <Text style={styles.detailValue}>
            {formatIngredientList(matchedIngredientNames, 'ยังไม่มีวัตถุดิบที่ตรง')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ยังขาด</Text>
          <Text style={styles.detailValue}>
            {formatIngredientList(missingIngredientNames, 'ไม่ขาดวัตถุดิบ')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ใช้ของใกล้เสีย</Text>
          <Text style={styles.detailValue}>
            {formatIngredientList(expiringIngredientNames, 'ยังไม่ได้ใช้วัตถุดิบใกล้เสีย')}
          </Text>
        </View>
      </View>

      {suggestion.recipe.tags.length ? (
        <View style={styles.tagRow}>
          {suggestion.recipe.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function SuggestionsScreen() {
  const router = useRouter();
  const ingredients = useInventoryStore((state) => state.ingredients);
  const recipes = useRecipeStore((state) => state.recipes);
  const [activeFilters, setActiveFilters] = useState<SuggestionFilterKey[]>([]);

  const selectedTagBoosts = useMemo(
    () => getSelectedTagBoosts(activeFilters),
    [activeFilters]
  );

  const suggestions = useMemo(() => {
    const rankedSuggestions = buildRecipeSuggestions(ingredients, recipes, {
      preferExpiringSoon: true,
      maxMissingIngredients: activeFilters.includes('readyNow')
        ? 0
        : Number.POSITIVE_INFINITY,
      selectedTags: selectedTagBoosts,
    });

    return rankedSuggestions
      .filter((suggestion) => suggestion.matchedIngredients.length > 0)
      .filter((suggestion) => {
        if (
          activeFilters.includes('expiringSoon') &&
          !suggestion.expiringIngredientsUsed.length
        ) {
          return false;
        }

        if (activeFilters.includes('under15') && suggestion.recipe.cookMinutes > 15) {
          return false;
        }

        if (
          activeFilters.includes('airFryer') &&
          !recipeMatchesTagFilter(suggestion, 'airFryer')
        ) {
          return false;
        }

        if (activeFilters.includes('clean') && !recipeMatchesTagFilter(suggestion, 'clean')) {
          return false;
        }

        if (
          activeFilters.includes('kidFriendly') &&
          !recipeMatchesTagFilter(suggestion, 'kidFriendly')
        ) {
          return false;
        }

        return true;
      });
  }, [activeFilters, ingredients, recipes, selectedTagBoosts]);

  const handleToggleFilter = (filterKey: SuggestionFilterKey) => {
    setActiveFilters((current) =>
      current.includes(filterKey)
        ? current.filter((item) => item !== filterKey)
        : [...current, filterKey]
    );
  };

  if (!recipes.length || !ingredients.length) {
    return (
      <Screen
        title="เมนูแนะนำ"
        subtitle="จัดอันดับจากวัตถุดิบที่มี แล้วค่อยกรองให้แคบลงตามแบบอาหารที่อยากทำตอนนี้">
        <EmptyState
          title="ยังไม่มีเมนูที่ตรง"
          description="ลองเพิ่มเมนูโปรดหรือวัตถุดิบเพิ่ม"
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="เมนูแนะนำ"
      subtitle="เรียงสูตรจากคะแนนสูงสุดก่อน แล้วใช้ตัวกรองช่วยหาเมนูที่เหมาะกับตู้เย็นตอนนี้">
      <SectionCard
        title="ตัวกรอง"
        subtitle="เลือกหลายตัวกรองพร้อมกันได้ เพื่อบีบรายการให้เหลือเมนูที่ใกล้เคียงที่สุด">
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((filter) => (
            <SuggestionFilterChip
              key={filter.key}
              label={filter.label}
              onPress={() => handleToggleFilter(filter.key)}
              selected={activeFilters.includes(filter.key)}
            />
          ))}
        </View>
        <Text style={styles.resultText}>
          {suggestions.length} เมนูที่ตรงจาก {recipes.length} สูตร
        </Text>
      </SectionCard>

      {suggestions.length ? (
        <View style={styles.listGroup}>
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.recipe.id}
              onPress={() =>
                router.push({
                  pathname: '/recipes/[id]',
                  params: { id: suggestion.recipe.id },
                })
              }
              suggestion={suggestion}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="ยังไม่มีเมนูที่ตรง"
          description="ลองเพิ่มเมนูโปรดหรือวัตถุดิบเพิ่ม"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  filterChipLabel: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipLabelSelected: {
    color: palette.accentStrong,
  },
  resultText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  listGroup: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  cardMeta: {
    color: palette.textMuted,
    fontSize: 13,
  },
  scoreBadge: {
    minWidth: 84,
    borderRadius: radius.md,
    backgroundColor: palette.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  scoreLabel: {
    color: palette.accentStrong,
    fontSize: 11,
    fontWeight: '700',
  },
  scoreValue: {
    color: palette.accentStrong,
    fontSize: 20,
    fontWeight: '800',
  },
  detailsGroup: {
    gap: spacing.sm,
  },
  detailRow: {
    gap: spacing.xs,
  },
  detailLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
