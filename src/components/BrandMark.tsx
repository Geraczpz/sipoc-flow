export const BrandMark = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <span className="brand-bars-light h-5 w-5" />
    <span className="font-display text-base font-semibold tracking-tight">
      Torre <span className="text-accent">de Control</span>
    </span>
  </div>
);
