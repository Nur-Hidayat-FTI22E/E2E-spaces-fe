import type { Metadata } from "next";
import { DocsShell } from "@/components/docs/docs-shell";

export const metadata: Metadata = {
  title: "Dokumentasi — KotaCloud Spaces",
  description:
    "Dokumentasi resmi KotaCloud Spaces: deploy aplikasi dari Git atau Docker image, database terkelola, custom domain, billing, dan API platform.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
