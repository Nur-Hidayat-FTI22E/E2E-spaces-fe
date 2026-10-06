import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-[#020203] text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-7 gap-8 mb-16">
          {/* Brand Col */}
          <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
            <Logo size="lg" />
            <p className="text-zinc-500 text-xs leading-relaxed max-w-sm">
              KotaCloud Spaces is the developer cloud platform for building, deploying,
              and scaling high-performance modern applications with dedicated container isolation.
            </p>
            <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-zinc-500">
              <span className="text-zinc-400">CLI:</span>
              <code className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-cyan-400">
                npm i -g kospaces
              </code>
            </div>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">Company</h4>
            <Link href="#" className="hover:text-zinc-200 transition-colors">About Us</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Careers</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Blog</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Changelog</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Press Kit</Link>
          </div>

          {/* Compare */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">Compare</h4>
            <Link href="#" className="hover:text-zinc-200 transition-colors">vs Vercel</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">vs Render</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">vs Railway</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">vs Fly.io</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Self-hosted</Link>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">Contact</h4>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Support</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Sales</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Community Discord</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Twitter / X</Link>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">Resources</h4>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Documentation</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">API Reference</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Guides</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Status</Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-200 tracking-wider uppercase">Legal</h4>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Security</Link>
            <Link href="#" className="hover:text-zinc-200 transition-colors">Compliance</Link>
          </div>
        </div>

        {/* Bottom Bar matching reference screenshot */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>All Systems Normal</span>
          </div>

          <div className="text-zinc-500 font-mono text-[11px]">
            &copy; {new Date().getFullYear()} KotaCloud. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
