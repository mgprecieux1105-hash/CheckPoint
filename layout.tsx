import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const points = [
  "Planifiez vos journées et notez ce que vous accomplissez réellement.",
  "Gardez un historique complet, réussites comme tâches manquées.",
  "Suivez vos objectifs hebdomadaires, mensuels et annuels.",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CheckPoint</p>
      </div>
      <div className="relative hidden overflow-hidden bg-[#0f1a33] lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute -right-32 -top-32 size-[480px] rounded-full bg-[#3978F6]/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-[#25C8C4]/20 blur-3xl" />
        <div className="relative max-w-md text-white">
          <p className="text-sm font-medium text-[#8db5fb]">CheckPoint</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            Vos progrès, mesurés.
            <br />
            Vos accomplissements, mémorisés.
          </h2>
          <ul className="mt-10 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#25C8C4]" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
