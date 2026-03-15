"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Send, Shield, MessageSquare, Loader2, Sparkles, X, ChevronRight, Zap, Globe, Activity } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { GameState } from "@/lib/gameReducer";
import { getGuildMessages, sendGuildMessage, subscribeToGuildChat, getFirstGuild, GuildMessage } from "@/lib/services/guildService";
import { systemAudio } from "@/lib/audio";
import { supabase } from "@/lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GuildHallProps {
  state: GameState;
}

export default function GuildHall({ state }: GuildHallProps) {
  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentGuild, setCurrentGuild] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const user = state.user;

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const guild = await getFirstGuild();
        if (guild) {
          setCurrentGuild(guild);
          const history = await getGuildMessages(guild.id);
          setMessages(history);
        }
      } catch (err) {
        console.error("[GuildHall] Init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentGuild) return;
    const sub = subscribeToGuildChat(currentGuild.id, async (payload) => {
      const { data, error } = await supabase
        .from("guild_chat_messages")
        .select(`
          id,
          guild_id,
          user_id,
          content,
          created_at,
          users (
            username,
            avatar_url
          )
        `)
        .eq("id", payload.new.id)
        .single();
      
      if (data) {
        const newMessage = { ...data, user: Array.isArray(data.users) ? data.users[0] : data.users } as unknown as GuildMessage;
        setMessages(prev => {
          if (prev.find(m => m.id === newMessage.id)) return prev;
          systemAudio?.playClick();
          return [...prev, newMessage];
        });
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [currentGuild]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !currentGuild || sending) return;
    
    setSending(true);
    systemAudio?.playClick();
    
    const result = await sendGuildMessage(currentGuild.id, user.id, inputText);
    if (result) {
      setInputText("");
    }
    setSending(false);
  };

  if (!currentGuild && !loading) {
    return (
      <div className="system-panel p-16 text-center border-[#EF4444]/40 bg-[#EF4444]/5 italic">
         <Shield className="mx-auto mb-6 text-[#EF4444] opacity-40 animate-pulse" size={80} />
         <h2 className="font-title font-black text-3xl text-[#E2E8F0] tracking-widest uppercase mb-4">NO_GUILD_DATA_DETECTED</h2>
         <p className="text-[12px] font-system text-slate-500 uppercase tracking-[0.4em] font-black max-w-md mx-auto leading-relaxed">
            THE_SYSTEM_COULD_NOT_LOCATE_GUILD_SIGNATURES. ESTABLISH_A_COLLECTIVE_REGISTRY_TO_ENABLE_SECURE_TRANSMISSIONS.
         </p>
      </div>
    );
  }

  return (
    <div className="system-panel p-6 md:p-10 min-h-[700px] flex flex-col font-exo bg-[#030308]/60 overflow-hidden relative italic">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.05),transparent_60%)] pointer-events-none" />
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-8 border-b border-white/5 pb-8 relative z-10">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 hex-frame border-2 border-[#06B6D4] bg-[#06B6D4]/10 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] group cursor-pointer hover:rotate-12 transition-all">
              <Users className="text-[#06B6D4]" size={28} />
           </div>
           <div>
              <div className="flex items-center gap-3 mb-1.5">
                 <div className="w-2 h-2 rounded-full bg-[#06B6D4] shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                 <h2 className="text-[10px] font-system text-[#06B6D4] font-black tracking-[0.5em] uppercase">COLLECTIVE_NETWORK_NODE</h2>
              </div>
              <h3 className="text-3xl font-title font-black text-[#E2E8F0] tracking-widest uppercase flex items-center gap-4 italic underline underline-offset-8 decoration-[#06B6D4]/20">
                {currentGuild?.name || "AHJIN_GUILD"}
              </h3>
           </div>
        </div>
        
        <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 corner-cut">
           <div className="text-right hidden sm:block">
              <span className="text-[9px] font-system text-slate-500 uppercase tracking-widest font-black block mb-0.5">WORLD_RAID_RANK</span>
              <span className="text-sm font-title font-black text-[#D97706] tracking-[0.2em]">S-RANK_REGISTRY</span>
           </div>
           <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 hex-frame border-2 border-black bg-white/5 flex items-center justify-center text-[10px] font-black font-system border-white/10 hover:z-10 hover:scale-110 transition-transform cursor-pointer">H{i}</div>
              ))}
              <div className="w-10 h-10 hex-frame border-2 border-black bg-[#7C3AED]/10 flex items-center justify-center text-[9px] font-black font-system border-[#7C3AED]/30 text-[#7C3AED]">+46</div>
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-0">
        {/* Chat Area Main Plane */}
        <div className="lg:col-span-8 flex flex-col system-panel bg-black/40 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
             <MessageSquare size={120} className="text-white" />
          </div>
          
          <div ref={scrollRef} className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar relative z-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full animate-pulse text-[#06B6D4]">
                <Loader2 size={48} className="animate-spin mb-4" />
                <span className="text-[10px] font-system tracking-[0.5em] uppercase font-black">SYNCING_TRANSMISSIONS...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 font-system text-[11px] font-black uppercase tracking-[0.6em] italic text-center">
                 <Globe size={48} className="mb-6 opacity-10" />
                 NO_SECURE_FEEDS_DETECTED. START_THE_COLLECTIVE_STREAK.
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.user_id === user.id;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn("flex flex-col", isMe ? 'items-end' : 'items-start')}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {!isMe && <span className="text-[10px] font-title font-black text-[#06B6D4] uppercase tracking-widest italic">{msg.user?.username || "ANONYMOUS_HUNTER"}</span>}
                      <span className="text-[8px] font-system text-slate-600 font-black uppercase tracking-widest">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && <span className="text-[10px] font-title font-black text-[#7C3AED] uppercase tracking-widest italic">MONARCH_LINK</span>}
                    </div>
                    <div className={cn(
                       "p-4 px-6 rounded-2xl max-w-[85%] text-[12px] font-system font-black tracking-widest leading-relaxed italic border transition-all",
                       isMe 
                        ? 'bg-[#7C3AED]/10 text-white border-[#7C3AED]/30 rounded-tr-none shadow-[0_5px_15px_rgba(124,58,237,0.1)] hover:border-[#7C3AED]/60' 
                        : 'bg-white/[0.03] text-slate-300 border-white/5 rounded-tl-none hover:border-white/20'
                    )}>
                      {msg.content}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          {/* Input Interface Area */}
          <div className="p-6 bg-black/60 border-t border-white/5 relative z-20">
            <div className="flex gap-4 relative">
              <input 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                className="flex-1 bg-white/[0.03] border border-white/10 corner-cut px-6 py-4 text-sm focus:outline-none focus:border-[#06B6D4]/50 transition-all font-system text-white placeholder:text-slate-700 font-black uppercase tracking-widest"
                placeholder="Broadcast_to_guild_frequency..."
              />
              <button 
                onClick={handleSend}
                disabled={sending || !inputText.trim()}
                className="p-4 px-8 bg-[#06B6D4] text-white corner-cut hover:bg-[#22D3EE] active:scale-95 transition-all flex items-center gap-3 border border-[#06B6D4]/30 disabled:opacity-30 shadow-[0_10px_30px_rgba(6,182,212,0.3)] group/btn"
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                <span className="font-title font-black text-[10px] tracking-[0.4em] hidden md:inline uppercase italic">SYNC_MSG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Support Visual Intelligence Plane (Sidebar) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="system-panel p-6 bg-[#06B6D4]/5 border-[#06B6D4]/20 group">
            <div className="flex items-center justify-between mb-6">
               <h4 className="text-[10px] font-system text-[#06B6D4] font-black uppercase tracking-[0.4em] flex items-center gap-3 italic">
                 <Shield size={14} /> ACTIVE_OPERATIONS
               </h4>
               <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 group-hover:border-[#06B6D4]/30 transition-all cursor-pointer">
                <div className="flex justify-between items-center mb-3">
                   <div className="text-[10px] font-system font-black text-[#E2E8F0] tracking-widest uppercase">RAID: JADE_KING_STRIKE</div>
                   <div className="text-[10px] font-system text-[#06B6D4] font-black tracking-widest">45%_SYNC</div>
                </div>
                <div className="h-2 bg-white/5 corner-cut overflow-hidden border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: "45%" }} className="h-full bg-[#06B6D4] shadow-[0_0_10px_#06B6D4]" />
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 opacity-40">
                <div className="text-[10px] font-system font-black text-slate-500 tracking-widest uppercase mb-1">COLLECTIVE_CH_ARCHIVE</div>
                <div className="text-[8px] font-system text-slate-700 italic font-black uppercase tracking-widest">AWAITING_RESONANCE_INDEX</div>
              </div>
            </div>
          </div>
          
          <div className="system-panel p-6 border-[#7C3AED]/20 bg-[#7C3AED]/5 relative overflow-hidden group">
             <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#7C3AED]/10 rounded-full blur-3xl group-hover:bg-[#7C3AED]/20 transition-all" />
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <Activity size={14} className="text-[#7C3AED] animate-bounce" />
                   <div className="text-[10px] font-system font-black text-[#7C3AED] uppercase tracking-[0.4em] italic leading-none">SYSTEM_LINK_STABILITY</div>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-[9px] font-system text-slate-500 font-black uppercase tracking-widest">
                      <span>DATACENTER_GATEWAY:</span>
                      <span className="text-white">JEJU-NODE-1</span>
                   </div>
                   <div className="flex justify-between items-center text-[9px] font-system text-slate-500 font-black uppercase tracking-widest">
                      <span>NETWORK_LATENCY:</span>
                      <span className="text-[#10B981]">14.2ms</span>
                   </div>
                   <div className="flex justify-between items-center text-[9px] font-system text-slate-500 font-black uppercase tracking-widest">
                      <span>SYNC_FREQUENCY:</span>
                      <span className="text-[#F59E0B]">REALTIME</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="p-6 text-center opacity-30 select-none">
             <div className="w-12 h-px bg-slate-800 mx-auto mb-4" />
             <p className="text-[10px] font-system text-slate-600 italic font-black uppercase tracking-[0.2em] leading-relaxed">
               "THE_STRONGEST_GUILDS_ARE_FORGED_IN_THE_FIRES_OF_DISCIPLINE_AND_SYNCED_WILLS."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
