interface PageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow = "Control Center",
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
        {eyebrow}
      </p>
      <div className="space-y-1.5">
        <h1 className="text-balance text-[28px] font-semibold tracking-[-0.03em] text-foreground sm:text-[32px]">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
