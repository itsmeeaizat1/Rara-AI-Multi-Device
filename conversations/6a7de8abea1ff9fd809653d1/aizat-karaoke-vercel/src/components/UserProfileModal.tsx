import React from "react";
import { X, User, Award, ShieldCheck, LogOut, LogIn, Sparkles } from "lucide-react";
import { UserProfile } from "../types";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn font-sans text-white">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-pink-400" />
            <h3 className="font-extrabold text-base">Profil Akun</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-neutral-800">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-700 p-1 shadow-lg shrink-0">
              <div className="w-full h-full bg-neutral-950 rounded-full flex items-center justify-center font-extrabold text-xl text-pink-400 border border-pink-400/30 overflow-hidden">
                {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-base text-white truncate flex items-center gap-1.5">
                {user.name}
                <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/30">VERIFIED</span>
              </h4>
              <p className="text-xs text-neutral-400 font-mono">@{user.username}</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-pink-400 font-medium">
                <Award className="w-3.5 h-3.5" /> {user.rankTitle}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-mono">REKAMAN</span>
              <span className="text-sm font-extrabold text-pink-400">{user.totalRecordings}</span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-mono">SING TIME</span>
              <span className="text-sm font-extrabold text-pink-400">{user.totalSingTimeMinutes}m</span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-mono">PENGIKUT</span>
              <span className="text-sm font-extrabold text-pink-400">{user.followers}</span>
            </div>
          </div>

          <div className="bg-black/40 p-3.5 rounded-2xl border border-neutral-800 space-y-2">
            <h5 className="text-xs font-bold text-neutral-300">Pengaturan Audio:</h5>
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-pink-400" /> 48kHz Hi-Res Processing</span>
              <span className="text-[10px] bg-pink-950 text-pink-300 px-2 py-0.5 rounded font-mono">Lossless</span>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-pink-400" /> Equalizer 12-Band</span>
              <span className="text-[10px] bg-pink-950 text-pink-300 px-2 py-0.5 rounded font-mono">Aktif</span>
            </div>
          </div>

          <button onClick={() => onUpdateUser({ ...user, isLoggedIn: !user.isLoggedIn })} className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${user.isLoggedIn ? "bg-neutral-800 text-rose-400 border-neutral-700 hover:bg-neutral-700" : "bg-pink-500 text-black border-pink-400 hover:bg-pink-400"}`}>
            {user.isLoggedIn ? <><LogOut className="w-4 h-4" /> Keluar Akun</> : <><LogIn className="w-4 h-4" /> Masuk Akun</>}
          </button>
        </div>
      </div>
    </div>
  );
};
