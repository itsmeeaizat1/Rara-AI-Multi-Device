import React from "react";
import {
  Play,
  Heart,
  MessageCircle,
  Share2,
  Mic,
  Users,
  MoreHorizontal,
} from "lucide-react";

export interface FeedPerformance {
  id: string;
  songId: string;
  songTitle: string;
  originalArtist: string;
  singerName: string;
  singerAvatar: string;
  coverBg: string;
  duration: string;
  likes: number;
  comments: number;
  shares: number;
  isCollab: boolean;
  collabPartner?: string;
  timeAgo: string;
}

interface PerformanceCardProps {
  performance: FeedPerformance;
  onPlay: () => void;
  onJoin: () => void;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  performance,
  onPlay,
  onJoin,
}) => {
  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(performance.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="bg-neutral-900 rounded-xl overflow-hidden hover:bg-neutral-800 transition group">
      {/* Cover Thumbnail (Smule-style) */}
      <div
        className={`relative aspect-video bg-gradient-to-br ${performance.coverBg} cursor-pointer overflow-hidden`}
        onClick={onPlay}
      >
        {/* Singer avatar circle (Smule signature look) */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-xs">
            {performance.singerName.charAt(0)}
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">
            {performance.singerName}
          </span>
        </div>

        {/* Collab badge */}
        {performance.isCollab && performance.collabPartner && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium">
            <Users className="w-3 h-3" />
            Duet w/ {performance.collabPartner}
          </div>
        )}

        {/* Play button center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:scale-110">
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
        </div>

        {/* Duration */}
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-mono">
          {performance.duration}
        </span>
      </div>

      {/* Card Info (Smule-style social actions) */}
      <div className="p-3">
        {/* Song title + artist */}
        <div className="mb-2">
          <h3 className="font-bold text-sm text-white truncate">
            {performance.songTitle}
          </h3>
          <p className="text-xs text-neutral-400 truncate">
            Original by {performance.originalArtist}
          </p>
        </div>

        {/* Time + Join button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-neutral-500">{performance.timeAgo}</span>
          <button
            onClick={onJoin}
            className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition"
          >
            <Mic className="w-3 h-3" />
            Join Duet
          </button>
        </div>

        {/* Social Actions (Smule-style likes/comments/shares) */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 transition hover:text-pink-400 ${
              liked ? "text-pink-500" : ""
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-pink-500" : ""}`} />
            {likeCount.toLocaleString("id-ID")}
          </button>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            {performance.comments}
          </span>
          <span className="flex items-center gap-1.5">
            <Share2 className="w-4 h-4" />
            {performance.shares}
          </span>
          <button className="ml-auto text-neutral-500 hover:text-white transition">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
