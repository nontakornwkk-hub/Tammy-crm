"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type StoreBrand = {
  store_name: string; store_name_en: string; tagline: string; description: string;
  welcome_message: string; logo_url: string; login_hero_url: string;
  brand_primary: string; brand_secondary: string;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  card_customization_enabled: boolean; popup_enabled: boolean; redemption_message: string;
};

export const defaultStoreBrand: StoreBrand = {
  store_name: "แทมมี่อาหารสัตว์", store_name_en: "Tammy Pet Shop", tagline: "ระบบสมาชิกและสะสมแต้ม",
  description: "ร้านอาหารสัตว์ ของเล่น และอุปกรณ์สำหรับสัตว์เลี้ยง",
  welcome_message: "ยินดีต้อนรับ สะสมแต้มง่าย แลกของรางวัลมากมาย",
  logo_url: "/assets/mascots/tammy-cat.png", login_hero_url: "/assets/heroes/login-hero.png",
  brand_primary: "#ff625d", brand_secondary: "#ff9b78", opening_hours: {},
  card_customization_enabled: true, popup_enabled: true,
  redemption_message: "กรุณาใช้สิทธิ์ที่หน้าร้านและแสดงหน้านี้ให้พนักงาน",
};

const StoreBrandContext = createContext<{ brand: StoreBrand; refresh: () => Promise<void> }>({ brand: defaultStoreBrand, refresh: async () => {} });

export function StoreBrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState(defaultStoreBrand);
  async function refresh() {
    const { data } = await createClient().from("store_settings").select("store_name,store_name_en,tagline,description,welcome_message,logo_url,login_hero_url,brand_primary,brand_secondary,opening_hours,card_customization_enabled,popup_enabled,redemption_message").eq("id", true).maybeSingle();
    if (data) setBrand({ ...defaultStoreBrand, ...data, opening_hours: data.opening_hours ?? {} } as StoreBrand);
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-500", brand.brand_primary);
    document.documentElement.style.setProperty("--brand-600", brand.brand_primary);
    document.documentElement.style.setProperty("--brand-accent", brand.brand_secondary);
  }, [brand.brand_primary, brand.brand_secondary]);
  const value = useMemo(() => ({ brand, refresh }), [brand]);
  return <StoreBrandContext.Provider value={value}>{children}</StoreBrandContext.Provider>;
}

export function useStoreBrand() { return useContext(StoreBrandContext); }
