import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  FolderPlus,
  Globe2,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  UserRound,
  Utensils
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";
import { RecipeDetailSkeleton } from "@/components/RecipeDetailSkeleton";
import { IngredientList } from "@/components/recipe/IngredientList";
import { RecipeHeader } from "@/components/recipe/RecipeHeader";
import { RecipeMetaCard } from "@/components/recipe/RecipeMetaCard";
import { StepList } from "@/components/recipe/StepList";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { useRecipeInteractions } from "@/hooks/useRecipeInteractions";
import { useToast } from "@/hooks/useToast";
import {
  addRecipeComment,
  deleteRecipeComment,
  likeRecipeComment,
  subscribeToRecipeComments,
  subscribeToUserLikedComments
} from "@/services/commentService";
import {
  addRecipeToCollection,
  createCollection,
  getCollectionErrorMessage,
  getRecipeCollectionIds,
  getUserCollections,
  removeRecipeFromCollection
} from "@/services/collectionService";
import { getRecipeErrorMessage, subscribeToRecipe } from "@/services/recipeService";
import { getRatingErrorMessage, getUserRating, rateRecipe, removeRating } from "@/services/ratingService";
import { getUserProfile } from "@/services/userService";
import type { AuthUser } from "@/types/auth";
import type { RecipeCollection } from "@/types/collection";
import type { RecipeComment } from "@/types/comment";
import type { RecipeRating } from "@/types/rating";
import type { Recipe } from "@/types/recipe";
import type { UserProfile } from "@/types/user";

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="mt-8">
      <Text className="mb-4 text-chef-xl font-extrabold text-chef-cream">{title}</Text>
      {children}
    </View>
  );
}

