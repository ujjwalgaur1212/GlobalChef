import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Clock3, Flame, Gauge, Heart, MessageCircle, Send, Trash2, UserRound, Utensils } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
import { getRecipeErrorMessage, subscribeToRecipe } from "@/services/recipeService";
import { getUserProfile } from "@/services/userService";
import type { AuthUser } from "@/types/auth";
import type { RecipeComment } from "@/types/comment";
import type { Recipe } from "@/types/recipe";

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
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-chef-saffron/15">
          <Text className="text-chef-sm font-extrabold text-chef-saffron">{(comment.userName || "G").slice(0, 1).toUpperCase()}</Text>
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
  const { likedRecipeIds, savedRecipeIds, likeRecipeById, toggleSavedRecipeById } = useRecipeInteractions(user?.id);
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
  const [chefName, setChefName] = useState("GlobalChef cook");
  const [error, setError] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const commentInputScale = useRef(new Animated.Value(1)).current;

  const cleanRecipeId = useMemo(() => recipeId?.trim() ?? "", [recipeId]);
  const commentIds = useMemo(() => comments.filter((comment) => !comment.isOptimistic).map((comment) => comment.commentId), [comments]);

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

    if (!recipe?.createdBy) {
      setChefName("GlobalChef cook");
      return () => {
        isMounted = false;
      };
    }

    getUserProfile(recipe.createdBy)
      .then((profile) => {
        if (isMounted) {
          setChefName(profile?.displayName || "GlobalChef cook");
        }
      })
      .catch(() => {
        if (isMounted) {
          setChefName("GlobalChef cook");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recipe?.createdBy]);

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

  async function handleLike() {
    if (!recipe || isLiking) {
      return;
    }

    setIsLiking(true);

    try {
      const didLike = await likeRecipeById(recipe.id);
      showToast(didLike ? "Recipe liked" : "You already liked this recipe", didLike ? "success" : "info");
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
            <View className="flex-row gap-3">
              <RecipeMetaCard icon={<Clock3 stroke={colors.saffron} size={20} />} label="Cook time" value={String(recipe.cookTime || "Not set")} />
              <RecipeMetaCard icon={<Flame stroke={colors.tomato} size={20} />} label="Calories" value={`${Number(recipe.calories) || 0} cal`} />
              <RecipeMetaCard icon={<Heart stroke={colors.saffron} size={20} />} label="Likes" value={`${Number(recipe.likes) || 0}`} />
            </View>

            <View className="mt-3 flex-row gap-3">
              <RecipeMetaCard icon={<UserRound stroke={colors.saffron} size={20} />} label="Chef" value={String(chefName ?? "")} />
              <RecipeMetaCard icon={<Gauge stroke={colors.saffron} size={20} />} label="Difficulty" value={String(recipe.difficulty ?? "Easy")} />
            </View>

            <View className="mt-3 flex-row gap-3">
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-chef border border-chef-line bg-chef-panel"
                onPress={() =>
                  router.push({
                    pathname: "/chef/[id]",
                    params: { id: String(recipe.authorId || recipe.createdBy || "") }
                  })
                }
              >
                <Text className="text-chef-sm font-extrabold text-chef-cream">View chef</Text>
              </Pressable>
              {recipe.authorId && recipe.authorId !== user.id ? (
                <Pressable
                  className={`h-12 flex-1 items-center justify-center rounded-chef border ${
                    isFollowing ? "border-chef-line bg-chef-panel" : "border-chef-saffron bg-chef-saffron"
                  }`}
                  disabled={!!isFollowLoading}
                  onPress={handleFollowChef}
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

            {recipe.description ? (
              <View className="mt-8 rounded-chef border border-chef-line bg-chef-panel p-5">
                <Text className="text-chef-sm font-extrabold uppercase text-chef-saffron">Chef notes</Text>
                <Text className="mt-3 text-chef-base font-semibold leading-7 text-chef-cream">{String(recipe.description ?? "")}</Text>
              </View>
            ) : null}

            <View className="mt-3 flex-row gap-3">
              <RecipeMetaCard icon={<Bookmark stroke={colors.saffron} size={20} />} label="Saves" value={`${Number(recipe.savesCount) || 0}`} />
              <RecipeMetaCard icon={<MessageCircle stroke={colors.saffron} size={20} />} label="Comments" value={`${Number(recipe.commentsCount) || comments.length}`} />
            </View>

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
    </KeyboardAvoidingView>
  );
}
