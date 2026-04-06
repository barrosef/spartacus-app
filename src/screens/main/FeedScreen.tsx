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
import type { TimelineEntry } from "../../components/timeline/types";

interface FeedResponse {
  entries: TimelineEntry[];
  nextCursor: string | null;
}

interface FeedScreenProps {
  userRoles?: string[];
}

const POLL_INTERVAL = 30_000;
const STAFF_ROLES = new Set([
  "owner", "assistant", "teacher", "instructor",
]);

export function FeedScreen({ userRoles = [] }: FeedScreenProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [screen, setScreen] = useState<
    "loading" | "content" | "empty" | "error"
  >("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [likesEntryId, setLikesEntryId] = useState<string | null>(null);

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
      if (entries.length === 0) setScreen("error");
    }
  }, [fetchFeed, entries.length]);

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

  // Initial load
  useEffect(() => {
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

  // ─── Loading ───
  if (screen === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─── Error ───
  if (screen === "error") {
    return (
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
    );
  }

  // ─── Empty ───
  if (screen === "empty") {
    return (
      <View style={styles.center}>
        <Feather name="inbox" size={48} color={colors.primaryMuted} />
        <Text style={styles.emptyTitle}>Nenhuma publicação</Text>
        <Text style={styles.emptySub}>
          Novas publicações e registros aparecerão aqui.
        </Text>
      </View>
    );
  }

  // ─── Content ───
  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterVisible(true)}
        >
          <Feather name="sliders" size={16} color={colors.foreground} />
          <Text style={styles.filterBtnText}>
            {typeFilter ? "Filtrado" : "Filtros"}
          </Text>
        </TouchableOpacity>
        {typeFilter && (
          <TouchableOpacity
            style={styles.clearFilter}
            onPress={() => setTypeFilter(null)}
          >
            <Feather name="x" size={14} color={colors.mutedForeground} />
            <Text style={styles.clearFilterText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

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
              handleValidate(entry.id, entityType, entityId, "confirmed");
            }}
            onAbsent={() => {
              const ref = entry.id.split("_");
              const entityId = ref.slice(1).join("_");
              const entityType =
                entry.type === "attendance" ? "presencas" : "doacoes";
              handleValidate(entry.id, entityType, entityId, "absent");
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

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selectedType={typeFilter}
        onApply={(type) => {
          setTypeFilter(type);
          setFilterVisible(false);
        }}
      />

      <LikesModal
        visible={!!likesEntryId}
        onClose={() => setLikesEntryId(null)}
        entryId={likesEntryId ?? ""}
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