function formatCommentDate(date: Date | null) {
  if (!date) {
    return "Just now";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatRecipeDate(date: Date | null) {
  if (!date) {
    return "Recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatRating(value: number) {
  return value > 0 ? value.toFixed(1) : "0.0";
}

type RatingSectionProps = {
  averageRating: number;
  isLoading: boolean;
  onRate: (rating: number) => void;
  onRemove: () => void;
  ratingsCount: number;
  userRating: number;
};

function RatingSection({ averageRating, isLoading, onRate, onRemove, ratingsCount, userRating }: RatingSectionProps) {
  return (
    <View className="mt-6 rounded-chef border border-chef-line bg-chef-panel p-5">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">Recipe rating</Text>
          <Text className="mt-2 text-chef-2xl font-extrabold text-chef-cream">{formatRating(averageRating)}</Text>
          <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">
            {String(ratingsCount)} {ratingsCount === 1 ? "rating" : "ratings"}
          </Text>
        </View>
        {isLoading ? <ActivityIndicator color={colors.saffron} /> : null}
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = rating <= userRating;

          return (
            <Pressable
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full bg-chef-black"
              disabled={!!isLoading}
              key={rating}
              onPress={() => onRate(rating)}
            >
              <Text className={`text-[30px] leading-9 ${isFilled ? "text-chef-saffron" : "text-chef-muted"}`}>★</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-3 text-center text-[24px] text-chef-saffron">
        {[1, 2, 3, 4, 5].map((rating) => (rating <= userRating ? "★" : "☆")).join("")}
      </Text>

      {userRating > 0 ? (
        <Pressable
          className="mt-4 h-11 items-center justify-center rounded-chef border border-chef-line bg-chef-black"
          disabled={!!isLoading}
          onPress={onRemove}
        >
          <Text className="text-chef-sm font-extrabold text-chef-cream">Remove my rating</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildOptimisticComment(recipeId: string, text: string, user: AuthUser): RecipeComment {
  const optimisticId = `optimistic-${Date.now()}`;

  return {
    id: optimisticId,
    commentId: optimisticId,
    recipeId,
    userId: user.id,
    userName: user.displayName || "GlobalChef cook",
    userAvatar: user.photoURL ?? null,
    text,
    createdAt: new Date(),
    likesCount: 0,
    isOptimistic: true
  };
}

type CommentCardProps = {
  comment: RecipeComment;
  currentUserId: string;
  isDeleting: boolean;
  isLiked: boolean;
  isLiking: boolean;
  onDelete: (comment: RecipeComment) => void;
  onLike: (comment: RecipeComment) => void;
};

function CommentCard({ comment, currentUserId, isDeleting, isLiked, isLiking, onDelete, onLike }: CommentCardProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const initials = getInitials(comment.userName || "GlobalChef cook") || "G";

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  }, [entrance]);

  function animateHeart() {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.22,
        useNativeDriver: true,
        speed: 34,
        bounciness: 8
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 7
      })
    ]).start();
  }

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          {
            translateY: entrance.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0]
            })
          }
        ]
      }}
    >
      <View className="mb-3 flex-row items-start">
        <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-chef-saffron/15">
          {comment.userAvatar ? (
            <Image className="h-full w-full" resizeMode="cover" source={{ uri: comment.userAvatar }} />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-chef-sm font-extrabold text-chef-saffron">{initials}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="max-w-[62%] text-chef-sm font-extrabold text-chef-cream" numberOfLines={1}>
              {comment.userName || "GlobalChef cook"}
            </Text>
            <Text className="text-chef-xs font-bold text-chef-muted">{formatCommentDate(comment.createdAt)}</Text>
          </View>
          <Text className="mt-2 text-chef-sm font-semibold leading-5 text-chef-muted">{comment.text}</Text>
          <View className="mt-3 flex-row items-center gap-3">
            <Pressable
              className="flex-row items-center rounded-full bg-chef-saffron/10 px-3 py-2"
              disabled={!!(comment.isOptimistic || isLiked || isLiking)}
              onPress={() => {
                animateHeart();
                onLike(comment);
              }}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                {isLiking ? (
                  <ActivityIndicator color={colors.saffron} size="small" />
                ) : (
                  <Heart fill={isLiked ? colors.saffron : "transparent"} stroke={colors.saffron} size={14} />
                )}
              </Animated.View>
              <Text className="ml-2 text-chef-xs font-extrabold text-chef-saffron">{String(comment.likesCount)}</Text>
            </Pressable>
            {comment.userId === currentUserId ? (
              <Pressable
                className="flex-row items-center rounded-full bg-chef-tomato/10 px-3 py-2"
                disabled={!!isDeleting}
                onPress={() => onDelete(comment)}
              >
                {isDeleting ? <ActivityIndicator color={colors.tomato} size="small" /> : <Trash2 stroke={colors.tomato} size={14} />}
                <Text className="ml-2 text-chef-xs font-extrabold text-chef-tomato">Delete</Text>
              </Pressable>
            ) : null}
            {comment.isOptimistic ? <Text className="text-chef-xs font-bold text-chef-muted">Sending...</Text> : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const recipeId = String((Array.isArray(id) ? id[0] : id) ?? "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, initializing } = useAuth();
  const { likedRecipeIds, savedRecipeIds, toggleLikedRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
  const { showToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const { isFollowing, isLoading: isFollowLoading, toggleFollow } = useFollow(user?.id, recipe?.authorId);
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [isRecipeLoading, setIsRecipeLoading] = useState(true);
  const [areCommentsLoading, setAreCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState<Set<string>>(new Set());
  const [pendingCommentDeleteIds, setPendingCommentDeleteIds] = useState<Set<string>>(new Set());
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollectionSheetVisible, setIsCollectionSheetVisible] = useState(false);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [initialCollectionIds, setInitialCollectionIds] = useState<Set<string>>(new Set());
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isUpdatingCollections, setIsUpdatingCollections] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [userRating, setUserRating] = useState<RecipeRating | null>(null);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [isRatingUpdating, setIsRatingUpdating] = useState(false);
  const [chefProfile, setChefProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const commentInputScale = useRef(new Animated.Value(1)).current;

  const cleanRecipeId = useMemo(() => recipeId?.trim() ?? "", [recipeId]);
  const commentIds = useMemo(() => comments.filter((comment) => !comment.isOptimistic).map((comment) => comment.commentId), [comments]);
  const chefName = chefProfile?.displayName || recipe?.authorName || "GlobalChef cook";
  const chefInitials = getInitials(chefName) || "GC";
  const createdDateLabel = useMemo(() => formatRecipeDate(recipe?.createdAt ?? null), [recipe?.createdAt]);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true
    }).start();
  }, [entrance]);

  useEffect(() => {
    if (!cleanRecipeId) {
      setError("Recipe not found.");
      setIsRecipeLoading(false);
      return;
    }

    setIsRecipeLoading(true);
    const unsubscribe = subscribeToRecipe(
      cleanRecipeId,
      (nextRecipe) => {
        setRecipe(nextRecipe);
        setError(nextRecipe ? null : "Recipe not found.");
        setIsRecipeLoading(false);
      },
      (recipeError) => {
        setError(getRecipeErrorMessage(recipeError));
        setIsRecipeLoading(false);
      }
    );

    return unsubscribe;
  }, [cleanRecipeId]);

  useEffect(() => {
    let isMounted = true;

    const authorId = recipe?.authorId || recipe?.createdBy;

    if (!authorId) {
      setChefProfile(null);
      return () => {
        isMounted = false;
      };
    }

    getUserProfile(authorId)
      .then((profile) => {
        if (isMounted) {
          setChefProfile(profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          setChefProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recipe?.authorId, recipe?.createdBy]);

  useEffect(() => {
    if (!cleanRecipeId) {
      setAreCommentsLoading(false);
      return;
    }

    setAreCommentsLoading(true);
    const unsubscribe = subscribeToRecipeComments(
      cleanRecipeId,
      (nextComments) => {
        setComments((currentComments) => {
          const optimisticComments = currentComments.filter((comment) => comment.isOptimistic);
          return [...optimisticComments, ...nextComments];
        });
        setAreCommentsLoading(false);
      },
      (commentError) => {
        showToast(commentError.message, "error");
        setAreCommentsLoading(false);
      }
    );

    return unsubscribe;
  }, [cleanRecipeId, showToast]);

  useEffect(() => {
    if (!cleanRecipeId || !user || commentIds.length === 0) {
      setLikedCommentIds(new Set());
      return;
    }

    return subscribeToUserLikedComments(cleanRecipeId, user.id, commentIds, setLikedCommentIds);
  }, [cleanRecipeId, commentIds, user]);

  useEffect(() => {
    let isMounted = true;

    if (!isCollectionSheetVisible || !user || !recipe) {
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingCollections(true);
    getUserCollections(user.id)
      .then(async (nextCollections) => {
        const selectedIds = await getRecipeCollectionIds(recipe.id, nextCollections);

        if (!isMounted) {
          return;
        }

        setCollections(nextCollections);
        setInitialCollectionIds(selectedIds);
        setSelectedCollectionIds(new Set(selectedIds));
      })
      .catch((collectionError) => {
        if (isMounted) {
          showToast(getCollectionErrorMessage(collectionError), "error");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCollections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isCollectionSheetVisible, recipe, showToast, user]);

  useEffect(() => {
    let isMounted = true;

    if (!user || !cleanRecipeId) {
      setUserRating(null);
      setIsRatingLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsRatingLoading(true);
    getUserRating(cleanRecipeId)
      .then((rating) => {
        if (isMounted) {
          setUserRating(rating);
        }
      })
      .catch((ratingError) => {
        if (isMounted) {
          showToast(getRatingErrorMessage(ratingError), "error");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsRatingLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cleanRecipeId, showToast, user]);

  async function handleLike() {
    if (!recipe || isLiking) {
      return;
    }

    setIsLiking(true);

    try {
      const didLike = await toggleLikedRecipeById(recipe.id);
      showToast(didLike ? "Recipe liked" : "Recipe unliked", "success");
    } catch (likeError) {
      showToast(likeError instanceof Error ? likeError.message : "Could not like this recipe. Try again.", "error");
    } finally {
      setIsLiking(false);
    }
  }

  async function handleSave() {
    if (!recipe || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const didSave = await toggleSavedRecipeById(recipe.id);
      showToast(didSave ? "Recipe saved" : "Recipe removed from saved", "success");
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : "Could not update saved recipes.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRateRecipe(nextRating: number) {
    if (!user || !recipe || isRatingUpdating) {
      return;
    }

    const previousRating = userRating;
    setIsRatingUpdating(true);
    setUserRating({
      id: `${user.id}_${recipe.id}`,
      recipeId: recipe.id,
      userId: user.id,
      rating: nextRating,
      createdAt: previousRating?.createdAt ?? new Date()
    });

    try {
      await rateRecipe(recipe.id, nextRating);
      showToast(previousRating ? "Rating updated" : "Recipe rated", "success");
    } catch (ratingError) {
      setUserRating(previousRating);
      showToast(getRatingErrorMessage(ratingError), "error");
    } finally {
      setIsRatingUpdating(false);
    }
  }

  async function handleRemoveRating() {
    if (!recipe || !userRating || isRatingUpdating) {
      return;
    }

    const previousRating = userRating;
    setIsRatingUpdating(true);
    setUserRating(null);

    try {
      await removeRating(recipe.id);
      showToast("Rating removed", "success");
    } catch (ratingError) {
      setUserRating(previousRating);
      showToast(getRatingErrorMessage(ratingError), "error");
    } finally {
      setIsRatingUpdating(false);
    }
  }

  function toggleCollectionSelection(collectionId: string) {
    setSelectedCollectionIds((current) => {
      const next = new Set(current);

      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }

      return next;
    });
  }

  async function handleCreateCollectionInSheet() {
    if (!user || !recipe || !newCollectionName.trim()) {
      showToast("Name the collection first.", "error");
      return;
    }

    setIsUpdatingCollections(true);

    try {
      const collectionId = await createCollection({
        ownerId: user.id,
        name: newCollectionName
      });
      await addRecipeToCollection(collectionId, recipe.id, user.id);
      const nextCollections = await getUserCollections(user.id);
      const selectedIds = await getRecipeCollectionIds(recipe.id, nextCollections);

      setCollections(nextCollections);
      setInitialCollectionIds(selectedIds);
      setSelectedCollectionIds(new Set(selectedIds));
      setNewCollectionName("");
      showToast("Collection created", "success");
    } catch (collectionError) {
      showToast(getCollectionErrorMessage(collectionError), "error");
    } finally {
      setIsUpdatingCollections(false);
    }
  }

  async function handleApplyCollectionChanges() {
    if (!user || !recipe || isUpdatingCollections) {
      return;
    }

    setIsUpdatingCollections(true);

    try {
      const additions = [...selectedCollectionIds].filter((collectionId) => !initialCollectionIds.has(collectionId));
      const removals = [...initialCollectionIds].filter((collectionId) => !selectedCollectionIds.has(collectionId));

      await Promise.all([
        ...additions.map((collectionId) => addRecipeToCollection(collectionId, recipe.id, user.id)),
        ...removals.map((collectionId) => removeRecipeFromCollection(collectionId, recipe.id, user.id))
      ]);

      setInitialCollectionIds(new Set(selectedCollectionIds));
      setIsCollectionSheetVisible(false);
      showToast("Collections updated", "success");
    } catch (collectionError) {
      showToast(getCollectionErrorMessage(collectionError), "error");
    } finally {
      setIsUpdatingCollections(false);
    }
  }

  async function handleShare() {
    if (!recipe) {
      return;
    }

    try {
      await Share.share({
        message: `Try "${recipe.title || "this GlobalChef recipe"}" on GlobalChef. ${recipe.cuisine || "Cuisine"} from ${recipe.country || "around the world"}.`,
        title: recipe.title || "GlobalChef recipe"
      });
    } catch {
      showToast("Could not open sharing right now.", "error");
    }
  }

  async function handleAddComment() {
    if (!user || !cleanRecipeId || isSendingComment) {
      return;
    }

    const body = commentBody.trim();
    if (!body) {
      showToast("Write a comment first.", "error");
      return;
    }

    setIsSendingComment(true);
    const optimisticComment = buildOptimisticComment(cleanRecipeId, body, user);
    setComments((currentComments) => [optimisticComment, ...currentComments]);
    setCommentBody("");

    try {
      await addRecipeComment(cleanRecipeId, body, user);
      setComments((currentComments) => currentComments.filter((comment) => comment.id !== optimisticComment.id));
      showToast("Comment added", "success");
    } catch (commentError) {
      setComments((currentComments) => currentComments.filter((comment) => comment.id !== optimisticComment.id));
      setCommentBody(body);
      showToast(commentError instanceof Error ? commentError.message : "Could not add comment.", "error");
    } finally {
      setIsSendingComment(false);
    }
  }

  async function handleFollowChef() {
    if (!recipe?.authorId || recipe.authorId === user?.id) {
      return;
    }

    try {
      const result = await toggleFollow();
      showToast(result.isFollowing ? "Chef followed" : "Chef unfollowed", result.didChange ? "success" : "info");
    } catch (followError) {
      showToast(followError instanceof Error ? followError.message : "Could not update follow state.", "error");
    }
  }

  async function handleDeleteComment(comment: RecipeComment) {
    if (!user || pendingCommentDeleteIds.has(comment.commentId)) {
      return;
    }

    setPendingCommentDeleteIds((current) => new Set(current).add(comment.commentId));
    const previousComments = comments;
    setComments((currentComments) => currentComments.filter((currentComment) => currentComment.commentId !== comment.commentId));

    try {
      if (!comment.isOptimistic) {
        await deleteRecipeComment(cleanRecipeId, comment.commentId, user.id);
      }
      showToast("Comment deleted", "success");
    } catch (deleteError) {
      setComments(previousComments);
      showToast(deleteError instanceof Error ? deleteError.message : "Could not delete comment.", "error");
    } finally {
      setPendingCommentDeleteIds((current) => {
        const next = new Set(current);
        next.delete(comment.commentId);
        return next;
      });
    }
  }

  async function handleLikeComment(comment: RecipeComment) {
    if (!user || comment.isOptimistic || likedCommentIds.has(comment.commentId) || pendingCommentLikeIds.has(comment.commentId)) {
      return;
    }

    setPendingCommentLikeIds((current) => new Set(current).add(comment.commentId));
    setLikedCommentIds((current) => new Set(current).add(comment.commentId));
    setComments((currentComments) =>
      currentComments.map((currentComment) =>
        currentComment.commentId === comment.commentId
          ? { ...currentComment, likesCount: currentComment.likesCount + 1 }
          : currentComment
      )
    );

    try {
      const didLike = await likeRecipeComment(cleanRecipeId, comment.commentId, user.id);
      if (!didLike) {
        showToast("You already liked this comment", "info");
      }
    } catch (likeError) {
      setLikedCommentIds((current) => {
        const next = new Set(current);
        next.delete(comment.commentId);
        return next;
      });
      setComments((currentComments) =>
        currentComments.map((currentComment) =>
          currentComment.commentId === comment.commentId
            ? { ...currentComment, likesCount: Math.max(0, currentComment.likesCount - 1) }
            : currentComment
        )
      );
      showToast(likeError instanceof Error ? likeError.message : "Could not like comment.", "error");
    } finally {
      setPendingCommentLikeIds((current) => {
        const next = new Set(current);
        next.delete(comment.commentId);
        return next;
      });
    }
  }

  function animateCommentInput(toValue: number) {
    Animated.spring(commentInputScale, {
      toValue,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6
    }).start();
  }

  if (initializing || isRecipeLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (error || !recipe) {
    return (
      <View className="flex-1 bg-chef-black">
        <SafeAreaView className="flex-1 px-6 py-6">
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel" onPress={() => router.back()}>
            <ArrowLeft stroke={colors.cream} size={22} />
          </Pressable>
          <View className="flex-1 items-center justify-center">
            <Text className="text-center text-chef-xl font-extrabold text-chef-cream">{error || "Recipe not found."}</Text>
            <Text className="mt-2 text-center text-chef-sm text-chef-muted">Return to the feed and pick another dish.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-chef-black">
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0]
                })
              }
            ]
          }}
        >
          <RecipeHeader
            chefName={chefName}
            country={recipe.country}
            cuisine={recipe.cuisine}
            imageUrl={recipe.imageUrl}
            isBookmarked={savedRecipeIds.has(recipe.id)}
            isLiked={likedRecipeIds.has(recipe.id)}
            isLiking={isLiking}
            isSaving={isSaving}
            onBack={() => router.back()}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            title={recipe.title}
          />

          <View className="-mt-4 px-6">
            <RatingSection
              averageRating={Number(recipe.averageRating) || 0}
              isLoading={isRatingLoading || isRatingUpdating}
              onRate={handleRateRecipe}
              onRemove={handleRemoveRating}
              ratingsCount={Number(recipe.ratingsCount) || 0}
              userRating={Number(userRating?.rating) || 0}
            />

            <View className="flex-row gap-3">
              <RecipeMetaCard icon={<Heart stroke={colors.saffron} size={20} />} label="Likes" value={`${Number(recipe.likesCount ?? recipe.likes) || 0}`} />
              <RecipeMetaCard icon={<MessageCircle stroke={colors.saffron} size={20} />} label="Comments" value={`${Number(recipe.commentsCount) || comments.length}`} />
              <RecipeMetaCard icon={<Bookmark stroke={colors.saffron} size={20} />} label="Saves" value={`${Number(recipe.savesCount) || 0}`} />
            </View>

            <View className="mt-3 flex-row gap-3">
              <RecipeMetaCard icon={<Globe2 stroke={colors.saffron} size={20} />} label="Country" value={String(recipe.country || "Global")} />
              <RecipeMetaCard icon={<Utensils stroke={colors.saffron} size={20} />} label="Cuisine" value={String(recipe.cuisine || "Chef's choice")} />
              <RecipeMetaCard icon={<CalendarDays stroke={colors.saffron} size={20} />} label="Published" value={createdDateLabel} />
            </View>

            <Pressable
              className="mt-6 rounded-chef border border-chef-line bg-chef-panel p-5"
              onPress={() =>
                router.push({
                  pathname: "/chef/[id]",
                  params: { id: String(recipe.authorId || recipe.createdBy || "") }
                })
              }
            >
              <View className="flex-row items-center">
                <View className="mr-4 h-16 w-16 overflow-hidden rounded-chef bg-chef-saffron/15">
                  {chefProfile?.photoURL ? (
                    <Image className="h-full w-full" resizeMode="cover" source={{ uri: chefProfile.photoURL }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-chef-lg font-extrabold text-chef-saffron">{chefInitials}</Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">Chef profile</Text>
                  <Text className="mt-1 text-chef-lg font-extrabold text-chef-cream" numberOfLines={1}>
                    {chefName}
                  </Text>
                  <Text className="mt-1 text-chef-sm font-semibold text-chef-muted" numberOfLines={1}>
                    {chefProfile?.country || "GlobalChef cook"}
                  </Text>
                </View>
                <UserRound stroke={colors.saffron} size={22} />
              </View>
              {chefProfile?.bio ? <Text className="mt-4 text-chef-sm leading-6 text-chef-muted">{chefProfile.bio}</Text> : null}
              <View className="mt-5 flex-row gap-3">
                <View className="h-12 flex-1 items-center justify-center rounded-chef border border-chef-line bg-chef-black">
                  <Text className="text-chef-sm font-extrabold text-chef-cream">View chef</Text>
                </View>
                {recipe.authorId && recipe.authorId !== user.id ? (
                  <Pressable
                    className={`h-12 flex-1 items-center justify-center rounded-chef border ${
                      isFollowing ? "border-chef-line bg-chef-black" : "border-chef-saffron bg-chef-saffron"
                    }`}
                    disabled={!!isFollowLoading}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleFollowChef();
                    }}
                  >
                    {isFollowLoading ? (
                      <ActivityIndicator color={isFollowing ? colors.saffron : colors.background} size="small" />
                    ) : (
                      <Text className={`text-chef-sm font-extrabold ${isFollowing ? "text-chef-cream" : "text-chef-black"}`}>
                        {isFollowing ? "Following" : "Follow chef"}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </Pressable>

            {recipe.description ? (
              <View className="mt-8 rounded-chef border border-chef-line bg-chef-panel p-5">
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">Chef notes</Text>
                <Text className="mt-3 text-chef-base font-semibold leading-7 text-chef-cream">{String(recipe.description ?? "")}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-6 flex-row items-center justify-between rounded-chef border border-chef-line bg-chef-panel p-5"
              onPress={() => setIsCollectionSheetVisible(true)}
            >
              <View className="flex-row items-center">
                <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-chef-saffron/15">
                  <FolderPlus stroke={colors.saffron} size={22} />
                </View>
                <View>
                  <Text className="text-chef-base font-extrabold text-chef-cream">Save to collection</Text>
                  <Text className="mt-1 text-chef-sm font-semibold text-chef-muted">Organize this recipe into one or more lists.</Text>
                </View>
              </View>
              <Plus stroke={colors.saffron} size={20} />
            </Pressable>

            {recipe.tags.length > 0 ? (
              <View className="mt-6 flex-row flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <View className="rounded-full border border-chef-line bg-chef-panel px-3 py-2" key={tag}>
                    <Text className="text-chef-xs font-extrabold uppercase text-chef-saffron">#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Section title="Ingredients">
              <IngredientList ingredients={recipe.ingredients} />
            </Section>

            <Section title="Cooking steps">
              <StepList steps={recipe.steps} />
            </Section>

            <Section title="Comments">
              <View className="rounded-chef border border-chef-line bg-chef-panel p-4">
                <Animated.View style={{ transform: [{ scale: commentInputScale }] }}>
                  <View className="flex-row items-center rounded-chef border border-chef-line bg-chef-black px-4">
                    <MessageCircle stroke={colors.textMuted} size={18} />
                    <TextInput
                      className="min-h-12 flex-1 px-3 py-3 text-chef-base font-semibold text-chef-cream"
                      multiline
                      onBlur={() => animateCommentInput(1)}
                      onChangeText={setCommentBody}
                      onFocus={() => animateCommentInput(1.02)}
                      placeholder="Add a thoughtful note"
                      placeholderTextColor={colors.textMuted}
                      value={commentBody}
                    />
                    <Pressable
                      className="h-10 w-10 items-center justify-center rounded-full bg-chef-saffron"
                      disabled={!!isSendingComment}
                      onPress={handleAddComment}
                    >
                      {isSendingComment ? (
                        <ActivityIndicator color={colors.background} size="small" />
                      ) : (
                        <Send stroke={colors.background} size={18} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  </View>
                </Animated.View>

                {areCommentsLoading ? (
                  <View className="items-center py-8">
                    <ActivityIndicator color={colors.saffron} />
                  </View>
                ) : comments.length === 0 ? (
                  <View className="items-center py-8">
                    <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-chef-saffron/15">
                      <Utensils stroke={colors.saffron} size={22} />
                    </View>
                    <Text className="text-center text-chef-base font-extrabold text-chef-cream">No comments yet</Text>
                    <Text className="mt-1 text-center text-chef-sm text-chef-muted">Be the first to leave a kitchen note.</Text>
                  </View>
                ) : (
                  <View className="mt-5">
                    {comments.map((comment, index) => (
                      <View
                        className={`${index === comments.length - 1 ? "" : "mb-4 border-b border-chef-line pb-4"}`}
                        key={comment.id}
                      >
                        <CommentCard
                          comment={comment}
                          currentUserId={user.id}
                          isDeleting={pendingCommentDeleteIds.has(comment.commentId)}
                          isLiked={likedCommentIds.has(comment.commentId)}
                          isLiking={pendingCommentLikeIds.has(comment.commentId)}
                          onDelete={handleDeleteComment}
                          onLike={handleLikeComment}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Section>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={isCollectionSheetVisible} onRequestClose={() => setIsCollectionSheetVisible(false)}>
        <View className="flex-1 justify-end bg-chef-black/70">
          <View className="max-h-[82%] rounded-t-[28px] border border-chef-line bg-chef-black px-6 pb-8 pt-5">
            <View className="mb-5 h-1 w-12 self-center rounded-full bg-chef-line" />
            <Text className="text-chef-xl font-extrabold text-chef-cream">Save to collection</Text>
            <Text className="mt-2 text-chef-sm font-semibold text-chef-muted" numberOfLines={2}>
              {recipe.title}
            </Text>

            <View className="mt-5 flex-row items-end gap-3">
              <View className="flex-1">
                <FormInput label="New collection" onChangeText={setNewCollectionName} placeholder="Dinner ideas" value={newCollectionName} />
              </View>
              <Pressable
                className="mb-0 h-14 w-14 items-center justify-center rounded-chef bg-chef-saffron"
                disabled={!!isUpdatingCollections}
                onPress={handleCreateCollectionInSheet}
              >
                {isUpdatingCollections ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Plus stroke={colors.background} size={22} strokeWidth={2.5} />
                )}
              </Pressable>
            </View>

            <ScrollView className="mt-5" showsVerticalScrollIndicator={false}>
              {isLoadingCollections ? (
                <View className="items-center rounded-chef border border-chef-line bg-chef-panel py-8">
                  <ActivityIndicator color={colors.saffron} />
                </View>
              ) : collections.length === 0 ? (
                <View className="rounded-chef border border-chef-line bg-chef-panel px-5 py-8">
                  <Text className="text-center text-chef-base font-extrabold text-chef-cream">No collections yet</Text>
                  <Text className="mt-2 text-center text-chef-sm text-chef-muted">Create one above and this recipe will be added right away.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {collections.map((recipeCollection) => {
                    const isSelected = selectedCollectionIds.has(recipeCollection.id);

                    return (
                      <Pressable
                        className={`flex-row items-center rounded-chef border p-4 ${
                          isSelected ? "border-chef-saffron bg-chef-saffron/10" : "border-chef-line bg-chef-panel"
                        }`}
                        key={recipeCollection.id}
                        onPress={() => toggleCollectionSelection(recipeCollection.id)}
                      >
                        <View
                          className={`mr-4 h-8 w-8 items-center justify-center rounded-full border ${
                            isSelected ? "border-chef-saffron bg-chef-saffron" : "border-chef-line bg-chef-black"
                          }`}
                        >
                          {isSelected ? <Check stroke={colors.background} size={17} strokeWidth={3} /> : null}
                        </View>
                        <View className="flex-1">
                          <Text className="text-chef-base font-extrabold text-chef-cream" numberOfLines={1}>
                            {recipeCollection.name}
                          </Text>
                          <Text className="mt-1 text-chef-xs font-bold uppercase text-chef-muted">
                            {String(recipeCollection.recipeCount)} {recipeCollection.recipeCount === 1 ? "recipe" : "recipes"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <Button className="mt-5" isLoading={isUpdatingCollections} onPress={handleApplyCollectionChanges} title="Save selections" />
            <Button className="mt-3" onPress={() => setIsCollectionSheetVisible(false)} title="Cancel" variant="ghost" />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
