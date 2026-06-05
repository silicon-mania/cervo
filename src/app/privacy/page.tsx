import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Cervo",
  description: "Privacy policy for Cervo and the Cervo Capture extension.",
};

function Section({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-svh bg-background px-6 py-10 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to app
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Cervo
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="space-y-3 border-b border-border pb-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Privacy Policy
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Privacy Policy</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              This policy explains how Cervo handles information when you use the web app and the
              Cervo Capture browser extension.
            </p>
          </div>

          <div className="mt-8 space-y-8">
            <Section title="What we collect">
              <p>
                We collect the information you choose to store in Cervo, including notes, boxes,
                tasks, daily notes, people records, inbox items, calendar items, and attachments.
              </p>
              <p>
                When you use Cervo Capture, we also collect the text and images you explicitly
                capture so we can append them to your daily note. The extension does not read
                browsing history or inspect page content automatically.
              </p>
              <p>
                We also collect account and workspace information needed to authenticate you and
                keep your data associated with the correct workspace.
              </p>
            </Section>

            <Section title="How we use information">
              <ul className="list-disc space-y-2 pl-5">
                <li>Authenticate you and manage your workspace access.</li>
                <li>Store, sync, search, and retrieve the content you save in Cervo.</li>
                <li>Append captures to the current daily note.</li>
                <li>Store uploaded files and attachments.</li>
                <li>Operate, secure, and improve the service.</li>
              </ul>
            </Section>

            <Section title="How we share information">
              <p>We do not sell personal data.</p>
              <p>
                We share data with service providers that help run Cervo, including authentication
                and hosting/storage providers such as Clerk and Supabase.
              </p>
              <p>
                We may also disclose information if required by law or if needed to protect the
                service, users, or our rights.
              </p>
            </Section>

            <Section title="How long we keep it">
              <p>
                We keep workspace content until it is deleted by you, your workspace, or an
                administrator with the ability to manage that content.
              </p>
              <p>
                Authentication records, logs, and operational data are retained as needed to run the
                service and maintain security.
              </p>
            </Section>

            <Section title="Your choices">
              <ul className="list-disc space-y-2 pl-5">
                <li>You can edit or delete notes, boxes, tasks, and attachments in the app.</li>
                <li>Workspace owners and admins can manage membership and access.</li>
                <li>
                  You can stop using the extension at any time by removing it from your browser.
                </li>
              </ul>
            </Section>

            <Section title="Security">
              <p>
                We use reasonable administrative, technical, and organizational safeguards to help
                protect your information. No system is perfectly secure, so we cannot guarantee
                absolute security.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                If you have privacy questions, contact the team that provided your Cervo deployment
                or the workspace owner who manages your account.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
