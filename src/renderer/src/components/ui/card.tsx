import * as React from "react"

export const Card = ({ className, ...props }: any) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`} {...props} />
)
export const CardHeader = ({ className, ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
)
export const CardTitle = ({ className, ...props }: any) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props} />
)
export const CardDescription = ({ className, ...props }: any) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
)
export const CardContent = ({ className, ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
)
export const CardFooter = ({ className, ...props }: any) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />
)
