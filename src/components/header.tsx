"use client";

import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  
  // Determine the title based on the current path
  const getTitle = () => {
    if (pathname === "/") return "Swap";
    if (pathname === "/staking") return "Staking";
    return "NeonSwap";
  };

  return (
    <header className="flex h-16 items-center justify-end border-b border-gray-800/30 bg-black/60 backdrop-blur-xl px-6">
      <div className="flex items-center">
        <a href="https://x.com/neonswapxyz" target="_blank" rel="noopener noreferrer">
          <GradientButton
            className="h-10 cursor-pointer"
            style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
          >
            <span className="relative z-[1]" style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}>
              BUY $NEON
            </span>
          </GradientButton>
        </a>
      </div>
    </header>
  );
} 