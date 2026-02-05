import * as React from "react"

export const Progress = ({ className, value, ...props }: any) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-primary/20 ${className}`} {...props}>
    <div
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
)
