import { useCallback, useEffect, useMemo, useState } from "react";

import { LikeService } from "@/services/likeService";
import {
  getInteractionErrorMessage,
  removeSavedRecipe,
  saveRecipe,
  subscribeToUserSavedRecipes
} from "@/services/recipeInteractionService";
import type { RecipeInteraction } from "@/types/recipeInteraction";

export function useRecipeInteractions(userId?: string) {
  const [likes, setLikes] = useState<RecipeInteraction[]>([]);
  const [saves, setSaves] = useState<RecipeInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    const unsubscribeLikes = LikeService.subscribeToUserLikes(
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

      return LikeService.likeRecipe(recipeId, userId);
    },
    [userId]
  );

  const unlikeRecipeById = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        throw new Error("Sign in before updating liked recipes.");
      }

      return LikeService.unlikeRecipe(recipeId, userId);
    },
    [userId]
  );

  const toggleLikedRecipeById = useCallback(
    async (recipeId: string) => {
      if (likedRecipeIds.has(recipeId)) {
        const previousLikes = likes;

        setLikes((currentLikes) => currentLikes.filter((like) => like.recipeId !== recipeId));

        try {
          await unlikeRecipeById(recipeId);
        } catch (unlikeError) {
          setLikes(previousLikes);
          throw unlikeError;
        }

        return false;
      }

      const optimisticLike: RecipeInteraction | null = userId
        ? {
            id: `${userId}_${recipeId}`,
            recipeId,
            userId,
            createdAt: new Date(),
            recipe: null
          }
        : null;

      if (optimisticLike) {
        setLikes((currentLikes) => {
          if (currentLikes.some((like) => like.recipeId === recipeId)) {
            return currentLikes;
          }

          return [optimisticLike, ...currentLikes];
        });
      }

      try {
        await likeRecipeById(recipeId);
      } catch (likeError) {
        if (optimisticLike) {
          setLikes((currentLikes) => currentLikes.filter((like) => like.recipeId !== recipeId));
        }

        throw likeError;
      }

      return true;
    },
    [likeRecipeById, likedRecipeIds, likes, unlikeRecipeById, userId]
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
    unlikeRecipeById,
    toggleLikedRecipeById,
    saveRecipeById,
    removeSavedRecipeById,
    toggleSavedRecipeById
  };
}
