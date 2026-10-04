import { CircleAlert, Clock, House } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";

import { signInWithGoogle } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

// Auth.js reports why a sign-in failed through ?error=. Unknown codes get the generic message,
// and the denial never says which account WOULD be accepted.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Esta conta Google não tem acesso ao ImobOS. Fale com o administrador.",
};
const GENERIC_ERROR = "Não foi possível entrar agora. Tente de novo em instantes.";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/today");

  const { error, status } = await searchParams;
  const code = typeof error === "string" ? error : undefined;
  const message = code ? (ERROR_MESSAGES[code] ?? GENERIC_ERROR) : undefined;
  const pending = status === "pending";

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <House aria-hidden className="size-6" />
          </div>
          <CardTitle className="text-2xl">ImobOS</CardTitle>
          <CardDescription>Seus clientes e retornos do dia, num lugar só.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pending && (
            <Alert role="status">
              <Clock aria-hidden />
              <AlertDescription>
                Pedido de acesso enviado. Assim que o administrador aprovar, é só entrar de novo com
                a mesma conta Google.
              </AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form action={signInWithGoogle}>
            <Button type="submit" size="lg" className="w-full">
              Continuar com Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
