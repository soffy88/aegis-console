/**
 * Auth layout — unauthenticated routes (login).
 * No AppFrame/sidebar — just a centered card layout.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      {children}
    </div>
  );
}
