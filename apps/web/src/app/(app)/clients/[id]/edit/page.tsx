import { notFound } from "next/navigation";

import { ClientForm } from "@/components/crm/client-form";
import { getClient } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  const client = UUID.test(id) ? await getClient(id) : null;
  if (!client) notFound();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">{client.name}</h1>
      <ClientForm client={client} />
    </div>
  );
}
