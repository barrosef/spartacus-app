import React, { useEffect, useState } from "react";
import { View } from "react-native";
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

  let card: React.ReactNode;
  switch (entry.type) {
    case "post":
    case "event":
    case "championship":
      card = (
        <PostCard
          entry={entry}
          isSocial={isSocial}
          commentsCount={commentCount}
          commentsOpen={showComments}
          onLike={() => onLike(entry.id)}
          onViewLikes={() => onViewLikes(entry.id)}
          onToggleComments={toggleComments}
          onPin={() => onPin?.(entry.id)}
        />
      );
      break;

    case "attendance":
      card = (
        <AttendanceCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          commentsCount={commentCount}
          commentsOpen={showComments}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
          onToggleComments={toggleComments}
        />
      );
      break;

    case "donation":
      card = (
        <DonationCard
          entry={entry}
          isStaff={isStaff}
          isTarget={isTarget}
          commentsCount={commentCount}
          commentsOpen={showComments}
          onConfirm={() => onConfirm(entry.id)}
          onAbsent={() => onAbsent(entry.id)}
          onRequestReview={() => onRequestReview(entry.id)}
          onToggleComments={toggleComments}
        />
      );
      break;

    case "account_created":
      card = (
        <AccountCard
          entry={entry}
          commentsCount={commentCount}
          commentsOpen={showComments}
          onToggleComments={toggleComments}
        />
      );
      break;

    default:
      card = null;
  }

  if (card === null) return null;

  return (
    <View>
      {card}
      {showComments ? (
        <CommentsSection
          entryId={entry.id}
          canModerate={isStaff}
          viewerRoles={viewerRoles}
          onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      ) : null}
    </View>
  );
}
