import { Button } from "./Button";

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="sf-rise flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg">
        ◇
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {hint ? <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      {actionLabel && onAction ? (
        <Button className="mt-4" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="sf-rise flex flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-rose-800">Something went wrong</h3>
      <p className="mt-1 text-xs text-rose-600">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
