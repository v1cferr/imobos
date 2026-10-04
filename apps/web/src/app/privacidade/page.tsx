import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade · ImobOS" };

// Public on purpose (Google requires it to publish the sign-in app): it is outside the proxy and
// the only page Caddy serves without basic auth. It must never read the session.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Política de privacidade</h1>
        <p className="text-muted-foreground">ImobOS · atualizada em 4 de outubro de 2026</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">O que é o ImobOS</h2>
        <p>
          O ImobOS é uma ferramenta de trabalho de uso restrito, feita para uma corretora de imóveis
          organizar o atendimento aos seus clientes. Só pessoas aprovadas pelo administrador
          conseguem usá-la.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Entrar com o Google</h2>
        <p>
          Quando você entra com a sua conta Google, o ImobOS recebe apenas o seu{" "}
          <strong>nome</strong>, o seu <strong>e-mail</strong>, a sua <strong>foto</strong> e um{" "}
          <strong>identificador da conta</strong>. Eles servem só para saber quem está entrando e se
          essa pessoa tem acesso.
        </p>
        <p>
          O login <strong>não dá acesso</strong> ao seu Gmail, à sua Agenda, ao seu Drive, aos seus
          contatos nem a nenhum outro dado da sua conta Google.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">O que guardamos e por quanto tempo</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Nome, e-mail e identificador da conta de quem pede acesso, enquanto o acesso existir.
          </li>
          <li>Pedidos de acesso recusados são apagados.</li>
          <li>A foto não é guardada no servidor; ela só aparece enquanto você está conectada.</li>
          <li>
            Um cookie de sessão, essencial para manter você conectada, que vence após 7 dias sem uso.
          </li>
        </ul>
        <p>
          Os dados ficam num servidor no Brasil e não são vendidos nem compartilhados com terceiros.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir para ver, corrigir ou apagar os seus dados a qualquer momento, escrevendo
          para <a className="underline" href="mailto:dev.victorferreira@gmail.com">dev.victorferreira@gmail.com</a>.
        </p>
      </section>

      <p>
        <Link className="underline" href="/login">
          Voltar para o ImobOS
        </Link>
      </p>
    </main>
  );
}
