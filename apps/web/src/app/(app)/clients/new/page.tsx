import { QuickAddForm } from "@/components/crm/quick-add-form";
import { requireUser } from "@/lib/auth/session";

export default async function NewClientPage({ searchParams }: PageProps<"/clients/new">) {
  await requireUser();
  const { pipeline, name, phone } = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 200) : undefined);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Novo cliente</h1>
        <p className="text-muted-foreground">O básico agora; o resto você completa depois.</p>
      </div>
      <QuickAddForm
        defaultPipeline={pipeline === "rental" ? "rental" : undefined}
        defaults={{ name: one(name), phone: one(phone) }}
      />
    </div>
  );
}
