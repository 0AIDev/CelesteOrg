import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: boolean;
}

// ElevenLabs-style surface: rounded-xl, hairline border, soft shadow.
export function Card({
  hover,
  padding = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("card", hover && "card-hover", padding && "p-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}