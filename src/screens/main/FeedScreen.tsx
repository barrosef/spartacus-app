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
import { useProxy } from "../../context/ProxyContext";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { PinnedRow } from "../../components/timeline/PinnedRow";
import { FilterModal } from "../../components/timeline/FilterModal";
import { LikesModal } from "../../components/timeline/LikesModal";
import { ConfirmationModal } from "../../components/timeline/ConfirmationModal";
import type { TimelineEntry } from "../../components/timeline/types";
import { AnamneseReminderBanner } from "../../components/profile/AnamneseReminderBanner";
import { useAnamneseStatus } from "../../hooks/useAnamneseStatus";
import { STAFF_ROLES } from "../../constants/roles";

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
  onOpenAnamnese?: () => void;
}

const POLL_INTERVAL = 30_000;

export function FeedScreen({
  userRoles = [],
  typeFilter = null,
  filterVisible = false,
  onFilterClose,
  onFilterChange,
  onOpenAnamnese,
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
  const scrollRef = useRef<ScrollView>(null);
  const pinnedCardY = useRef(0);
  const isStaff = userRoles.some((r) => STAFF_ROLES.has(r));
  const isSocial = userRoles.includes("social");
  const currentUid = auth.currentUser?.uid ?? "";
  const { actingAs } = useProxy();
  const { status: anamneseStatus } = useAnamneseStatus();

  const fetchFeed = useCallback(
    async (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "5");

      const qs = params.toString();
      const path = `/timeline${qs ? `?${qs}` : ""}`;
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      return api.get<FeedResponse>(path, { headers });
    },
    [typeFilter, actingAs]
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

  // Reload when filter or proxy user changes
  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    setScreen("loading");
    loadFeed();
  }, [typeFilter, actingAs]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // entityType is already "attendance" or "donations" (English)
      try {
        await api.patch(`/${entityType}/${entityId}/validate`, {
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
      // entityType is already "attendance" or "donations" (English)
      try {
        await api.post(`/${entityType}/${entityId}/request-review`, {});
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

  const handlePin = useCallback(
    async (entryId: string) => {
      try {
        // Backend toggles + enforces single-pin-per-project; reload so the
        // pinned item jumps to the top of the feed.
        await api.patch(`/timeline/${entryId}/pin`, {});
        await loadFeed();
      } catch {
        // Silent fail — next poll reconciles state
      }
    },
    [loadFeed]
  );

  const scrollToPinned = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(pinnedCardY.current - spacing.sm, 0),
      animated: true,
    });
  }, []);

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

  // The pinned entry is shown as a shortcut bar at the top, while its full card
  // stays in chronological position (sort by createdAt so it isn't hoisted).
  const pinnedEntry = entries.find((e) => e.isPinned);
  const displayEntries = pinnedEntry
    ? [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : entries;

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
        <>
        {anamneseStatus !== null && onOpenAnamnese && (
          <AnamneseReminderBanner
            roles={userRoles}
            anamneseStatus={anamneseStatus}
            onPress={onOpenAnamnese}
          />
        )}
        {pinnedEntry && (
          <PinnedRow entry={pinnedEntry} onPress={scrollToPinned} />
        )}
        <ScrollView
        ref={scrollRef}
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
        {displayEntries.map((entry) => {
          const card = (
          <TimelineCard
            key={entry.id}
            entry={entry}
            isStaff={isStaff}
            isTarget={entry.targetUid === currentUid}
            isSocial={isSocial}
            onLike={() => handleLike(entry.id, entry.userLiked)}
            onViewLikes={() => setLikesEntryId(entry.id)}
            onPin={() => handlePin(entry.id)}
            onConfirm={() => {
              const ref = entry.id.split("_");
              const entityId = ref.slice(1).join("_");
              const entityType =
                entry.type === "attendance" ? "attendance" : "donations";
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
                entry.type === "attendance" ? "attendance" : "donations";
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
                entry.type === "attendance" ? "attendance" : "donations";
              handleRequestReview(entityType, entityId, entry.id);
            }}
          />
          );
          if (!entry.isPinned) return card;
          return (
            <View
              key={entry.id}
              onLayout={(e) => {
                pinnedCardY.current = e.nativeEvent.layout.y;
              }}
            >
              {card}
            </View>
          );
        })}

          {loadingMore && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.loadingMore}
            />
          )}
        </ScrollView>
        </>
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
            confirmModal.action === "confirm"
              ? confirmModal.entityType === "attendance"
                ? "confirmed"
                : "received"
              : "absent",
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
