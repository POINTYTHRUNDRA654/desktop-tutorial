import * as React from "react"

export const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }: any, ref: any) => {
  const Comp = asChild ? "span" : "button"
  return (
    <Comp
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"
