import React from "react";
import { Search, Bell, PlusCircle, Mic } from "lucide-react";
import { UserProfile } from "../types";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenImport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  user,
  onOpenProfile,
  onOpenImport,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
      {/* Mobile Logo */}
      <div className="md:hidden flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Mic className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Search Bar (Smule-style center search) */}
      <div className="flex-1 max-w-xl mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Cari lagu, artis, atau singer..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 transition"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <button className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center transition relative">
          <Bell className="w-4 h-4 text-neutral-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
        </button>

        {/* Import (desktop) */}
        <button
          onClick={onOpenImport}
          className="hidden md:flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 px-3 py-2 rounded-full text-sm font-medium transition"
        >
          <PlusCircle className="w-4 h-4" />
          Import
        </button>

        {/* Avatar */}
        <button
          onClick={onOpenProfile}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm hover:scale-105 transition"
        >
          {user.name.charAt(0)}
        </button>
      </div>
    </header>
  );
};
