"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  [
    "gradient-button",
    "inline-flex items-center justify-center",
    "rounded-[11px] min-w-[132px] px-9 py-4",
    "text-base leading-[19px] font-normal text-white",
    "font-manrope",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "border border-transparent bg-transparent",
    "relative",
    "hover:translate-y-[-1px]",
    "transition-all duration-300",
    "cursor-pointer",
    "before:absolute before:inset-0 before:rounded-[11px] before:p-[1px] before:bg-gradient-to-r before:from-[#005C97] before:to-[#363795] before:z-[0]",
    "after:absolute after:inset-0 after:rounded-[11px] after:p-[1px] after:bg-gradient-to-r after:from-[#005C97] after:to-[#363795] after:blur-[5px] after:z-[-1] after:opacity-40",
  ],
  {
    variants: {
      variant: {
        default: "",
        variant: "before:bg-gradient-to-r before:from-[#363795] before:to-[#005C97] after:bg-gradient-to-r after:from-[#363795] after:to-[#005C97]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, className }))}
        ref={ref}
        style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
        {...props}
      />
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }