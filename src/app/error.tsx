'use client';

import { OErrorBoundaryPage } from '@helios/oui/pages';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <OErrorBoundaryPage error={error} onReset={reset} />;
}
