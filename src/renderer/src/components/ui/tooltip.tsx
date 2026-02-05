import * as React from "react"

export const TooltipProvider = ({ children }: any) => <>{children}</>
export const Tooltip = ({ children }: any) => <>{children}</>
export const TooltipTrigger = ({ asChild, children, ...props }: any) => {
  const Comp = asChild ? "span" : "button"
  return <Comp {...props}>{children}</Comp>
}
export const TooltipContent = ({ className, sideOffset = 4, ...props }: any) => (
  <div className={`z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 ${className}`} {...props} />
)
