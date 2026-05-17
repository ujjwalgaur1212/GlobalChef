import { useCallback, useEffect, useState } from "react";

import { followChef, getFollowErrorMessage, subscribeToFollowState, unfollowChef } from "@/services/followService";

export function useFollow(currentUserId?: string, chefId?: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(currentUserId && chefId && currentUserId !== chefId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId || !chefId || currentUserId === chefId) {
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToFollowState(
      currentUserId,
      chefId,
      (nextIsFollowing) => {
        setIsFollowing(nextIsFollowing);
        setError(null);
        setIsLoading(false);
      },
      (followError) => {
        setError(getFollowErrorMessage(followError));
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [chefId, currentUserId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || !chefId) {
      throw new Error("Sign in before following chefs.");
    }

    if (currentUserId === chefId) {
      throw new Error("You cannot follow yourself.");
    }

    setIsLoading(true);

    try {
      const didChange = isFollowing ? await unfollowChef(currentUserId, chefId) : await followChef(currentUserId, chefId);
      return {
        didChange,
        isFollowing: !isFollowing
      };
    } finally {
      setIsLoading(false);
    }
  }, [chefId, currentUserId, isFollowing]);

  return {
    isFollowing,
    isLoading,
    error,
    toggleFollow
  };
}
