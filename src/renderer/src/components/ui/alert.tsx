import * as React from "react"

export const Alert = ({ className, variant, ...props }: any) => (
  <div role="alert" className={`relative w-full rounded-lg border p-4 ${className}`} {...props} />
)
export const AlertTitle = ({ className, ...props }: any) => (
  <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`} {...props} />
)
export const AlertDescription = ({ className, ...props }: any) => (
  <div className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
)
