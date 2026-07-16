import React, { useEffect, useState } from "react";
import { PostCard } from "./PostCard";
import { AttendanceCard } from "./AttendanceCard";
import { DonationCard } from "./DonationCard";
import { AccountCard } from "./AccountCard";
import { CommentsSection } from "./comments/CommentsSection";
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
  onPin,
}: TimelineCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(entry.commentsCount ?? 0);

  useEffect(() => setCommentCount(entry.commentsCount ?? 0), [entry.commentsCount]);

  const toggleComments = () => setShowComments((v) => !v);

  // Seção inline renderizada DENTRO do card (estilo Instagram) — cada card
  // a recebe como nó e a posiciona como último filho do seu container.
  const commentsSection = showComments ? (
    <CommentsSection
      entryId={entry.id}
      canModerate={isStaff}
      viewerRoles={viewerRoles}
      onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
    />
  ) : null;

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
          commentsSection={commentsSection}
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
          commentsSection={commentsSection}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
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
          commentsSection={commentsSection}
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
          commentsSection={commentsSection}
          onToggleComments={toggleComments}
        />
      );

    default:
      return null;
  }
}
