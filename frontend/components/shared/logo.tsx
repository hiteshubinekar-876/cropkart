import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="flex items-center justify-center rounded-2xl bg-brand-500 text-white shadow-soft">
        <Image
          src="/logo.png"
          alt="CropKart Logo"
          width={40}
          height={40}
          className="rounded-sm object-cover"
        />
      </span>
      <span>
        <span className="block text-lg font-extrabold tracking-tight">CropKart</span>
        <span className="block text-xs text-ink-500">Direct farmer marketplace</span>
      </span>
    </Link>
  );
}
