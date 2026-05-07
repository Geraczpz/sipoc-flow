import { ReactNode } from "react";

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="border-b border-border bg-card">
    <div className="flex flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between md:px-10 md:py-12">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-4xl text-foreground md:text-5xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="brand-bars h-2 w-24 opacity-80 ml-6 md:ml-10 -mt-px" />
  </div>
);
