import type { ComponentProps } from "react";
import { cn } from "cn";

// Every clinic page shares this width, so content lines up from page to page.
export function PageContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:p-6",
        className,
      )}
      {...props}
    />
  );
}
