"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function checkUsers() {
      try {
        const res = await fetch("/api/auth/has-users");
        const data = await res.json();
        if (data.hasUsers) {
          router.replace("/login");
        } else {
          setIsChecking(false);
        }
      } catch {
        toast.error("Failed to check database state.");
        setIsChecking(false);
      }
    }
    void checkUsers();
  }, [router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Admin account created successfully.");
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-[2rem] border border-zinc-800/60 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 shadow-inner">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Initialize System</h1>
          <p className="text-sm text-zinc-400">
            Create the primary administrator account. No other accounts can be created after this.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300 ml-1">Username</label>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 rounded-xl border-zinc-800 bg-zinc-950/50 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
              placeholder="Admin"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300 ml-1">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border-zinc-800 bg-zinc-950/50 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300 ml-1">Confirm Password</label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 rounded-xl border-zinc-800 bg-zinc-950/50 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-6 rounded-xl bg-white text-sm font-semibold text-zinc-900 transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account <Lock className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
