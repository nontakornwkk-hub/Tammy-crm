import Image from "next/image";

export function CatMark({ size = 44 }: { size?: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-[#fff4ec]" style={{ width: size, height: size }} aria-label="มาสคอตแมวแทมมี่">
      <Image src="/assets/mascots/tammy-cat.png" alt="" fill sizes={`${size}px`} className="scale-[1.18] object-contain object-center" priority={size >= 80} />
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CatMark size={compact ? 38 : 48} />
      <div className="leading-tight">
        <div className="font-black text-[#ef4d43] text-xl">แทมมี่</div>
        {!compact && <div className="text-sm font-semibold text-stone-700">อาหารสัตว์</div>}
      </div>
    </div>
  );
}
