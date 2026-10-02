import { cn } from "@/lib/utils";

interface CopilotoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  clinicName?: string;
  badge?: string;
  className?: string;
  asLink?: boolean;
}

export function CopilotoIcon({ size = "md", className }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizeMap = {
    sm: "size-7 rounded-lg",
    md: "size-9 rounded-xl",
    lg: "size-11 rounded-2xl",
    xl: "size-14 rounded-2xl",
  };

  const svgSizeMap = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
    xl: "size-8",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-gradient-to-br from-sky-500 via-primary to-blue-700 text-white shadow-md shadow-primary/20",
        sizeMap[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(svgSizeMap[size])}
      >
        {/* Cruz Médica Sutil de Fundo */}
        <path
          d="M10 4C10 3.44772 10.4477 3 11 3H13C13.5523 3 14 3.44772 14 4V9H19C19.5523 9 20 9.44772 20 10V12C20 12.5523 19.5523 13 19 13H14V18C14 18.5523 13.5523 19 13 19H11C10.4477 19 10 18.5523 10 18V13H5C4.44772 13 4 12.5523 4 12V10C4 9.44772 4.44772 9 5 9H10V4Z"
          fill="currentColor"
          fillOpacity="0.22"
        />
        {/* Pulso Eletrocardiograma / IA */}
        <path
          d="M3 12H6.5L8.5 7.5L11.5 16.5L14.5 9L16.5 13.5L18 12H21"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function CopilotoLogo({
  size = "md",
  showText = true,
  clinicName,
  badge,
  className,
}: CopilotoLogoProps) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <CopilotoIcon size={size} />

      {showText && (
        <div className="leading-tight truncate min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-bold tracking-tight text-foreground truncate",
                size === "sm" && "text-sm",
                size === "md" && "text-base",
                size === "lg" && "text-lg",
                size === "xl" && "text-2xl",
              )}
            >
              Copiloto <span className="text-primary font-extrabold">Med</span>
            </span>

            {badge && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase text-primary">
                {badge}
              </span>
            )}
          </div>

          {clinicName ? (
            <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">
              {clinicName}
            </p>
          ) : (
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground/80 font-medium">
              Triagem Médica Inteligente
            </p>
          )}
        </div>
      )}
    </div>
  );
}
