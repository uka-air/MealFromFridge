import type { Ingredient } from '@/types/ingredient';
import type { Recipe, RecipeIngredientRequirement } from '@/types/recipe';
import { isExpiringSoon } from '@/utils/date';
import { isIngredientActive } from '@/utils/inventory';

const MATCHED_INGREDIENT_SCORE = 50;
const EXPIRING_SOON_BONUS = 100;
const MISSING_REQUIRED_INGREDIENT_PENALTY = 30;
const MATCHING_TAG_BONUS = 20;

export type SuggestionStatus = 'ready' | 'almost' | 'future';

export interface SuggestionOptions {
  preferExpiringSoon: boolean;
  maxMissingIngredients: number;
  selectedTags?: string[];
}

export interface SuggestedRecipe {
  recipe: Recipe;
  score: number;
  missingIngredients: RecipeIngredientRequirement[];
  expiringIngredientsUsed: Ingredient[];
  matchedIngredients: Ingredient[];
  matchPercentage: number;
  status: SuggestionStatus;
  expiringSoonCount: number;
}

export type RecipeSuggestion = SuggestedRecipe;

interface IngredientMatch {
  ingredient: Ingredient;
  index: number;
  priority: number;
}

const DEFAULT_SUGGESTION_OPTIONS: SuggestionOptions = {
  preferExpiringSoon: true,
  maxMissingIngredients: Number.POSITIVE_INFINITY,
  selectedTags: [],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOptions(options?: Partial<SuggestionOptions>): SuggestionOptions {
  return {
    preferExpiringSoon: options?.preferExpiringSoon ?? DEFAULT_SUGGESTION_OPTIONS.preferExpiringSoon,
    maxMissingIngredients:
      options?.maxMissingIngredients ?? DEFAULT_SUGGESTION_OPTIONS.maxMissingIngredients,
    selectedTags: options?.selectedTags ?? DEFAULT_SUGGESTION_OPTIONS.selectedTags,
  };
}

function matchesFlexibleName(left: string, right: string) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function matchesRequirementName(
  inventoryIngredient: Ingredient,
  requirement: RecipeIngredientRequirement
) {
  if (matchesFlexibleName(inventoryIngredient.name, requirement.ingredientName)) {
    return true;
  }

  if (!requirement.matchAnyOf?.length) {
    return false;
  }

  return requirement.matchAnyOf.some((option) =>
    matchesFlexibleName(inventoryIngredient.name, option)
  );
}

function hasEnoughIngredient(
  inventoryIngredient: Ingredient,
  requirement: RecipeIngredientRequirement
) {
  if (!requirement.quantity || requirement.quantity <= 0) {
    return inventoryIngredient.quantity > 0;
  }

  if (!requirement.unit || requirement.unit === inventoryIngredient.unit) {
    return inventoryIngredient.quantity >= requirement.quantity;
  }

  return inventoryIngredient.quantity > 0;
}

function getIngredientMatchPriority(
  ingredient: Ingredient,
  requirement: RecipeIngredientRequirement,
  preferExpiringSoon: boolean
) {
  let priority = 0;

  if (normalize(ingredient.name) === normalize(requirement.ingredientName)) {
    priority += 3;
  }

  if (preferExpiringSoon && isExpiringSoon(ingredient.expiresAt, 3)) {
    priority += 2;
  }

  if (requirement.matchAnyOf?.some((option) => matchesFlexibleName(ingredient.name, option))) {
    priority += 1;
  }

  return priority;
}

function findBestIngredientMatch(
  inventory: Ingredient[],
  requirement: RecipeIngredientRequirement,
  usedIngredientIndexes: Set<number>,
  preferExpiringSoon: boolean
): IngredientMatch | null {
  let bestMatch: IngredientMatch | null = null;

  for (const [index, ingredient] of inventory.entries()) {
    if (usedIngredientIndexes.has(index)) {
      continue;
    }

    if (
      !matchesRequirementName(ingredient, requirement) ||
      !hasEnoughIngredient(ingredient, requirement)
    ) {
      continue;
    }

    const priority = getIngredientMatchPriority(ingredient, requirement, preferExpiringSoon);
    if (!bestMatch || priority > bestMatch.priority) {
      bestMatch = { ingredient, index, priority };
    }
  }

  return bestMatch;
}

function countMatchingSelectedTags(recipeTags: string[], selectedTags: string[]) {
  if (!selectedTags.length || !recipeTags.length) {
    return 0;
  }

  const normalizedRecipeTags = new Set(recipeTags.map((tag) => normalize(tag)));
  const normalizedSelectedTags = new Set(selectedTags.map((tag) => normalize(tag)));

  return [...normalizedSelectedTags].reduce((count, tag) => {
    return normalizedRecipeTags.has(tag) ? count + 1 : count;
  }, 0);
}

function getSuggestionStatus(
  missingIngredients: RecipeIngredientRequirement[],
  requiredIngredientCount: number,
  matchPercentage: number
): SuggestionStatus {
  if (!missingIngredients.length) {
    return 'ready';
  }

  if (missingIngredients.length === 1 || matchPercentage >= 0.6) {
    return 'almost';
  }

  if (requiredIngredientCount <= 2 && matchPercentage >= 0.5) {
    return 'almost';
  }

  return 'future';
}

function scoreRecipeSuggestion(
  matchedIngredients: Ingredient[],
  expiringIngredientsUsed: Ingredient[],
  missingIngredients: RecipeIngredientRequirement[],
  recipe: Recipe,
  options: SuggestionOptions
) {
  const matchingTagCount = countMatchingSelectedTags(recipe.tags, options.selectedTags ?? []);
  const expiringSoonBonus = options.preferExpiringSoon
    ? expiringIngredientsUsed.length * EXPIRING_SOON_BONUS
    : 0;

  return (
    matchedIngredients.length * MATCHED_INGREDIENT_SCORE +
    expiringSoonBonus -
    missingIngredients.length * MISSING_REQUIRED_INGREDIENT_PENALTY +
    matchingTagCount * MATCHING_TAG_BONUS
  );
}

function buildSuggestedRecipe(
  inventory: Ingredient[],
  recipe: Recipe,
  options: SuggestionOptions
): SuggestedRecipe | null {
  const availableInventory = inventory.filter(isIngredientActive);
  const usedIngredientIndexes = new Set<number>();
  const matchedIngredients: Ingredient[] = [];
  const expiringIngredientsUsed: Ingredient[] = [];
  const missingIngredients: RecipeIngredientRequirement[] = [];

  const requiredIngredients = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  const optionalIngredients = recipe.ingredients.filter((ingredient) => ingredient.optional);

  [...requiredIngredients, ...optionalIngredients].forEach((requirement) => {
    const bestMatch = findBestIngredientMatch(
      availableInventory,
      requirement,
      usedIngredientIndexes,
      options.preferExpiringSoon
    );

    if (!bestMatch) {
      if (!requirement.optional) {
        missingIngredients.push(requirement);
      }

      return;
    }

    usedIngredientIndexes.add(bestMatch.index);
    matchedIngredients.push(bestMatch.ingredient);

    if (isExpiringSoon(bestMatch.ingredient.expiresAt, 3)) {
      expiringIngredientsUsed.push(bestMatch.ingredient);
    }
  });

  if (missingIngredients.length > options.maxMissingIngredients) {
    return null;
  }

  const requiredMatchCount = requiredIngredients.length - missingIngredients.length;
  const requiredIngredientCount = requiredIngredients.length || 1;
  const matchPercentage = requiredMatchCount / requiredIngredientCount;

  return {
    recipe,
    score: scoreRecipeSuggestion(
      matchedIngredients,
      expiringIngredientsUsed,
      missingIngredients,
      recipe,
      options
    ),
    missingIngredients,
    expiringIngredientsUsed,
    matchedIngredients,
    matchPercentage,
    status: getSuggestionStatus(
      missingIngredients,
      requiredIngredients.length,
      matchPercentage
    ),
    expiringSoonCount: expiringIngredientsUsed.length,
  };
}

export function suggestRecipes(
  ingredients: Ingredient[],
  recipes: Recipe[],
  options: SuggestionOptions
) {
  return recipes
    .map((recipe) => buildSuggestedRecipe(ingredients, recipe, options))
    .filter((suggestion): suggestion is SuggestedRecipe => suggestion !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.missingIngredients.length !== right.missingIngredients.length) {
        return left.missingIngredients.length - right.missingIngredients.length;
      }

      if (right.expiringSoonCount !== left.expiringSoonCount) {
        return right.expiringSoonCount - left.expiringSoonCount;
      }

      return left.recipe.name.localeCompare(right.recipe.name);
    });
}

export function buildRecipeSuggestions(
  ingredients: Ingredient[],
  recipes: Recipe[],
  options?: Partial<SuggestionOptions>
) {
  return suggestRecipes(ingredients, recipes, normalizeOptions(options));
}
