import React from "react";
import {
  Home,
  TrendingUp,
  User,
  Mic,
  Sliders,
  PlusCircle,
  Heart,
  Library,
} from "lucide-react";
import { UserProfile } from "../types";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile;
  onOpenProfile: () => void;
  onOpenImport: () => void;
  recordingsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenProfile,
  onOpenImport,
  recordingsCount,
}) => {
  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "karaoke", label: "Karaoke", icon: Mic, badge: "FAB" },
    { id: "library", label: "Rekaman Saya", icon: Library, badge: recordingsCount > 0 ? String(recordingsCount) : undefined },
    { id: "eq", label: "Equalizer", icon: Sliders },
  ];

  return (
    <>
      {/* === Desktop Sidebar (Smule-style left nav) === */}
      <aside className="hidden md:flex fixed left-0 top-0 w-64 h-full bg-neutral-900 border-r border-neutral-800 flex-col z-50">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none">
              Aizat
            </h1>
            <p className="text-xs text-pink-400 font-medium leading-none mt-0.5">
              Karaoke Studio
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
                  isActive
                    ? "bg-pink-500/15 text-pink-400"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="px-6 py-2">
          <div className="border-t border-neutral-800" />
        </div>

        {/* Import Music */}
        <div className="px-3 pb-2">
          <button
            onClick={onOpenImport}
            className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition text-sm font-medium"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Import Musik</span>
          </button>
        </div>

        {/* User Profile Mini Card */}
        <div className="p-3 mt-auto">
          <button
            onClick={onOpenProfile}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-neutral-400 truncate">
                {user.rankTitle}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* === Mobile Bottom Nav (Smule-style bottom bar) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around z-50 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isKaraoke = item.id === "karaoke";
          
          if (isKaraoke) {
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/50">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] text-pink-400 mt-0.5 font-medium">
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 ${
                isActive ? "text-pink-400" : "text-neutral-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
