import { useCallback, useEffect, useRef, useState } from "react";

import { getRecipeErrorMessage, getRecipes, seedRecipesIfEmpty, subscribeToRecipes } from "@/services/recipeService";
import type { Recipe } from "@/types/recipe";

export function useRecipes(currentUserId?: string) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seedAttemptedRef = useRef(false);

  useEffect(() => {
    let didSubscribe = true;

    try {
      const unsubscribe = subscribeToRecipes(
        (nextRecipes) => {
          if (!didSubscribe) {
            return;
          }

          setRecipes(nextRecipes);
          setError(null);
          setIsLoading(false);

          if (currentUserId && nextRecipes.length === 0 && !seedAttemptedRef.current) {
            seedAttemptedRef.current = true;
            setIsSeeding(true);
            seedRecipesIfEmpty(currentUserId)
              .catch((seedError) => {
                if (didSubscribe) {
                  setError(getRecipeErrorMessage(seedError));
                }
              })
              .finally(() => {
                if (didSubscribe) {
                  setIsSeeding(false);
                }
              });
          }
        },
        (recipeError) => {
          if (!didSubscribe) {
            return;
          }

          setError(getRecipeErrorMessage(recipeError));
          setIsLoading(false);
        }
      );

      return () => {
        didSubscribe = false;
        unsubscribe();
      };
    } catch (recipeError) {
      setError(getRecipeErrorMessage(recipeError));
      setIsLoading(false);
    }

    return () => {
      didSubscribe = false;
    };
  }, [currentUserId]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const nextRecipes = await getRecipes();
      setRecipes(nextRecipes);
      setError(null);
    } catch (recipeError) {
      setError(getRecipeErrorMessage(recipeError));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    recipes,
    isLoading: isLoading || isSeeding,
    isRefreshing,
    error,
    refresh
  };
}
