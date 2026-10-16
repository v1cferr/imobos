import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/app/(app)/clients/actions";

/** The form's refusal, with a way out when the phone already belongs to someone. */
export function FormProblem({ state }: { state: FormState }) {
  if (!state.error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {state.error}{" "}
        {state.duplicateId && (
          <Link className="underline underline-offset-4" href={`/clients/${state.duplicateId}`}>
            Abrir esse cliente
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
