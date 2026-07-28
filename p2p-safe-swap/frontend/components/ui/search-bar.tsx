"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search transactions...",
  className,
  ...props
}: SearchBarProps) {
  return (
    <div
      data-slot="search-bar"
      className={cn(
        "flex items-center gap-2 rounded-full bg-primary/5 px-4 py-2",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
        className
      )}
    >
      <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full bg-transparent text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground"
        )}
        {...props}
      />
    </div>
  );
}
