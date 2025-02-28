"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  ArrowLeftRight, 
  Layers, 
  FileText, 
  Github,
  History,
  BringToFront,
  Ghost,
} from "lucide-react";
import XIcon from "./icons/x-icon";

const navItems = [
  { name: "Swap", href: "/", icon: ArrowLeftRight },
  { name: "Multi-Swap", href: "/multiswap", icon: BringToFront },
  { name: "Ghost-Swap", href: "/ghostswap", icon: Ghost },
  { name: "Transactions", href: "/transactions", icon: History },
  { name: "Staking", href: "#", icon: Layers, badge: "Soon", onClick: (e: React.MouseEvent) => e.preventDefault() },
  { name: "Docs", href: "https://docs.neonswap.xyz", icon: FileText, external: true },
  { name: "Github", href: "https://github.com/neonswapxyz", icon: Github, external: true },
  { name: "Twitter", href: "https://x.com/neonswapxyz", icon: XIcon, external: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Fonction pour vérifier si l'écran est mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Vérifier au chargement
    checkIfMobile();
    
    // Ajouter un écouteur d'événement pour les changements de taille
    window.addEventListener('resize', checkIfMobile);
    
    // Nettoyer l'écouteur d'événement
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <div className="flex h-full flex-col border-r border-gray-800/30 bg-black/60 backdrop-blur-xl text-white md:w-[250px] w-[70px]">
      <div className="p-6 flex justify-center md:justify-start">
        <Link href="/" className="block">
          <div className="relative md:h-10 md:w-[150px] h-8 w-8">
            <Image 
              src={isMobile ? "/favicon.svg" : "/logo.svg"}
              alt="NeonSwap Logo" 
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 md:gap-1 gap-4 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href && !item.external && item.href !== "#";
          return (
            <Link
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={item.onClick}
              className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? "text-white border-l-2 border-[#005C97] font-medium"
                  : "hover:bg-white/5 hover:text-white"
              } ${item.badge ? "justify-between" : "md:justify-start justify-center"}`}
            >
              <item.icon className={`md:mr-3 h-5 w-5 ${isActive ? "text-[#005C97]" : "text-white"}`} />

              <span className={`${isActive ? "text-[#005C97]" : ""} md:inline hidden`}>{item.name}</span>
              {item.badge && !isMobile && (
                <span className="rounded-full bg-neon-purple/80 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white md:ml-auto ml-0 md:inline-block inline-block md:static absolute top-1 right-1 md:text-xs text-[0.6rem]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 