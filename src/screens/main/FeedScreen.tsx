import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { api } from "../../lib/api";
import { auth } from "../../lib/firebase";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { FilterModal } from "../../components/timeline/FilterModal";
import { LikesModal } from "../../components/timeline/LikesModal";
import { ConfirmationModal } from "../../components/timeline/ConfirmationModal";
import type { TimelineEntry } from "../../components/timeline/types";

interface FeedResponse {
  entries: TimelineEntry[];
  nextCursor: string | null;
}

interface FeedScreenProps {
  userRoles?: string[];
  typeFilter?: string | null;
  filterVisible?: boolean;
  onFilterClose?: () => void;
  onFilterChange?: (type: string | null) => void;
}

const POLL_INTERVAL = 30_000;
const STAFF_ROLES = new Set([
  "owner", "assistant", "teacher", "instructor",
]);

export function FeedScreen({
  userRoles = [],
  typeFilter = null,
  filterVisible = false,
  onFilterClose,
  onFilterChange,
}: FeedScreenProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [screen, setScreen] = useState<
    "loading" | "content" | "empty" | "error"
  >("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [likesEntryId, setLikesEntryId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    action: "confirm" | "absent";
    entryId: string;
    entityType: string;
    entityId: string;
    targetName: string;
    entityLabel: string;
  }>({
    visible: false,
    action: "confirm",
    entryId: "",
    entityType: "",
    entityId: "",
    targetName: "",
    entityLabel: "",
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStaff = userRoles.some((r) => STAFF_ROLES.has(r));
  const currentUid = auth.currentUser?.uid ?? "";

  const fetchFeed = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "5");

      const qs = params.toString();
      const path = `/timeline${qs ? `?${qs}` : ""}`;
      return api.get<FeedResponse>(path);
    },
    [typeFilter]
  );

  const loadFeed = useCallback(async () => {
    try {
      const data = await fetchFeed();
      setEntries(data.entries);
      setNextCursor(data.nextCursor);
      setScreen(data.entries.length > 0 ? "content" : "empty");
    } catch {
      setScreen("error");
    }
  }, [fetchFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchFeed(nextCursor);
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch {
      // Silent fail on load more
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchFeed]);

  // Reload when filter changes — clear stale entries so error state works
  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    setScreen("loading");
    loadFeed();
  }, [typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling every 30s
  useEffect(() => {
    pollingRef.current = setInterval(loadFeed, POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadFeed]);

  const handleLike = useCallback(
    async (entryId: string, liked: boolean) => {
      // Optimistic update
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                userLiked: !liked,
                likesCount: e.likesCount + (liked ? -1 : 1),
              }
            : e
        )
      );
      try {
        if (liked) {
          await api.delete(`/timeline/${entryId}/reactions`);
        } else {
          await api.post(`/timeline/${entryId}/reactions`, {});
        }
      } catch {
        // Revert on error
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  userLiked: liked,
                  likesCount: e.likesCount + (liked ? 1 : -1),
                }
              : e
          )
        );
      }
    },
    []
  );

  const handleValidate = useCallback(
    async (
      entryId: string,
      entityType: string,
      entityId: string,
      status: string
    ) => {
      const collection =
        entityType === "presencas" ? "presencas" : "doacoes";
      try {
        await api.patch(`/${collection}/${entityId}/validate`, {
          status,
        });
        // Optimistic update
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, validationStatus: status as "confirmed" | "absent" }
              : e
          )
        );
      } catch {
        // Revert handled by next poll
      }
    },
    []
  );

  const handleRequestReview = useCallback(
    async (entityType: string, entityId: string, entryId: string) => {
      const collection =
        entityType === "presencas" ? "presencas" : "doacoes";
      try {
        await api.post(`/${collection}/${entityId}/request-review`, {});
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId ? { ...e, reviewRequested: true } : e
          )
        );
      } catch {
        // Silent fail
      }
    },
    []
  );

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number }; contentSize: { height: number } } }) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      if (
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - 200
      ) {
        loadMore();
      }
    },
    [loadMore]
  );

  // ─── Render ───
  // Modals must always be mounted so the filter button in the header
  // works even when the feed is loading/empty/error.
  return (
    <View style={styles.container}>
      {screen === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {screen === "error" && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Erro ao carregar</Text>
          <Text style={styles.emptySub}>
            Verifique sua conexão e tente novamente.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadFeed}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === "empty" && (
        <View style={styles.center}>
          <Feather name="inbox" size={48} color={colors.primaryMuted} />
          <Text style={styles.emptyTitle}>Nenhuma publicação</Text>
          <Text style={styles.emptySub}>
            {typeFilter
              ? "Nenhum item encontrado para o filtro atual."
              : "Novas publicações e registros aparecerão aqui."}
          </Text>
          {typeFilter && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => onFilterChange?.(null)}
            >
              <Text style={styles.retryText}>Limpar filtro</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {screen === "content" && (
        <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {entries.map((entry) => (
          <TimelineCard
            key={entry.id}
            entry={entry}
            isStaff={isStaff}
            isTarget={entry.targetUid === currentUid}
            onLike={() => handleLike(entry.id, entry.userLiked)}
            onViewLikes={() => setLikesEntryId(entry.id)}
            onConfirm={() => {
              const ref = entry.id.split("_");
              const entityId = ref.slice(1).join("_");
              const entityType =
                entry.type === "attendance" ? "presencas" : "doacoes";
              const entityLabel =
                entry.type === "attendance" ? "presença" : "doação";
              setConfirmModal({
                visible: true,
                action: "confirm",
                entryId: entry.id,
                entityType,
                entityId,
                targetName: entry.targetName ?? entry.authorName,
                entityLabel,
              });
            }}
            onAbsent={() => {
              const ref = entry.id.split("_");
              const entityId = ref.slice(1).join("_");
              const entityType =
                entry.type === "attendance" ? "presencas" : "doacoes";
              const entityLabel =
                entry.type === "attendance" ? "presença" : "doação";
              setConfirmModal({
                visible: true,
                action: "absent",
                entryId: entry.id,
                entityType,
                entityId,
                targetName: entry.targetName ?? entry.authorName,
                entityLabel,
              });
            }}
            onRequestReview={() => {
              const ref = entry.id.split("_");
              const entityId = ref.slice(1).join("_");
              const entityType =
                entry.type === "attendance" ? "presencas" : "doacoes";
              handleRequestReview(entityType, entityId, entry.id);
            }}
          />
        ))}

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.loadingMore}
            />
          )}
        </ScrollView>
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => onFilterClose?.()}
        selectedType={typeFilter}
        onApply={(type) => {
          onFilterChange?.(type);
          onFilterClose?.();
        }}
      />

      <LikesModal
        visible={!!likesEntryId}
        onClose={() => setLikesEntryId(null)}
        entryId={likesEntryId ?? ""}
      />

      <ConfirmationModal
        visible={confirmModal.visible}
        action={confirmModal.action}
        entityLabel={confirmModal.entityLabel}
        targetName={confirmModal.targetName}
        onConfirm={() => {
          handleValidate(
            confirmModal.entryId,
            confirmModal.entityType,
            confirmModal.entityId,
            confirmModal.action === "confirm" ? "confirmed" : "absent",
          );
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        }}
        onCancel={() =>
          setConfirmModal((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
    marginTop: spacing.sm,
  },
  emptySub: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnText: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  clearFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  clearFilterText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingMore: {
    marginVertical: spacing.lg,
  },
});
