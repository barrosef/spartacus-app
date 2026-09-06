import React, { useEffect, useState } from "react";
import { PostCard } from "./PostCard";
import { AttendanceCard } from "./AttendanceCard";
import { DonationCard } from "./DonationCard";
import { AccountCard } from "./AccountCard";
import { CommentsSheet } from "./comments/CommentsSheet";
import type { TimelineEntry } from "./types";

interface TimelineCardProps {
  entry: TimelineEntry;
  isStaff: boolean;
  viewerRoles?: string[];
  isTarget: boolean;
  isSocial?: boolean;
  onLike: (entryId: string) => void;
  onViewLikes: (entryId: string) => void;
  onConfirm: (entryId: string) => void;
  onAbsent: (entryId: string) => void;
  onRequestReview: (entryId: string) => void;
  onJustify: (entryId: string) => void;
  onPin?: (entryId: string) => void;
}

export function TimelineCard({
  entry,
  isStaff,
  viewerRoles = [],
  isTarget,
  isSocial = false,
  onLike,
  onViewLikes,
  onConfirm,
  onAbsent,
  onRequestReview,
  onJustify,
  onPin,
}: TimelineCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(entry.commentsCount ?? 0);

  useEffect(() => setCommentCount(entry.commentsCount ?? 0), [entry.commentsCount]);

  const toggleComments = () => setShowComments((v) => !v);

  // Os comentários abrem numa folha sobre o feed, não mais inline no card:
  // inline, o campo de escrita ficava no meio de um feed rolante e sumia
  // atrás do teclado. Cada card só recebe o nó para renderizar como irmão.
  //
  // Montado sempre, e não só quando aberto, para a folha ter animação de
  // saída. Não custa requisição: com visible={false} o Modal do RN devolve
  // null, então a CommentsSection — e o fetch dela — só monta ao abrir.
  const commentsSheet = (
    <CommentsSheet
      visible={showComments}
      onClose={() => setShowComments(false)}
      entryId={entry.id}
      count={commentCount}
      canModerate={isStaff}
      viewerRoles={viewerRoles}
      onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
    />
  );

  switch (entry.type) {
    case "post":
    case "event":
    case "championship":
      return (
        <PostCard
          entry={entry}
          isSocial={isSocial}
          commentsCount={commentCount}
          commentsOpen={showComments}
          commentsSheet={commentsSheet}
          onLike={() => onLike(entry.id)}
          onViewLikes={() => onViewLikes(entry.id)}
          onToggleComments={toggleComments}
          onPin={() => onPin?.(entry.id)}
        />
      );

    case "attendance":
      return (
        <AttendanceCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          commentsCount={commentCount}
          commentsOpen={showComments}
          commentsSheet={commentsSheet}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onJustify={() => onJustify(entry.id)}
          onToggleComments={toggleComments}
        />
      );

    case "donation":
      return (
        <DonationCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          commentsCount={commentCount}
          commentsOpen={showComments}
          commentsSheet={commentsSheet}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
          onToggleComments={toggleComments}
        />
      );

    case "account_created":
      return (
        <AccountCard
          entry={entry}
          commentsCount={commentCount}
          commentsOpen={showComments}
          commentsSheet={commentsSheet}
          onToggleComments={toggleComments}
        />
      );

    default:
      return null;
  }
}
