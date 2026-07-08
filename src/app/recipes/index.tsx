import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { ChipSelect, type SelectOption } from "@/components/chip-select";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { RecipeListItem } from "@/components/recipe-list-item";
import { Screen } from "@/components/screen";
import { SectionCard } from "@/components/section-card";
import { palette, spacing } from "@/constants/theme";
import { useRecipeStore } from "@/store/useRecipeStore";
import type { Recipe } from "@/types/recipe";

const ALL_TAGS_VALUE = "all";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function RecipesScreen() {
  const router = useRouter();
  const recipes = useRecipeStore((state) => state.recipes);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);
  const toggleFavoriteRecipe = useRecipeStore(
    (state) => state.toggleFavoriteRecipe,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAGS_VALUE);

  const tagOptions = useMemo<SelectOption<string>[]>(() => {
    const tags = [...new Set(recipes.flatMap((recipe) => recipe.tags))]
      .filter((tag) => tag.trim().length > 0)
      .sort((left, right) => left.localeCompare(right));

    return [
      {
        label: "All",
        value: ALL_TAGS_VALUE,
      },
      ...tags.map((tag) => ({
        label: tag,
        value: tag,
      })),
    ];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalizedSearchQuery = normalize(searchQuery);
    const normalizedSelectedTag =
      selectedTag === ALL_TAGS_VALUE ? null : normalize(selectedTag);

    return [...recipes]
      .filter((recipe) => {
        const matchesSearch =
          !normalizedSearchQuery ||
          normalize(recipe.name).includes(normalizedSearchQuery);
        const matchesTag =
          !normalizedSelectedTag ||
          recipe.tags.some((tag) => normalize(tag) === normalizedSelectedTag);

        return matchesSearch && matchesTag;
      })
      .sort((left, right) => {
        if (left.isFavorite !== right.isFavorite) {
          return left.isFavorite ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      });
  }, [recipes, searchQuery, selectedTag]);

  const handleDelete = (recipe: Recipe) => {
    Alert.alert("Delete recipe?", `Remove ${recipe.name} from saved recipes?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeRecipe(recipe.id),
      },
    ]);
  };

  return (
    <Screen
      title="สูตรอาหาร"
      subtitle="สูตรอาหารที่จดไว้ ค้นหาได้อย่างรวดเร็ว และเก็บสูตรโปรดไว้หาง่าย ๆ"
    >
      <View style={styles.actionsRow}>
        <AppButton
          label="เพิ่มสูตร"
          onPress={() => router.push("/recipes/recipe-form")}
        />
        <AppButton
          label="วางสูตรอาหาร"
          onPress={() => router.push("/recipes/paste-recipe")}
          variant="secondary"
        />
        <AppButton
          label="เมนูแนะนำ"
          onPress={() => router.push("/suggestions")}
          variant="secondary"
        />
      </View>

      <SectionCard title="ค้นหาสูตรอาหาร" subtitle="ค้นหาจากชื่อ และ tag">
        <FormField
          autoCapitalize="none"
          label="ค้นหาสูตรอาหาร"
          onChangeText={setSearchQuery}
          placeholder="ค้นหารูปแบบ: เมนูผัด, ทำง่าย, อาหารเช้า"
          value={searchQuery}
        />
        <ChipSelect
          label="Tag"
          onChange={setSelectedTag}
          options={tagOptions}
          value={selectedTag}
        />
        <Text style={styles.resultCount}>
          {filteredRecipes.length} of {recipes.length} recipe
          {recipes.length === 1 ? "" : "s"}
        </Text>
      </SectionCard>

      {recipes.length ? (
        filteredRecipes.length ? (
          <View style={styles.listGroup}>
            {filteredRecipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                onDelete={() => handleDelete(recipe)}
                onPress={() =>
                  router.push({
                    pathname: "/recipes/recipe-form",
                    params: { id: recipe.id },
                  })
                }
                onToggleFavorite={() => toggleFavoriteRecipe(recipe.id)}
                recipe={recipe}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Try a different search term or switch the tag filter to see more recipes."
            title="No matching recipes"
          />
        )
      ) : (
        <EmptyState
          description="Create a few recipes you actually cook so the app can recommend meals from what is in your kitchen."
          title="No recipes saved yet"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  listGroup: {
    gap: spacing.md,
  },
  resultCount: {
    color: palette.textMuted,
    fontSize: 13,
  },
});
