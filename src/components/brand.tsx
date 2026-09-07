import Image from "next/image";
import { useStoreBrand } from "./store-brand-provider";

export function CatMark({ size = 44, src }: { size?: number; src?: string }) {
  const { brand } = useStoreBrand();
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-[#fff4ec]" style={{ width: size, height: size }} aria-label="มาสคอตแมวแทมมี่">
      <Image unoptimized src={src || brand.logo_url} alt="" fill sizes={`${size}px`} className="object-contain object-center" priority={size >= 80} />
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const { brand } = useStoreBrand();
  return (
    <div className="flex items-center gap-2">
      <CatMark size={compact ? 38 : 48} />
      <div className="leading-tight">
        <div className="max-w-36 truncate text-xl font-black text-[var(--brand-600)]">{brand.store_name}</div>
        {!compact && <div className="max-w-36 truncate text-sm font-semibold text-stone-700">{brand.store_name_en || brand.tagline}</div>}
      </div>
    </div>
  );
}
