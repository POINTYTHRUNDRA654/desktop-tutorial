import * as React from "react"

export const ScrollArea = ({ className, children, ...props }: any) => (
  <div className={`relative overflow-hidden ${className}`} {...props}>
    <div className="h-full w-full overflow-auto rounded-[inherit]">
      {children}
    </div>
  </div>
)
export const ScrollBar = ({ className, orientation = "vertical", ...props }: any) => (
  <div className={`flex touch-none select-none transition-colors ${className}`} {...props} />
)
