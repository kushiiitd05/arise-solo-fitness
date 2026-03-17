"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Shield, Zap, Sparkles, Loader2, Info, CheckCircle2, X, Trash2, ChevronRight } from "lucide-react";
import { getUserInventory, UserItem } from "@/lib/services/inventoryService";
import { systemAudio } from "@/lib/audio";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InventoryProps {
  userId: string;
  dispatch: React.Dispatch<any>;
  onEquipChange?: () => void;
}

export default function Inventory({ userId, dispatch, onEquipChange }: InventoryProps) {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UserItem | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await getUserInventory(userId);
        setItems(data);
      } catch (err) {
        console.error("[Inventory] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [userId]);

  const handleToggleEquip = async (item: UserItem) => {
    if (toggling) return;
    setToggling(true);
    systemAudio?.playClick();

    const newEquipStatus = !item.equipped;

    try {
      const res = await fetch("/api/inventory/equip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify({ userItemId: item.id, equip: newEquipStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "equip failed");

      // Update local item list
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, equipped: newEquipStatus } : i));
      setSelectedItem(prev => prev?.id === item.id ? { ...prev, equipped: newEquipStatus } : prev);

      // Fire stat delta notifications per stat in effects
      const effects = item.items?.effects;
      if (effects) {
        const statKeys = ["strength", "vitality", "agility", "intelligence", "perception", "sense"] as const;

        for (const [key, val] of Object.entries(effects)) {
          if (statKeys.includes(key as any) && typeof val === "number") {
            const label = key.toUpperCase();
            dispatch({
              type: "ADD_NOTIFICATION",
              payload: {
                type: "QUEST",
                title: newEquipStatus ? `${label} +${val}` : `${label} -${val}`,
                body: newEquipStatus ? `${item.items?.name} equipped` : `${item.items?.name} unequipped`,
                icon: newEquipStatus ? "⚔️" : "📦",
              },
            });
          }
        }
      }

      // Notify Dashboard to re-merge item bonuses into game state
      onEquipChange?.();

      if (newEquipStatus) systemAudio?.playSuccess();
    } catch (err) {
      console.error("[Inventory] Equip failed:", err);
    } finally {
      setToggling(false);
    }
  };

  const getRarityDNA = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return { color: '#F59E0B', glow: 'rgba(245,158,11,0.4)', text: 'LEGENDARY' };
      case 'EPIC': return { color: '#A855F7', glow: 'rgba(168,85,247,0.4)', text: 'EPIC' };
      case 'RARE': return { color: '#3B82F6', glow: 'rgba(59,130,246,0.4)', text: 'RARE' };
      default: return { color: '#06B6D4', glow: 'rgba(6,182,212,0.4)', text: 'COMMON' };
    }
  };

  return (
    <div className="system-panel p-6 md:p-10 min-h-[700px] flex flex-col font-exo bg-[#030308]/60">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/5 pb-8">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.6)]" />
              <h2 className="text-[10px] font-system text-[#7C3AED] font-black tracking-[0.5em] uppercase">STORAGE_INTERFACE_V2</h2>
           </div>
           <h3 className="text-3xl font-title font-black text-[#E2E8F0] tracking-widest uppercase flex items-center gap-4 italic">
             <Package size={28} className="text-[#7C3AED] glow-purple" /> ARMORY_LINK
           </h3>
        </div>
        <div className="px-6 py-2 bg-black/40 border border-white/10 corner-cut flex items-center gap-4">
           <span className="text-[10px] font-system text-slate-500 uppercase tracking-widest">Storage Efficiency</span>
           <span className="text-xl font-title text-[#06B6D4] font-black font-system">{items.length}<span className="text-slate-700 mx-1">/</span>100</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* HEX GRID AREA */}
        <div className="xl:col-span-8">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-80 text-[#06B6D4] animate-pulse">
                <Loader2 size={48} className="animate-spin mb-4" />
                <span className="text-[11px] font-system tracking-[0.4em] uppercase font-black">Decrypting Mana Signatures...</span>
             </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4">
              {items.map((item) => {
                const dna = getRarityDNA(item.items?.rarity || 'COMMON');
                const isSelected = selectedItem?.id === item.id;
                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05, y: -4 }}
                    onClick={() => { systemAudio?.playClick(); setSelectedItem(item); }}
                    className={cn(
                      "aspect-square relative flex items-center justify-center cursor-pointer group transition-all hex-frame border",
                      isSelected ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "border-white/5 bg-[#030308]/40 hover:border-white/20"
                    )}
                  >
                    <div className="relative z-10 text-4xl filter group-hover:scale-110 duration-500 transition-transform">
                      {item.items?.type === 'EQUIPMENT' ? '⚔️' : item.items?.type === 'CONSUMABLE' ? '🧪' : '🌑'}
                    </div>
                    
                    {/* Item Rarity Notch */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 opacity-60" style={{ backgroundColor: dna.color }} />
                    
                    {item.equipped && (
                      <div className="absolute top-2 right-2 z-20">
                         <div className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)] border border-white/20" />
                      </div>
                    )}

                    {/* Rarity Glow on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle at center, ${dna.glow}, transparent 70%)` }} />
                  </motion.div>
                );
              })}
              {Array.from({ length: Math.max(0, 21 - items.length) }).map((_, i) => (
                <div key={i} className="aspect-square hex-frame border border-white/[0.02] bg-black/40 opacity-20 pointer-events-none flex items-center justify-center">
                   <div className="w-3 h-3 border border-white/5 rounded-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ANALYST PANEL */}
        <div className="xl:col-span-4">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div 
                key={selectedItem.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="system-panel p-8 bg-black/60 min-h-full border-[#7C3AED]/20 relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none select-none">
                   <h4 className="text-[120px] font-title font-black text-[#E2E8F0] tracking-tighter">DATA</h4>
                </div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                   <div 
                      className="px-4 py-1.5 corner-cut text-[9px] font-black font-system tracking-[0.3em] border"
                      style={{ color: getRarityDNA(selectedItem.items?.rarity || 'COMMON').color, borderColor: getRarityDNA(selectedItem.items?.rarity || 'COMMON').color + '40', backgroundColor: getRarityDNA(selectedItem.items?.rarity || 'COMMON').color + '10' }}
                   >
                     {getRarityDNA(selectedItem.items?.rarity || 'COMMON').text}_GRADE
                   </div>
                   <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                <div className="flex flex-col items-center mb-8">
                  <div className="w-32 h-32 relative mb-6 flex items-center justify-center group">
                     <div className="absolute inset-0 hex-frame bg-white/[0.02] border border-white/5 group-hover:rotate-45 transition-transform duration-1000" />
                     <div className="text-8xl filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] relative z-10">
                        {selectedItem.items?.type === 'EQUIPMENT' ? '⚔️' : selectedItem.items?.type === 'CONSUMABLE' ? '🧪' : '🌑'}
                     </div>
                  </div>
                  <h4 className="text-2xl font-title font-black text-[#E2E8F0] text-center mb-1 tracking-widest uppercase italic">
                     {selectedItem.items?.name}
                  </h4>
                  <div className="text-[10px] font-system text-[#06B6D4] tracking-[0.6em] uppercase flex items-center gap-3">
                     <div className="h-[1px] w-6 bg-[#06B6D4]/30" />
                     {selectedItem.items?.type}
                     <div className="h-[1px] w-6 bg-[#06B6D4]/30" />
                  </div>
                </div>

                <div className="flex-1 space-y-6 relative z-10">
                   <div className="p-5 bg-[#030308]/60 border border-white/5 corner-cut">
                      <div className="text-[9px] font-system text-slate-500 uppercase tracking-[0.4em] mb-3 flex items-center gap-2 font-black italic">
                        <Info size={12} className="text-[#7C3AED]" /> System_Description
                      </div>
                      <p className="text-[11px] font-system text-[#E2E8F0] leading-relaxed tracking-widest uppercase italic font-black">
                        "{selectedItem.items?.description || "An artifact manifesting from high-energy mana fluctuations in the rift zone."}"
                      </p>
                   </div>

                   <div className="p-5 bg-[#7C3AED]/5 border border-[#7C3AED]/20 corner-cut">
                      <div className="text-[9px] font-system text-[#7C3AED] uppercase tracking-[0.4em] mb-4 flex items-center gap-2 font-black italic">
                        <Zap size={12} /> Active_Attributes
                      </div>
                      <div className="space-y-3">
                        {selectedItem.items?.effects && Object.entries(selectedItem.items.effects).map(([stat, val]) => (
                           <div key={stat} className="flex justify-between items-center border-b border-white/[0.02] pb-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat}</span>
                              <span className="text-sm font-title font-black text-[#7C3AED] font-system">+{val as number}</span>
                           </div>
                        ))}
                        {!selectedItem.items?.effects && (
                           <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">
                             NO_MODIFIERS_DETECTED
                           </div>
                        )}
                      </div>
                   </div>
                </div>

                <div className="mt-10 flex gap-4">
                  {/* Only show equip button for EQUIPMENT type */}
                  {selectedItem.items?.type === "EQUIPMENT" ? (
                  <button
                    onClick={() => handleToggleEquip(selectedItem)}
                    disabled={toggling}
                    className={cn(
                      "flex-1 py-5 font-title font-black text-xs tracking-[0.4em] transition-all flex items-center justify-center gap-3 corner-cut shadow-xl",
                      selectedItem.equipped
                        ? "bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/20"
                        : "bg-[#7C3AED] text-[#E2E8F0] hover:bg-[#A855F7] shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                    )}
                  >
                    {toggling ? <Loader2 size={16} className="animate-spin" /> : selectedItem.equipped ? <X size={16} /> : <CheckCircle2 size={16} />}
                    {selectedItem.equipped ? "UNEQUIP" : "EQUIP"}
                  </button>
                  ) : (
                  <button
                    disabled
                    className="flex-1 py-5 font-title font-black text-xs tracking-[0.4em] bg-white/5 border border-white/10 text-slate-600 corner-cut flex items-center justify-center gap-3 cursor-not-allowed"
                  >
                    <Zap size={16} className="opacity-40" />
                    USE [FUTURE]
                  </button>
                  )}
                  
                  <button className="px-6 py-5 bg-white/5 border border-white/10 text-slate-600 hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-all corner-cut group">
                     <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center system-panel border-white/[0.02] bg-transparent opacity-20 p-12 text-center select-none">
                 <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-6 animate-pulse">
                    <Package size={32} className="text-slate-500" />
                 </div>
                 <p className="text-[10px] font-system font-black uppercase tracking-[0.4em] leading-relaxed max-w-[200px]">
                    SELECT_ITEM_TO_VERIFY_MANA_SIGNATURE
                 </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FOOTER STATS SUMMARY */}
      {(() => {
        // Compute footer values from equipped items
        const equippedItems = items.filter(i => i.equipped);

        // Active_Buffs: dominant bonus stat (highest single value across all equipped items)
        const allBonuses: Array<{ stat: string; val: number }> = [];
        for (const equippedItem of equippedItems) {
          if (equippedItem.items?.effects) {
            for (const [stat, val] of Object.entries(equippedItem.items.effects)) {
              if (["strength","vitality","agility","intelligence","perception","sense"].includes(stat)) {
                allBonuses.push({ stat, val: val as number });
              }
            }
          }
        }
        allBonuses.sort((a, b) => b.val - a.val);
        const activeBuff = allBonuses.length > 0
          ? `${allBonuses[0].stat.toUpperCase()} +${allBonuses[0].val}`
          : "NONE";

        // Defense_Rating: total VIT bonus from equipped items
        const vitBonus = allBonuses.filter(b => b.stat === "vitality").reduce((s, b) => s + b.val, 0);
        const defenseRating = vitBonus > 0 ? `VIT +${vitBonus}` : "0 BONUS";

        // Global_Rarity: highest rarity among equipped items
        const RARITY_ORDER = ["LEGENDARY", "EPIC", "RARE", "UNCOMMON", "COMMON"];
        const highestRarity = equippedItems.reduce((best, equippedItem) => {
          const rank = RARITY_ORDER.indexOf(equippedItem.items?.rarity || "COMMON");
          const bestRank = RARITY_ORDER.indexOf(best);
          return rank < bestRank ? (equippedItem.items?.rarity || "COMMON") : best;
        }, "COMMON");

        return (
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-white/5">
        {[
          { label: "Active_Buffs",   val: activeBuff,    icon: <Zap size={14} />,      color: "text-[#06B6D4]", bg: "bg-[#06B6D4]/10" },
          { label: "Defense_Rating", val: defenseRating, icon: <Shield size={14} />,   color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
          { label: "Global_Rarity",  val: highestRarity, icon: <Sparkles size={14} />, color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-4 group p-1 transition-all">
            <div className={cn("p-3 corner-cut border transition-all group-hover:scale-110", s.bg, s.color, s.color.replace('text', 'border') + '/30')}>
               {s.icon}
            </div>
            <div>
              <div className="text-[8px] font-system text-slate-500 uppercase tracking-widest font-black mb-1 italic">{s.label}</div>
              <div className={cn("text-[11px] font-title font-black uppercase tracking-widest font-system", s.color)}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>
        );
      })()}
    </div>
  );
}
