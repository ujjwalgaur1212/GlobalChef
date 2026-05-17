import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getInteractionErrorMessage,
  likeRecipeOnce,
  removeSavedRecipe,
  saveRecipe,
  subscribeToUserRecipeLikes,
  subscribeToUserSavedRecipes
} from "@/services/recipeInteractionService";
import type { RecipeInteraction } from "@/types/recipeInteraction";

export function useRecipeInteractions(userId?: string) {
  const [likes, setLikes] = useState<RecipeInteraction[]>([]);
  const [saves, setSaves] = useState<RecipeInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[GlobalChef] Current user id for recipe interactions", { userId: userId ?? null });

    if (!userId) {
      setLikes([]);
      setSaves([]);
      setIsLoading(false);
      return;
    }

    let didSubscribe = true;
    let likesLoaded = false;
    let savesLoaded = false;

    function markLoaded(type: "likes" | "saves") {
      if (type === "likes") {
        likesLoaded = true;
      } else {
        savesLoaded = true;
      }

      if (didSubscribe && likesLoaded && savesLoaded) {
        setIsLoading(false);
      }
    }

    setIsLoading(true);

    const unsubscribeLikes = subscribeToUserRecipeLikes(
      userId,
      (nextLikes) => {
        if (!didSubscribe) {
          return;
        }

        setLikes(nextLikes);
        setError(null);
        markLoaded("likes");
      },
      (likeError) => {
        if (!didSubscribe) {
          return;
        }

        setError(getInteractionErrorMessage(likeError));
        markLoaded("likes");
      }
    );

    const unsubscribeSaves = subscribeToUserSavedRecipes(
      userId,
      (nextSaves) => {
        if (!didSubscribe) {
          return;
        }

        console.log("[GlobalChef] Saved recipes subscription update", {
          userId,
          count: nextSaves.length,
          recipeIds: nextSaves.map((save) => save.recipeId)
        });

        setSaves(nextSaves);
        setError(null);
        markLoaded("saves");
      },
      (saveError) => {
        if (!didSubscribe) {
          return;
        }

        setError(getInteractionErrorMessage(saveError));
        markLoaded("saves");
      }
    );

    return () => {
      didSubscribe = false;
      unsubscribeLikes();
      unsubscribeSaves();
    };
  }, [userId]);

  const likedRecipeIds = useMemo(() => new Set(likes.map((like) => like.recipeId)), [likes]);
  const savedRecipeIds = useMemo(() => new Set(saves.map((save) => save.recipeId)), [saves]);

  const likeRecipeById = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        throw new Error("Sign in before liking recipes.");
      }

      return likeRecipeOnce(recipeId, userId);
    },
    [userId]
  );

  const saveRecipeById = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        throw new Error("Sign in before saving recipes.");
      }

      return saveRecipe(recipeId, userId);
    },
    [userId]
  );

  const removeSavedRecipeById = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        throw new Error("Sign in before updating saved recipes.");
      }

      await removeSavedRecipe(recipeId, userId);
    },
    [userId]
  );

  const toggleSavedRecipeById = useCallback(
    async (recipeId: string) => {
      if (savedRecipeIds.has(recipeId)) {
        await removeSavedRecipeById(recipeId);
        return false;
      }

      await saveRecipeById(recipeId);
      return true;
    },
    [removeSavedRecipeById, saveRecipeById, savedRecipeIds]
  );

  return {
    likedRecipeIds,
    savedRecipeIds,
    savedInteractions: saves,
    isLoading,
    error,
    likeRecipeById,
    saveRecipeById,
    removeSavedRecipeById,
    toggleSavedRecipeById
  };
}
