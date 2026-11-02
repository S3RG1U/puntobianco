import Image from "next/image";

export function BrandMark() {
  return (
    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-dark">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={24}
        height={24}
        className="size-6"
      />
    </div>
  );
}
