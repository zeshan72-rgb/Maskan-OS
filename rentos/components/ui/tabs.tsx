"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Ctx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<Ctx | null>(null);

function useTabs(component: string) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`${component} must be used inside <Tabs>`);
  return ctx;
}

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ defaultValue, value: valueProp, onValueChange, className, ...props }: TabsProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = valueProp ?? uncontrolled;
  const setValue = React.useCallback(
    (v: string) => {
      if (valueProp === undefined) setUncontrolled(v);
      onValueChange?.(v);
    },
    [valueProp, onValueChange]
  );
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("flex flex-col gap-4", className)} {...props} />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1",
        className
      )}
      {...props}
    />
  );
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function TabsTrigger({ value, className, ...props }: TriggerProps) {
  const ctx = useTabs("TabsTrigger");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900",
        className
      )}
      {...props}
    />
  );
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({ value, className, ...props }: ContentProps) {
  const ctx = useTabs("TabsContent");
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
