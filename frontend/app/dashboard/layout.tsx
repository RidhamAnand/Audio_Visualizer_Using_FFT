"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { api, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void api
      .me()
      .then(setUser)
      .catch(async () => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-[1800px]">
        {/* Header */}
        <header className="border-b border-purple-900/30 bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-sm group-hover:scale-110 transition"></div>
              <span className="text-sm font-bold tracking-wider font-space-grotesk hidden sm:inline">SONICLAB</span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end text-right">
                <p className="text-xs text-white/50 font-mono">{user?.email ?? "Loading..."}</p>
              </div>
              <Button 
                onClick={handleLogout} 
                className="h-8 px-3 bg-purple-600/20 hover:bg-purple-600/40 text-white border border-purple-600/50 hover:border-purple-500 text-xs font-medium rounded-md transition"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
