"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-2xl border border-white/80 bg-white/90 text-foreground shadow-panel backdrop-blur-xl",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton:
            "rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground",
          cancelButton:
            "rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground",
          closeButton:
            "rounded-full border border-white/80 bg-white/80 text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
