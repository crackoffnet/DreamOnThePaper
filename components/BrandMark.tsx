type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
};

export function BrandMark({
  className = "flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(180,160,130,0.22)] bg-white",
  imageClassName = "h-5 w-5 object-contain",
}: BrandMarkProps) {
  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/dreamonthepaper-eye-navbar-transparent.png"
        alt=""
        aria-hidden="true"
        className={imageClassName}
      />
    </span>
  );
}
