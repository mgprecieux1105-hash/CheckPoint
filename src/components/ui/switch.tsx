"use client";

import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-border-strong transition-colors data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
    </S.Root>
  );
}
