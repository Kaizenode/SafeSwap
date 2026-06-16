interface DateGroupHeaderProps {
  label: string;
}

export function DateGroupHeader({ label }: DateGroupHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
