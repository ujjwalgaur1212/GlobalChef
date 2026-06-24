import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { Heart, Send, Trash2, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  addRecipeComment,
  deleteRecipeComment,
  likeRecipeComment,
  subscribeToRecipeComments,
  subscribeToUserLikedComments
} from "@/services/commentService";
import type { RecipeComment } from "@/types/comment";

type CommentsBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  recipeId: string;
  recipeTitle: string;
};

export function CommentsBottomSheet({
  visible,
  onClose,
  recipeId,
  recipeTitle
}: CommentsBottomSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Liking comments
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  // Reply tracking state
  const [replyTo, setReplyTo] = useState<{ commentId: string; userName: string } | null>(null);

  const commentInputRef = useRef<TextInput>(null);

  // Subscribe to comments
  useEffect(() => {
    if (!visible || !recipeId) {
      setComments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToRecipeComments(
      recipeId,
      (nextComments) => {
        setComments(nextComments);
        setIsLoading(false);
      },
      (error) => {
        showToast(error.message, "error");
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [recipeId, visible, showToast]);

  // Subscribe to liked comments
  useEffect(() => {
    if (!visible || !recipeId || !user || comments.length === 0) {
      setLikedCommentIds(new Set());
      return;
    }

    const commentIds = comments.map((c) => c.commentId);
    return subscribeToUserLikedComments(recipeId, user.id, commentIds, setLikedCommentIds);
  }, [recipeId, visible, comments, user]);

  const handleAddComment = async () => {
    if (!user || !recipeId || isSending) return;

    const body = commentBody.trim();
    if (!body) {
      showToast(t("recipeDetail.commentWriteFirst", "Comment cannot be empty."), "error");
      return;
    }

    setIsSending(true);

    try {
      if (replyTo) {
        // Prepend reply to username if desired or save it in document parameters
        await addRecipeComment(
          recipeId,
          body,
          user,
          replyTo.commentId,
          replyTo.userName
        );
        showToast(t("recipeDetail.commentAdded", "Reply added successfully!"), "success");
      } else {
        await addRecipeComment(recipeId, body, user);
        showToast(t("recipeDetail.commentAdded", "Comment added successfully!"), "success");
      }
      setCommentBody("");
      setReplyTo(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add comment", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeCommentLocal = async (comment: RecipeComment) => {
    if (!user || comment.isOptimistic || likedCommentIds.has(comment.commentId) || pendingLikeIds.has(comment.commentId)) {
      return;
    }

    setPendingLikeIds((current) => new Set(current).add(comment.commentId));

    try {
      await likeRecipeComment(recipeId, comment.commentId, user.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not like comment.", "error");
    } finally {
      setPendingLikeIds((current) => {
        const next = new Set(current);
        next.delete(comment.commentId);
        return next;
      });
    }
  };

  const handleDeleteCommentLocal = async (comment: RecipeComment) => {
    if (!user || pendingDeleteIds.has(comment.commentId)) return;

    Alert.alert(
      t("recipeDetail.deleteComment", "Delete Comment"),
      t("recipeDetail.deleteCommentConfirm", "Are you sure you want to delete this comment?"),
      [
        { text: t("profile.cancelBtn", "Cancel"), style: "cancel" },
        {
          text: t("profile.deleteBtn", "Delete"),
          style: "destructive",
          onPress: async () => {
            setPendingDeleteIds((current) => new Set(current).add(comment.commentId));
            try {
              await deleteRecipeComment(recipeId, comment.commentId, user.id);
              showToast(t("recipeDetail.commentDeleted", "Comment deleted"), "success");
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Could not delete comment", "error");
            } finally {
              setPendingDeleteIds((current) => {
                const next = new Set(current);
                next.delete(comment.commentId);
                return next;
              });
            }
          }
        }
      ]
    );
  };

  const startReply = (comment: RecipeComment) => {
    setReplyTo({
      commentId: comment.commentId,
      userName: comment.userName
    });
    setCommentBody(`@${comment.userName} `);
    commentInputRef.current?.focus();
  };

  // Group threads
  const structuredComments = useMemo(() => {
    const parentComments = comments.filter((c) => !c.parentCommentId);
    const replies = comments.filter((c) => !!c.parentCommentId);

    return parentComments.map((parent) => {
      const childReplies = replies
        .filter((r) => r.parentCommentId === parent.commentId)
        .reverse(); // chronological order for replies
      return {
        ...parent,
        replies: childReplies
      };
    });
  }, [comments]);

  const initials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.trim().slice(0, 1))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-chef-black/60"
      >
        {/* Background dismiss */}
        <Pressable className="flex-grow" onPress={onClose} />

        {/* Content Container */}
        <View className="max-h-[82%] rounded-t-[28px] border border-chef-line bg-chef-black px-6 pb-8 pt-5">
          <View className="mb-5 h-1 w-12 self-center rounded-full bg-chef-line" />

          {/* Title Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-4">
              <Text className="text-chef-xl font-extrabold text-chef-cream">
                {t("comments.title", "Comments")}
              </Text>
              <Text className="text-chef-sm font-semibold text-chef-muted" numberOfLines={1}>
                {recipeTitle}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-chef-panel"
            >
              <X stroke={colors.cream} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Comments List */}
          <ScrollView
            className="flex-grow-0 min-h-[220px] max-h-[360px] mb-4"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator color={colors.saffron} />
              </View>
            ) : comments.length === 0 ? (
              <View className="items-center py-16">
                <Text className="text-chef-base font-extrabold text-chef-cream">
                  {t("recipeDetail.noComments", "No comments yet")}
                </Text>
                <Text className="mt-2 text-chef-sm text-chef-muted text-center">
                  {t("recipeDetail.noCommentsSubtitle", "Start the conversation by sharing your kitchen notes!")}
                </Text>
              </View>
            ) : (
              <View className="gap-5">
                {structuredComments.map((comment) => {
                  const isCommentLiked = likedCommentIds.has(comment.commentId);
                  const isCommentLiking = pendingLikeIds.has(comment.commentId);
                  const isCommentDeleting = pendingDeleteIds.has(comment.commentId);

                  return (
                    <View key={comment.commentId} className="flex-col">
                      {/* Parent Comment */}
                      <View className="flex-row items-start">
                        {/* Avatar */}
                        <Pressable
                          className="mr-3 h-9 w-9 overflow-hidden rounded-full bg-chef-saffron/15 border border-chef-saffron/30 active:opacity-75"
                          onPress={() => {
                            if (comment.userId) {
                              onClose();
                              router.push({
                                pathname: "/chef/[id]",
                                params: { id: comment.userId }
                              });
                            }
                          }}
                        >
                          {comment.userAvatar ? (
                            <Image className="h-full w-full" resizeMode="cover" source={{ uri: comment.userAvatar }} />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Text className="text-chef-xs font-black text-chef-saffron">{initials(comment.userName)}</Text>
                            </View>
                          )}
                        </Pressable>

                        {/* Content text */}
                        <View className="flex-1">
                          <Pressable
                            className="flex-row items-center active:opacity-75 self-start"
                            onPress={() => {
                              if (comment.userId) {
                                onClose();
                                router.push({
                                  pathname: "/chef/[id]",
                                  params: { id: comment.userId }
                                });
                              }
                            }}
                          >
                            <Text className="text-chef-sm font-extrabold text-chef-cream mr-1.5" numberOfLines={1}>
                              {comment.userName}
                            </Text>
                            <View className="h-3 w-3 items-center justify-center rounded-full bg-chef-saffron">
                              <Text className="text-[7px] font-black text-chef-black">✓</Text>
                            </View>
                          </Pressable>
                          <Text className="mt-1 text-chef-sm font-semibold leading-5 text-chef-muted">
                            {comment.text}
                          </Text>

                          {/* Quick interactions */}
                          <View className="mt-2 flex-row items-center gap-4">
                            <Pressable onPress={() => startReply(comment)} className="active:opacity-75">
                              <Text className="text-chef-xs font-black text-chef-saffron">Reply</Text>
                            </Pressable>

                            {comment.userId === user?.id && (
                              <Pressable
                                disabled={isCommentDeleting}
                                onPress={() => handleDeleteCommentLocal(comment)}
                                className="active:opacity-75 flex-row items-center"
                              >
                                <Trash2 stroke={colors.tomato} size={12} />
                                <Text className="text-chef-xs font-black text-chef-tomato ml-1">Delete</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>

                        {/* Comment Likes */}
                        <Pressable
                          disabled={isCommentLiking || isCommentLiked}
                          onPress={() => handleLikeCommentLocal(comment)}
                          className="h-8 w-8 items-center justify-center rounded-full bg-chef-panel/40 ml-2"
                        >
                          {isCommentLiking ? (
                            <ActivityIndicator color={colors.saffron} size="small" />
                          ) : (
                            <View className="items-center justify-center">
                              <Heart
                                fill={isCommentLiked ? colors.tomato : "transparent"}
                                stroke={isCommentLiked ? colors.tomato : colors.cream}
                                size={14}
                                strokeWidth={2}
                              />
                              {comment.likesCount > 0 && (
                                <Text className="text-[9px] font-bold text-chef-muted mt-0.5">{comment.likesCount}</Text>
                              )}
                            </View>
                          )}
                        </Pressable>
                      </View>

                      {/* Thread Replies */}
                      {comment.replies && comment.replies.map((reply) => {
                        const isReplyLiked = likedCommentIds.has(reply.commentId);
                        const isReplyLiking = pendingLikeIds.has(reply.commentId);
                        const isReplyDeleting = pendingDeleteIds.has(reply.commentId);

                        return (
                          <View key={reply.commentId} className="flex-row items-start ml-10 mt-3 border-l border-chef-line/45 pl-3">
                            {/* Avatar */}
                            {/* Avatar */}
                            <Pressable
                              className="mr-3 h-7 w-7 overflow-hidden rounded-full bg-chef-saffron/15 border border-chef-saffron/30 active:opacity-75"
                              onPress={() => {
                                if (reply.userId) {
                                  onClose();
                                  router.push({
                                    pathname: "/chef/[id]",
                                    params: { id: reply.userId }
                                  });
                                }
                              }}
                            >
                              {reply.userAvatar ? (
                                <Image className="h-full w-full" resizeMode="cover" source={{ uri: reply.userAvatar }} />
                              ) : (
                                <View className="h-full w-full items-center justify-center">
                                  <Text className="text-[10px] font-black text-chef-saffron">{initials(reply.userName)}</Text>
                                </View>
                              )}
                            </Pressable>

                            {/* Content text */}
                            <View className="flex-1">
                              <Pressable
                                className="flex-row items-center active:opacity-75 self-start"
                                onPress={() => {
                                  if (reply.userId) {
                                    onClose();
                                    router.push({
                                      pathname: "/chef/[id]",
                                      params: { id: reply.userId }
                                    });
                                  }
                                }}
                              >
                                <Text className="text-chef-xs font-extrabold text-chef-cream mr-1.5" numberOfLines={1}>
                                  {reply.userName}
                                </Text>
                                <View className="h-3 w-3 items-center justify-center rounded-full bg-chef-saffron">
                                  <Text className="text-[7px] font-black text-chef-black">✓</Text>
                                </View>
                              </Pressable>
                              <Text className="mt-1 text-chef-xs font-semibold leading-4 text-chef-muted">
                                {reply.text}
                              </Text>

                              {/* Quick interactions */}
                              <View className="mt-1.5 flex-row items-center gap-4">
                                {reply.userId === user?.id && (
                                  <Pressable
                                    disabled={isReplyDeleting}
                                    onPress={() => handleDeleteCommentLocal(reply)}
                                    className="active:opacity-75 flex-row items-center"
                                  >
                                    <Trash2 stroke={colors.tomato} size={11} />
                                    <Text className="text-[10px] font-black text-chef-tomato ml-1">Delete</Text>
                                  </Pressable>
                                )}
                              </View>
                            </View>

                            {/* Reply Likes */}
                            <Pressable
                              disabled={isReplyLiking || isReplyLiked}
                              onPress={() => handleLikeCommentLocal(reply)}
                              className="h-7 w-7 items-center justify-center rounded-full bg-chef-panel/40 ml-2"
                            >
                              {isReplyLiking ? (
                                <ActivityIndicator color={colors.saffron} size="small" />
                              ) : (
                                <View className="items-center justify-center">
                                  <Heart
                                    fill={isReplyLiked ? colors.tomato : "transparent"}
                                    stroke={isReplyLiked ? colors.tomato : colors.cream}
                                    size={12}
                                    strokeWidth={2}
                                  />
                                  {reply.likesCount > 0 && (
                                    <Text className="text-[8px] font-bold text-chef-muted mt-0.5">{reply.likesCount}</Text>
                                  )}
                                </View>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Reply indicator banner */}
          {replyTo && (
            <View className="flex-row items-center justify-between bg-chef-panel/60 border border-chef-line/45 rounded-chef px-3 py-1.5 mb-2">
              <Text className="text-chef-xs font-extrabold text-chef-saffron">
                Replying to @{replyTo.userName}
              </Text>
              <Pressable onPress={() => { setReplyTo(null); setCommentBody(""); }}>
                <X stroke={colors.saffron} size={14} strokeWidth={2.5} />
              </Pressable>
            </View>
          )}

          {/* Bottom input area */}
          <View className="flex-row items-center rounded-chef border border-chef-line bg-chef-panel px-4 py-1">
            <TextInput
              ref={commentInputRef}
              className="flex-1 py-3 text-chef-base font-semibold text-chef-cream"
              placeholder={replyTo ? "Add your reply..." : "Add a comment..."}
              placeholderTextColor={colors.textMuted}
              value={commentBody}
              onChangeText={setCommentBody}
              multiline
            />
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full bg-chef-saffron active:opacity-85"
              disabled={isSending || !commentBody.trim()}
              onPress={handleAddComment}
            >
              {isSending ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Send stroke={colors.background} size={16} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
