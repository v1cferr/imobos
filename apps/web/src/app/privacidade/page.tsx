import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade" };

const CONTACT = "dev.victorferreira@gmail.com";

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Public on purpose: Google and Meta require a reachable policy to publish the apps that use them.
// It is outside the proxy and must never read the session.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Política de privacidade</h1>
        <p className="text-muted-foreground">ImobOS · atualizada em 16 de outubro de 2026</p>
      </div>

      <Section title="O que é o ImobOS">
        <p>
          O ImobOS é uma ferramenta de trabalho de uso restrito, feita para uma corretora de imóveis
          organizar o atendimento aos seus clientes. Só pessoas aprovadas pelo administrador
          conseguem usá-la. A corretora é quem decide sobre os dados dos clientes dela; o ImobOS os
          guarda e processa por ela.
        </p>
      </Section>

      <Section title="Entrar com o Google">
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
      </Section>

      <Section title="Google Agenda (opcional)">
        <p>
          Se a corretora conectar a Google Agenda em Integrações, o ImobOS pode <strong>apenas ler</strong>{" "}
          os eventos da agenda, para mostrar as visitas e compromissos do dia. Ele não cria, altera
          nem apaga eventos. A autorização fica guardada criptografada e pode ser desfeita a qualquer
          momento em Integrações ou nas configurações da conta Google.
        </p>
      </Section>

      <Section title="Clientes da corretora">
        <p>
          A corretora registra no ImobOS os clientes que atende: nome, telefone, e-mail, o que cada
          um procura em um imóvel (por exemplo região, orçamento e número de quartos), as etapas do
          atendimento e um histórico com data e hora. Esses dados servem para ela retornar aos
          clientes e acompanhar cada negociação. Ficam guardados até a corretora apagar o cliente,
          o que remove também todo o histórico dele.
        </p>
      </Section>

      <Section title="WhatsApp">
        <p>
          Quando a corretora conecta o WhatsApp Business dela, as mensagens trocadas com os clientes
          passam pela <strong>API oficial do WhatsApp</strong>, da Meta, e ficam guardadas também na
          central de conversas do ImobOS, no nosso servidor, para que ela atenda e acompanhe os
          clientes num lugar só. A Meta transporta as mensagens segundo os termos do WhatsApp.
        </p>
        <p>
          Nenhuma mensagem é enviada em nome da corretora sem que ela aprove. Ela pode desconectar o
          WhatsApp a qualquer momento.
        </p>
      </Section>

      <Section title="O que guardamos e por quanto tempo">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Nome, e-mail e identificador da conta de quem pede acesso, enquanto o acesso existir.
          </li>
          <li>Pedidos de acesso recusados são apagados.</li>
          <li>A foto não é guardada no servidor; ela só aparece enquanto você está conectada.</li>
          <li>
            Um cookie de sessão, essencial para manter você conectada, que vence após 7 dias sem uso.
          </li>
          <li>Clientes, histórico e conversas, até a corretora apagá-los.</li>
        </ul>
        <p>
          Os dados ficam num servidor no Brasil. Uma cópia de segurança diária é{" "}
          <strong>criptografada antes de sair do servidor</strong> e guardada na Cloudflare; sem a
          chave, que fica só conosco, ela é ilegível. Cópias antigas são descartadas em até seis
          meses. Os dados não são vendidos nem compartilhados com terceiros além dos serviços citados
          aqui (Google, Meta e Cloudflare), cada um só para a sua função.
        </p>
      </Section>

      <Section title="Seus direitos e como apagar seus dados (LGPD)" id="exclusao">
        <p>
          Você pode pedir para ver, corrigir ou apagar os seus dados a qualquer momento, escrevendo
          para <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Se você é cliente
          da corretora, informe o telefone usado com ela: apagamos o seu cadastro, o histórico e as
          conversas guardadas no ImobOS em até 15 dias e confirmamos por e-mail.
        </p>
      </Section>

      <p>
        <Link className="underline" href="/login">
          Voltar para o ImobOS
        </Link>
      </p>
    </main>
  );
}
