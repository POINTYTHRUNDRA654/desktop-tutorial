import * as React from "react";

type TabsContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue>({});

export const Tabs = ({ className, value, onValueChange, ...props }: any) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div className={className} {...props} />
  </TabsContext.Provider>
);

export const TabsList = ({ className, ...props }: any) => (
  <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`} {...props} />
);

export const TabsTrigger = ({ className, value, onClick, ...props }: any) => {
  const ctx = React.useContext(TabsContext);
  const isActive = value !== undefined && ctx.value === value;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className}`}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={(event) => {
        onClick?.(event);
        if (value !== undefined) {
          ctx.onValueChange?.(value);
        }
      }}
      {...props}
    />
  );
};

export const TabsContent = ({ className, value, ...props }: any) => {
  const ctx = React.useContext(TabsContext);
  const isActive = value === undefined || ctx.value === value;

  if (!isActive) return null;

  return (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} {...props} />
  );
};
