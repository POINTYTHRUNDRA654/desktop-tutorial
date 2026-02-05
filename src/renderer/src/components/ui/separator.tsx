import * as React from "react"

export const Separator = ({ className, orientation = "horizontal", decorative = true, ...props }: any) => (
  <div
    role={decorative ? undefined : "none"}
    className={`shrink-0 bg-border ${orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"} ${className}`}
    {...props}
  />
)
