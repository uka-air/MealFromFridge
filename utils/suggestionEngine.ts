import type { Ingredient } from '@/types/ingredient';
import type { Recipe, RecipeIngredientRequirement } from '@/types/recipe';
import { isExpiringSoon } from '@/utils/date';

export type SuggestionStatus = 'ready' | 'almost' | 'future';

export interface RecipeSuggestion {
  recipe: Recipe;
  matchedIngredients: Ingredient[];
  missingIngredients: RecipeIngredientRequirement[];
  matchPercentage: number;
  status: SuggestionStatus;
  expiringSoonCount: number;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesExactName(candidateName: string, targetName: string) {
  return normalize(candidateName) === normalize(targetName);
}

function matchesFlexibleName(candidateName: string, targetName: string) {
  const normalizedCandidateName = normalize(candidateName);
  const normalizedTargetName = normalize(targetName);

  return (
    normalizedCandidateName === normalizedTargetName ||
    normalizedCandidateName.includes(normalizedTargetName) ||
    normalizedTargetName.includes(normalizedCandidateName)
  );
}

function matchesRequirement(
  inventoryIngredient: Ingredient,
  requirement: RecipeIngredientRequirement
) {
  if (matchesExactName(inventoryIngredient.name, requirement.ingredientName)) {
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

export function buildRecipeSuggestions(inventory: Ingredient[], recipes: Recipe[]) {
  const suggestions: RecipeSuggestion[] = recipes.map((recipe) => {
    const requiredIngredients = recipe.ingredients.filter((item) => !item.optional);
    const matchedIngredients: Ingredient[] = [];
    const missingIngredients: RecipeIngredientRequirement[] = [];

    requiredIngredients.forEach((requirement) => {
      const ingredient = inventory.find(
        (candidate) =>
          matchesRequirement(candidate, requirement) && hasEnoughIngredient(candidate, requirement)
      );

      if (ingredient) {
        matchedIngredients.push(ingredient);
        return;
      }

      missingIngredients.push(requirement);
    });

    const denominator = requiredIngredients.length || 1;
    const matchPercentage = matchedIngredients.length / denominator;

    let status: SuggestionStatus = 'future';
    if (missingIngredients.length === 0) {
      status = 'ready';
    } else if (matchPercentage >= 0.6 || missingIngredients.length === 1) {
      status = 'almost';
    }

    return {
      recipe,
      matchedIngredients,
      missingIngredients,
      matchPercentage,
      status,
      expiringSoonCount: matchedIngredients.filter((item) => isExpiringSoon(item.expiresAt)).length,
    };
  });

  const statusRank: Record<SuggestionStatus, number> = {
    ready: 0,
    almost: 1,
    future: 2,
  };

  return suggestions.sort((left, right) => {
    if (statusRank[left.status] !== statusRank[right.status]) {
      return statusRank[left.status] - statusRank[right.status];
    }
    if (right.matchPercentage !== left.matchPercentage) {
      return right.matchPercentage - left.matchPercentage;
    }
    if (right.expiringSoonCount !== left.expiringSoonCount) {
      return right.expiringSoonCount - left.expiringSoonCount;
    }

    return left.recipe.name.localeCompare(right.recipe.name);
  });
}
