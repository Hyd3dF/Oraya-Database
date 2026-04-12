"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Successfully logged out.");
        // Redirect to login page and force full reload
        window.location.href = "/login";
      } else {
        toast.error("Failed to log out.");
      }
    } catch {
      toast.error("An unexpected error occurred during logout.");
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2 bg-red-900/50 text-red-200 hover:bg-red-800/80 hover:text-white transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
