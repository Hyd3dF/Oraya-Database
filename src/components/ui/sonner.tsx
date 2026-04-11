"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-lg border border-zinc-800/60 bg-zinc-900/95 text-zinc-200 shadow-xl shadow-black/40 backdrop-blur-xl",
          title: "text-sm font-medium text-zinc-200",
          description: "text-xs text-zinc-500",
          actionButton:
            "rounded-md bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/20",
          cancelButton:
            "rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-white/10",
          closeButton:
            "rounded-md bg-transparent border border-transparent px-2 py-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-300",
          success: 
            "border-zinc-700/50 bg-zinc-900/95 text-zinc-200",
          error:
            "border-red-500/30 bg-red-500/10 text-red-300",
          warning:
            "border-amber-500/30 bg-amber-500/10 text-amber-300",
          info:
            "border-blue-500/30 bg-blue-500/10 text-blue-300",
        },
      }}
      visibleToasts={3}
      expand={false}
      {...props}
    />
  );
}
