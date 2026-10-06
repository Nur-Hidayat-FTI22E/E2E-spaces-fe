"use client";

import React, { useState, useRef, useEffect } from "react";
import { Domain, DomainType, DNSRecord, DNSConfig, DNSVerification } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { createProjectDomainApi, updateDomainApi, deleteDomainApi, verifyDomainDnsApi } from "@/lib/api/projects";
import { listProjectServicesApi } from "@/lib/api/services";
import { Service } from "@/types/service";
import { useToast } from "@/lib/toast/toast-context";
import {
  Globe,
  Search,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

interface DomainRedirectComboboxProps {
  value: string;
  onChange: (value: string) => void;
  availableDomains: string[];
  placeholder?: string;
  className?: string;
}

function DomainRedirectCombobox({
  value,
  onChange,
  availableDomains,
  placeholder = "Target domain (e.g. example.com)",
  className = "",
}: DomainRedirectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = availableDomains.filter((d) =>
    d.toLowerCase().includes((value || "").toLowerCase().trim())
  );
  const displayList = filtered.length > 0 ? filtered : availableDomains;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (availableDomains.length > 0) setIsOpen(true);
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-700 min-w-[200px] sm:min-w-[240px] pr-7"
        />
        {availableDomains.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-1 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer transition-colors"
            title="Choose from service domains"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
          </button>
        )}
      </div>

      {isOpen && availableDomains.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[240px] max-w-[320px] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-zinc-400 border-b border-zinc-850 flex items-center justify-between">
            <span>Service Domains</span>
            <span className="text-[9px] text-zinc-400 lowercase">or type custom</span>
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {displayList.map((d) => {
              const isSelected = value.trim().toLowerCase() === d.toLowerCase();
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(d);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer ${
                    isSelected ? "text-cyan-400 bg-cyan-950/30 font-medium" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{d}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const CNAME_TARGET_FALLBACK = "cname.spaces.kotacloud.com";

// Status verifikasi yang jujur berdasarkan data backend:
// - verified  : lookup berhasil mengarah ke platform
// - pending   : sudah dicek (ada checked_at) tapi belum mengarah → tunggu propagasi / auto-verify
// - unverified: belum pernah dicek → setup masih berjalan
type VerifyState = "unverified" | "pending" | "verified";

function getVerifyState(cfg?: DNSConfig | null): VerifyState {
  if (cfg?.verified) return "verified";
  if (cfg?.checked_at) return "pending";
  return "unverified";
}

const VERIFY_META: Record<
  VerifyState,
  { label: string; cls: string; iconCls: string; icon: React.ReactNode }
> = {
  verified: {
    label: "Valid Configuration",
    cls: "text-emerald-300 bg-emerald-950/60 border-emerald-800/60",
    iconCls: "text-emerald-400",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  pending: {
    label: "Pending Verification",
    cls: "text-amber-300 bg-amber-950/60 border-amber-800/60",
    iconCls: "text-amber-400",
    icon: <Clock className="w-4 h-4" />,
  },
  unverified: {
    label: "Pending Setup",
    cls: "text-zinc-300 bg-zinc-900 border-zinc-700",
    iconCls: "text-zinc-500",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

function formatCheckedAt(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

interface DnsRecordsTableProps {
  domain: string;
  records: DNSRecord[];
  recommended?: string;
  verified?: boolean;
  checkedAt?: string;
  verification?: DNSVerification | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

// Tabel instruksi DNS tergenerate dari backend (Domain.dns_config). Bila
// backend belum menyertakan dns_config, dipakai fallback CNAME lokal.
function DnsRecordsTable({
  domain,
  records,
  recommended,
  verified = false,
  checkedAt,
  verification,
  copiedKey,
  onCopy,
}: DnsRecordsTableProps) {
  return (
    <>
      <p className="text-xs text-zinc-400">
        Tambahkan record berikut di DNS provider Anda (mis. <strong>Cloudflare</strong>,{" "}
        <strong>Namecheap</strong>, <strong>GoDaddy</strong>) untuk menghubungkan{" "}
        <span className="font-mono text-zinc-200">{domain}</span> ke KotaCloud Spaces.
        {recommended === "ALIAS" && (
          <> Domain apex (root) tidak mendukung CNAME — gunakan ALIAS/ANAME atau CNAME flattening.</>
        )}
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950">
        <table className="w-full text-xs text-left">
          <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
            <tr>
              <th className="py-2 px-3 font-medium">Type</th>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Value</th>
              <th className="py-2 px-3 font-medium">TTL</th>
              <th className="py-2 px-3 font-medium">Proxy</th>
            </tr>
          </thead>
          <tbody className="font-mono text-zinc-200 divide-y divide-zinc-850">
            {records.map((r, i) => {
              const key = `${domain}-dns-${i}`;
              return (
                <tr key={key}>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{r.type}</td>
                  <td className="py-2.5 px-3">
                    <div className="inline-flex items-center gap-1.5">
                      <span>{r.name}</span>
                      <button
                        type="button"
                        onClick={() => onCopy(r.name, `${key}-name`)}
                        className="text-zinc-500 hover:text-white"
                        title="Copy Name"
                      >
                        {copiedKey === `${key}-name` ? (
                          <Check className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-zinc-300">{r.value}</span>
                      <button
                        type="button"
                        onClick={() => onCopy(r.value, `${key}-value`)}
                        className="text-zinc-500 hover:text-white"
                        title="Copy Value"
                      >
                        {copiedKey === `${key}-value` ? (
                          <Check className="w-3 h-3 text-cyan-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500">{r.ttl}</td>
                  <td className="py-2.5 px-3 text-zinc-500">
                    {r.proxy_on ? (
                      <span className="text-emerald-400">Proxied (required)</span>
                    ) : (
                      r.proxy
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {records
        .filter((r) => r.note)
        .map((r, i) => (
          <p key={i} className="text-[11px] text-zinc-500">
            ℹ️ {r.note}
          </p>
        ))}

      {verification?.note && (
        <p className="text-[11px] text-zinc-400 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>{verification.note}</span>
        </p>
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
        <Clock className="w-3 h-3 shrink-0" />
        {verified
          ? `Terverifikasi${checkedAt ? ` (${formatCheckedAt(checkedAt)})` : ""} — domain terhubung ke KotaCloud Spaces.`
          : "Perubahan DNS butuh waktu propagasi — pemeriksaan otomatis berjalan berkala, atau klik Refresh untuk cek sekarang."}
      </p>
    </>
  );
}

interface DomainManagerProps {
  projectId: string;
  projectName?: string;
  serviceId?: string;
  serviceName?: string;
  defaultDomain?: string;
  domains: Domain[];
  onDomainsChange?: () => void;
  onUpdateSubdomain?: (newSubdomain: string) => Promise<void>;
  className?: string;
  /** When true the domain is locked to the KotaCloud-assigned address and cannot be edited (e.g. database services). */
  readOnly?: boolean;
}

export function DomainManager({
  projectId,
  projectName = "app",
  serviceId,
  serviceName,
  defaultDomain: propDefaultDomain,
  domains,
  onDomainsChange,
  onUpdateSubdomain,
  className = "",
  readOnly = false,
}: DomainManagerProps) {
  const toast = useToast();

  const defaultDomain =
    propDefaultDomain ||
    `${projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-spaces.kotacloud.com`;

  const displayDomains = serviceId
    ? domains.filter((d) => !d.service_id || d.service_id === serviceId)
    : domains;

  const allServiceDomains = Array.from(
    new Set([defaultDomain, ...displayDomains.map((d) => d.domain)].filter(Boolean))
  );

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Add Domain form state
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newIsRedirect, setNewIsRedirect] = useState(false);
  const [newRedirectStatus, setNewRedirectStatus] = useState("307");
  const [newRedirectTarget, setNewRedirectTarget] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Edit Domain state (Vercel-style expanded form)
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editDomainValue, setEditDomainValue] = useState("");
  const [editIsRedirect, setEditIsRedirect] = useState(false);
  const [editRedirectStatus, setEditRedirectStatus] = useState("307");
  const [editRedirectTarget, setEditRedirectTarget] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // Reassign: service tujuan domain saat edit ("" = tanpa service / detached)
  const [editTargetServiceId, setEditTargetServiceId] = useState("");
  // Daftar service project untuk dropdown Target Service (lazy fetch saat Edit dibuka)
  const [projectServices, setProjectServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Default Subdomain Edit state (supports system subdomain OR custom/existing domain)
  const [isEditingDefaultSubdomain, setIsEditingDefaultSubdomain] = useState(false);
  const [defaultDomainMode, setDefaultDomainMode] = useState<"subdomain" | "custom">("subdomain");
  const [editDefaultSubdomainValue, setEditDefaultSubdomainValue] = useState("");
  const [editDefaultCustomValue, setEditDefaultCustomValue] = useState("");
  const [defaultIsRedirect, setDefaultIsRedirect] = useState(false);
  const [defaultRedirectStatus, setDefaultRedirectStatus] = useState("307");
  const [defaultRedirectTarget, setDefaultRedirectTarget] = useState("");
  const [isSavingDefaultSubdomain, setIsSavingDefaultSubdomain] = useState(false);
  const [isDefaultDnsOpen, setIsDefaultDnsOpen] = useState(false);

  // DNS configuration toggle per domain
  const [openDnsDomainId, setOpenDnsDomainId] = useState<string | null>(null);
  const [refreshingDomainId, setRefreshingDomainId] = useState<string | null>(null);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-expand panel DNS untuk domain yang baru dibuat begitu datanya masuk
  // dari refetch (dipicu onDomainsChange setelah create sukses).
  const [pendingDnsExpand, setPendingDnsExpand] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingDnsExpand) return;
    const created = domains.find((d) => d.domain === pendingDnsExpand);
    if (created) {
      setOpenDnsDomainId(created.id);
      setPendingDnsExpand(null);
    }
  }, [domains, pendingDnsExpand]);

  // Deletion state
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Opsi Target Service untuk reassign: semua service non-DATABASE dalam project.
  // Bila daftar belum terfetch (atau fetch gagal), service saat ini tetap jadi opsi.
  const assignableServices: Service[] = (() => {
    const list = projectServices.filter((s) => s.type !== "DATABASE");
    if (serviceId && !list.some((s) => s.id === serviceId)) {
      list.unshift({ id: serviceId, name: serviceName || "Current service" } as Service);
    }
    return list;
  })();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text.trim());
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copied", { message: `"${text}" copied to clipboard.` });
  };

  // Verifikasi DNS nyata: backend melakukan lookup CNAME/A dan menyimpan hasilnya.
  const handleRefresh = async (dom: Domain) => {
    setRefreshingDomainId(dom.id);
    try {
      const updated = await verifyDomainDnsApi(dom.id);
      onDomainsChange?.();
      if (updated.dns_config?.verified) {
        toast.success("Domain Terverifikasi", {
          message: `DNS untuk ${dom.domain} sudah mengarah ke KotaCloud Spaces.`,
        });
      } else {
        toast.warning("Belum Terverifikasi", {
          message: `${dom.domain} belum mengarah ke record yang diharapkan. Periksa konfigurasi DNS dan tunggu propagasi.`,
        });
      }
    } catch (err: unknown) {
      toast.error("Verifikasi Gagal", {
        message: err instanceof Error ? err.message : "Gagal memverifikasi DNS.",
      });
    } finally {
      setRefreshingDomainId(null);
    }
  };

  // Add new domain
  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    let clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!clean) {
      toast.error("Error", { message: "Please enter a valid domain." });
      return;
    }

    setIsSubmittingNew(true);
    try {
      const redirectTarget = newIsRedirect && newRedirectTarget.trim() ? newRedirectTarget.trim() : undefined;
      const redirectStatus = newIsRedirect && newRedirectTarget.trim() ? parseInt(newRedirectStatus, 10) : undefined;

      await createProjectDomainApi(projectId, {
        domain: clean,
        type: "CUSTOM",
        service_id: serviceId,
        redirect_to: redirectTarget,
        redirect_code: redirectStatus,
      });

      toast.success("Domain Added", {
        message: `${clean} ditambahkan. Atur record DNS sesuai instruksi yang muncul — status diverifikasi otomatis begitu propagasi selesai.`,
      });
      setNewDomainInput("");
      setNewRedirectTarget("");
      setNewIsRedirect(false);
      setIsAddingDomain(false);
      setPendingDnsExpand(clean);
      onDomainsChange?.();
    } catch (err: unknown) {
      toast.error("Failed to add domain", {
        message: err instanceof Error ? err.message : "Error creating domain.",
      });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Lazy fetch daftar service project untuk dropdown Target Service.
  const ensureServicesLoaded = async () => {
    if (projectServices.length > 0 || isLoadingServices) return;
    setIsLoadingServices(true);
    try {
      const res = await listProjectServicesApi(projectId);
      setProjectServices(res.services || []);
    } catch {
      // Dropdown tetap berisi service saat ini bila fetch gagal.
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Save edit for custom domain (rename, redirect, dan/atau reassign service)
  const handleSaveEdit = async (targetDomain: Domain) => {
    let clean = editDomainValue.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!clean) {
      toast.error("Error", { message: "Domain name cannot be empty." });
      return;
    }

    setIsSavingEdit(true);
    try {
      const redirectTarget = editIsRedirect && editRedirectTarget.trim() ? editRedirectTarget.trim() : "";
      const redirectStatus = editIsRedirect && editRedirectTarget.trim() ? parseInt(editRedirectStatus, 10) : undefined;

      // service_id: undefined = tidak berubah, "" = detach, uuid = pindah ke service lain.
      const oldServiceId = targetDomain.service_id || "";
      const serviceIdPayload = editTargetServiceId !== oldServiceId ? editTargetServiceId : undefined;

      await updateDomainApi(targetDomain.id, {
        domain: clean,
        redirect_to: redirectTarget,
        redirect_code: redirectStatus,
        service_id: serviceIdPayload,
      });

      const movedAway =
        serviceIdPayload !== undefined && Boolean(serviceId) && serviceIdPayload !== serviceId;
      toast.success("Domain Saved", {
        message: movedAway
          ? `${clean} dialihkan ke service lain — domain tidak lagi tercantum di service ini.`
          : `Updated configuration for ${clean}.`,
      });
      setEditingDomainId(null);
      onDomainsChange?.();
    } catch (err: unknown) {
      toast.error("Failed to save domain", {
        message: err instanceof Error ? err.message : "Error saving domain.",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Save edit for default subdomain / custom primary domain
  const handleSaveDefaultSubdomain = async () => {
    let clean = "";
    if (defaultDomainMode === "subdomain") {
      clean = editDefaultSubdomainValue
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!clean) {
        toast.error("Error", { message: "Subdomain prefix cannot be empty." });
        return;
      }
    } else {
      clean = editDefaultCustomValue
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .replace(/[^a-z0-9.-]/g, "")
        .replace(/^\.+|\.+$/g, "")
        .replace(/^-+|-+$/g, "");
      if (!clean) {
        toast.error("Error", { message: "Custom domain cannot be empty." });
        return;
      }
      if (!clean.includes(".")) {
        toast.error("Invalid Domain", {
          message: "Please enter a valid domain (e.g. yourdomain.com or app.yourdomain.com).",
        });
        return;
      }
    }

    setIsSavingDefaultSubdomain(true);
    try {
      if (defaultDomainMode === "custom") {
        // Do NOT add a new domain. If this domain already existed as an extra custom domain item, remove it so it's not duplicated.
        const existing = domains.find((d) => d.domain.toLowerCase() === clean);
        if (existing) {
          try {
            await deleteDomainApi(existing.id);
          } catch {
            // Ignore error
          }
        }
      }

      if (onUpdateSubdomain) {
        await onUpdateSubdomain(clean);
      }
      toast.success("Default Domain Updated", {
        message: defaultDomainMode === "subdomain"
          ? `Default domain is now ${clean}-spaces.kotacloud.com`
          : `Default domain is now ${clean}`,
      });
      setIsEditingDefaultSubdomain(false);
      onDomainsChange?.();
    } catch (err: unknown) {
      toast.error("Failed to update domain", {
        message: err instanceof Error ? err.message : "Error updating default domain.",
      });
    } finally {
      setIsSavingDefaultSubdomain(false);
    }
  };

  // Delete custom domain
  const handleDeleteDomain = async () => {
    if (!deletingDomain) return;
    const dName = deletingDomain.domain;
    setIsDeleting(true);
    try {
      await deleteDomainApi(deletingDomain.id);
      toast.success("Domain Removed", {
        message: `${dName} has been removed from this service.`,
      });
      setDeletingDomain(null);
      setEditingDomainId(null);
      onDomainsChange?.();
    } catch (err: unknown) {
      toast.error("Failed to remove domain", {
        message: err instanceof Error ? err.message : "Error deleting domain.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isDefaultCustom =
    defaultDomain.includes(".") && !defaultDomain.endsWith("-spaces.kotacloud.com");

  const defaultSubdomainPrefix = isDefaultCustom
    ? (serviceName || projectName || "service")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "")
    : defaultDomain.replace(/-spaces\.kotacloud\.com$/, "");

  // Filtered list - exclude the default domain if it was also in custom domains list
  const filteredCustomDomains = displayDomains.filter(
    (d) =>
      d.domain.toLowerCase().includes(searchQuery.toLowerCase()) &&
      d.domain.toLowerCase() !== defaultDomain.toLowerCase()
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Search & Add Domain Toolbar (Vercel Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search any domain"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-700 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isAddingDomain && !readOnly && (
            <button
              type="button"
              onClick={() => {
                setIsAddingDomain(true);
                setNewDomainInput("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Domain</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Domain Expandable Form (Vercel Style Image 4) */}
      {isAddingDomain && (
        <form
          onSubmit={handleCreateDomain}
          className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/95 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
            <span className="text-xs font-semibold text-white">Add Custom Domain</span>
            <button
              type="button"
              onClick={() => setIsAddingDomain(false)}
              className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Domain
            </label>
            <input
              type="text"
              placeholder="e.g. example.com or app.example.com"
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-zinc-700 outline-none"
              autoFocus
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Gunakan subdomain (mis. <span className="font-mono">app.example.com</span>) untuk CNAME, atau apex domain
              (mis. <span className="font-mono">example.com</span>) via A record / ALIAS. Instruksi DNS digenerate
              otomatis setelah domain ditambahkan.
            </p>
          </div>

          {/* Redirect to Another Domain (Optional checkbox) */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsRedirect}
                  onChange={(e) => setNewIsRedirect(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-400 accent-cyan-400 cursor-pointer"
                />
                <span>Redirect to Another Domain</span>
              </label>

              {newIsRedirect && (
                <div className="flex items-center gap-2">
                  <select
                    value={newRedirectStatus}
                    onChange={(e) => setNewRedirectStatus(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    <option value="307">307 Temporary Redirect</option>
                    <option value="308">308 Permanent Redirect</option>
                    <option value="301">301 Moved Permanently</option>
                    <option value="302">302 Found</option>
                  </select>

                  <DomainRedirectCombobox
                    value={newRedirectTarget}
                    onChange={setNewRedirectTarget}
                    availableDomains={allServiceDomains}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={() => setIsAddingDomain(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingNew || !newDomainInput.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingNew ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* DOMAIN LIST (VERCEL STYLE) */}
      <div className="space-y-3">
        {/* ITEM 1: DEFAULT SERVICE DOMAIN */}
        {(() => {
          const defaultParts = defaultDomain.split(".");
          // Status primary domain mengikuti dns_config dari item custom domain yang
          // cocok (bila default memang custom); subdomain bawaan selalu verified.
          const defaultDomainRecord = domains.find(
            (d) => d.domain.toLowerCase() === defaultDomain.toLowerCase()
          );
          const defaultCfg = isDefaultCustom ? defaultDomainRecord?.dns_config : undefined;
          const defaultMeta = VERIFY_META[isDefaultCustom ? getVerifyState(defaultCfg) : "verified"];

          return (
            <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/90 overflow-hidden transition-all">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${defaultMeta.iconCls}`}>
                    {defaultMeta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`https://${defaultDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-white font-mono hover:text-cyan-400 transition-colors truncate flex items-center gap-1.5"
                      >
                        <span>{defaultDomain}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${defaultMeta.cls}`}>
                        {defaultMeta.label}
                      </span>
                      {isDefaultCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                          Primary Custom
                        </span>
                      )}
                      {isDefaultCustom && (
                        <button
                          type="button"
                          onClick={() => setIsDefaultDnsOpen(!isDefaultDnsOpen)}
                          className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{isDefaultDnsOpen ? "Hide DNS configuration" : "View DNS configuration"}</span>
                          {isDefaultDnsOpen ? (
                            <ChevronUp className="w-3 h-3 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono mt-0.5">
                      <GitBranch className="w-3 h-3 text-zinc-600" />
                      <span>Production ({isDefaultCustom ? "Custom Primary Domain" : "Default Subdomain"})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {readOnly && (
                    <span
                      title="Database domains are managed by KotaCloud and cannot be changed."
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/50 select-none"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      KotaCloud Managed
                    </span>
                  )}
                  {defaultDomainRecord && (
                    <button
                      type="button"
                      onClick={() => handleRefresh(defaultDomainRecord)}
                      disabled={refreshingDomainId === defaultDomainRecord.id}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingDomainId === defaultDomainRecord.id ? "animate-spin text-cyan-400" : ""}`} />
                      <span>{refreshingDomainId === defaultDomainRecord.id ? "Checking..." : "Refresh"}</span>
                    </button>
                  )}
                  <a
                    href={`https://${defaultDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                  >
                    Visit
                  </a>
                  {onUpdateSubdomain && !readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isDefaultCustom) {
                          setDefaultDomainMode("custom");
                          setEditDefaultCustomValue(defaultDomain);
                          setEditDefaultSubdomainValue(defaultSubdomainPrefix);
                        } else {
                          setDefaultDomainMode("subdomain");
                          setEditDefaultSubdomainValue(defaultSubdomainPrefix);
                          setEditDefaultCustomValue("");
                        }
                        setIsEditingDefaultSubdomain(!isEditingDefaultSubdomain);
                      }}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                    >
                      {isEditingDefaultSubdomain ? "Close" : "Edit"}
                    </button>
                  )}
                </div>
              </div>

              {/* COLLAPSIBLE DNS CONFIGURATION FOR PRIMARY CUSTOM DOMAIN */}
              {isDefaultDnsOpen && isDefaultCustom && (
                <div className="p-4 border-t border-zinc-850 bg-black/40 space-y-3">
                  <div className="flex items-center gap-4 border-b border-zinc-800 text-xs pb-2">
                    <span className="font-semibold text-white border-b-2 border-white pb-2 -mb-2">
                      DNS Records
                    </span>
                  </div>

                  <DnsRecordsTable
                    domain={defaultDomain}
                    records={(() => {
                      const cfg = defaultCfg;
                      if (cfg?.records?.length) return cfg.records;
                      // Fallback lokal bila dns_config belum tersedia dari backend.
                      return defaultParts.length > 2
                        ? [{ type: "CNAME", name: defaultParts[0], value: CNAME_TARGET_FALLBACK, ttl: "3600", proxy: "DNS only" }]
                        : [{ type: "ALIAS", name: "@", value: CNAME_TARGET_FALLBACK, ttl: "3600", proxy: "DNS only", note: "Apex (root) domains cannot use CNAME records — gunakan ALIAS/ANAME atau CNAME flattening." }];
                    })()}
                    recommended={defaultParts.length > 2 ? "CNAME" : "ALIAS"}
                    verified={defaultCfg?.verified}
                    checkedAt={defaultCfg?.checked_at}
                    verification={defaultCfg?.verification}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                </div>
              )}

              {/* Expanded Edit Form for Default Domain (KotaCloud Subdomain OR Existing/Custom Domain) */}
              {isEditingDefaultSubdomain && onUpdateSubdomain && (
                <div className="p-4 border-t border-zinc-850 bg-zinc-950/60 space-y-4">
                  {/* Mode switch */}
                  <div className="flex items-center gap-2 pb-1 border-b border-zinc-850/80">
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultDomainMode("subdomain");
                        if (!editDefaultSubdomainValue) {
                          setEditDefaultSubdomainValue(defaultSubdomainPrefix);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        defaultDomainMode === "subdomain"
                          ? "bg-zinc-850 text-white border border-zinc-700 font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      KotaCloud Subdomain
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultDomainMode("custom");
                        if (!editDefaultCustomValue) {
                          setEditDefaultCustomValue(isDefaultCustom ? defaultDomain : "");
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        defaultDomainMode === "custom"
                          ? "bg-zinc-850 text-white border border-zinc-700 font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Existing / Custom Domain
                    </button>
                  </div>

                  {defaultDomainMode === "subdomain" ? (
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Subdomain Prefix
                      </label>
                      <div className="flex items-center rounded-lg bg-black border border-zinc-800 px-3 py-2 focus-within:border-zinc-700">
                        <span className="text-xs font-mono text-zinc-500 select-none">https://</span>
                        <input
                          type="text"
                          value={editDefaultSubdomainValue}
                          onChange={(e) =>
                            setEditDefaultSubdomainValue(
                              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                            )
                          }
                          className="flex-1 bg-transparent px-1.5 text-xs font-mono text-white outline-none"
                          placeholder="my-service"
                          autoFocus
                        />
                        <span className="text-xs font-mono text-zinc-500 select-none">
                          -spaces.kotacloud.com
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Custom / Existing Domain
                        </label>
                        <input
                          type="text"
                          value={editDefaultCustomValue}
                          onChange={(e) => setEditDefaultCustomValue(e.target.value.toLowerCase())}
                          placeholder="e.g. example.com or app.example.com"
                          className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-zinc-700 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Redirect to Another Domain (Optional checkbox) */}
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={defaultIsRedirect}
                          onChange={(e) => setDefaultIsRedirect(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-400 accent-cyan-400 cursor-pointer"
                        />
                        <span>Redirect to Another Domain</span>
                      </label>

                      {defaultIsRedirect && (
                        <div className="flex items-center gap-2">
                          <select
                            value={defaultRedirectStatus}
                            onChange={(e) => setDefaultRedirectStatus(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                          >
                            <option value="307">307 Temporary Redirect</option>
                            <option value="308">308 Permanent Redirect</option>
                            <option value="301">301 Moved Permanently</option>
                            <option value="302">302 Found</option>
                          </select>

                          <DomainRedirectCombobox
                            value={defaultRedirectTarget}
                            onChange={setDefaultRedirectTarget}
                            availableDomains={displayDomains.map((d) => d.domain).filter(Boolean)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom action bar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setIsEditingDefaultSubdomain(false)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDefaultSubdomain}
                      disabled={
                        isSavingDefaultSubdomain ||
                        (defaultDomainMode === "subdomain"
                          ? !editDefaultSubdomainValue.trim()
                          : !editDefaultCustomValue.trim())
                      }
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingDefaultSubdomain ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* CUSTOM DOMAIN ITEMS */}
        {filteredCustomDomains.map((dom) => {
          const isEditOpen = editingDomainId === dom.id;
          const isDnsOpen = openDnsDomainId === dom.id;
          const isRefreshing = refreshingDomainId === dom.id;

          // CNAME host: semua label kecuali domain.tld — a.b.example.com → "a.b";
          // example.com → "@" (apex). Fallback frontend; backend mengirim dns_config.
          const parts = dom.domain.split(".");
          const cnameHost = parts.length > 2 ? parts.slice(0, -2).join(".") : "@";

          return (
            <div
              key={dom.id}
              className="rounded-xl border border-zinc-800/90 bg-zinc-950/90 overflow-hidden transition-all"
            >
              {/* Card Header (Vercel Style Image 3) */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Status indicator */}
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {VERIFY_META[getVerifyState(dom.dns_config)].icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`https://${dom.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-white font-mono hover:text-cyan-400 transition-colors truncate flex items-center gap-1.5"
                      >
                        <span>{dom.domain}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>

                      {dom.redirect_to ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 flex items-center gap-1">
                          <ArrowRight className="w-2.5 h-2.5" />
                          <span>Redirects to {dom.redirect_to}</span>
                        </span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${VERIFY_META[getVerifyState(dom.dns_config)].cls}`}
                        >
                          {VERIFY_META[getVerifyState(dom.dns_config)].label}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setOpenDnsDomainId(isDnsOpen ? null : dom.id)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{isDnsOpen ? "Hide DNS configuration" : "View DNS configuration"}</span>
                        {isDnsOpen ? (
                          <ChevronUp className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono mt-0.5">
                      <GitBranch className="w-3 h-3 text-zinc-600" />
                      <span>Production</span>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons: Refresh and Edit (Image 3) */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRefresh(dom)}
                    disabled={isRefreshing}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
                    <span>{isRefreshing ? "Checking..." : "Refresh"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditOpen) {
                        setEditingDomainId(null);
                      } else {
                        setEditingDomainId(dom.id);
                        setEditDomainValue(dom.domain);
                        setEditIsRedirect(!!dom.redirect_to);
                        setEditRedirectTarget(dom.redirect_to || "");
                        setEditRedirectStatus(dom.redirect_code ? String(dom.redirect_code) : "307");
                        setEditTargetServiceId(dom.service_id || "");
                        void ensureServicesLoaded();
                      }
                    }}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
                  >
                    {isEditOpen ? "Close" : "Edit"}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE 1: DNS CONFIGURATION TABLE (Vercel Style Image 3) */}
              {isDnsOpen && (
                <div className="p-4 border-t border-zinc-850 bg-black/40 space-y-3">
                  <div className="flex items-center gap-4 border-b border-zinc-800 text-xs pb-2">
                    <span className="font-semibold text-white border-b-2 border-white pb-2 -mb-2">
                      DNS Records
                    </span>
                  </div>

                  <DnsRecordsTable
                    domain={dom.domain}
                    records={
                      dom.dns_config?.records?.length
                        ? dom.dns_config.records
                        : [{ type: "CNAME", name: cnameHost, value: CNAME_TARGET_FALLBACK, ttl: "3600", proxy: "DNS only" }]
                    }
                    recommended={dom.dns_config?.recommended}
                    verified={dom.dns_config?.verified}
                    checkedAt={dom.dns_config?.checked_at}
                    verification={dom.dns_config?.verification}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                  />
                </div>
              )}

              {/* COLLAPSIBLE 2: EDIT DOMAIN FORM (Vercel Style Image 4) */}
              {isEditOpen && (
                <div className="p-4 border-t border-zinc-850 bg-zinc-950/60 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={editDomainValue}
                      onChange={(e) => setEditDomainValue(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:border-zinc-700 outline-none"
                    />
                  </div>

                  {/* Reassign: pindahkan domain ke service lain dalam project yang sama */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Target Service
                    </label>
                    <select
                      value={editTargetServiceId}
                      onChange={(e) => setEditTargetServiceId(e.target.value)}
                      disabled={isLoadingServices}
                      data-testid="target-service-select"
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-700 outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">No service (detached)</option>
                      {assignableServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.id === serviceId ? " (current)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Route this domain to another service in this project. Database services cannot be targeted.
                    </p>
                  </div>

                  {/* Redirect to Another Domain (Optional checkbox) */}
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editIsRedirect}
                          onChange={(e) => setEditIsRedirect(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-cyan-400 accent-cyan-400 cursor-pointer"
                        />
                        <span>Redirect to Another Domain</span>
                      </label>

                      {editIsRedirect && (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRedirectStatus}
                            onChange={(e) => setEditRedirectStatus(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                          >
                            <option value="307">307 Temporary Redirect</option>
                            <option value="308">308 Permanent Redirect</option>
                            <option value="301">301 Moved Permanently</option>
                            <option value="302">302 Found</option>
                          </select>

                          <DomainRedirectCombobox
                            value={editRedirectTarget}
                            onChange={setEditRedirectTarget}
                            availableDomains={allServiceDomains.filter((d) => d.toLowerCase() !== dom.domain.toLowerCase())}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action bar: Remove (Red button left) | Cancel & Save (Right) */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setDeletingDomain(dom)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingDomainId(null)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(dom)}
                        disabled={isSavingEdit || !editDomainValue.trim()}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingEdit ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleRefresh(dom)}
                      disabled={isRefreshing}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span>Check DNS status for {dom.domain}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCustomDomains.length === 0 && searchQuery && (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
            <p className="text-xs text-zinc-500">
              No domains found matching &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingDomain)}
        onClose={() => setDeletingDomain(null)}
        onConfirm={handleDeleteDomain}
        title="Remove Domain"
        description={`Are you sure you want to remove "${deletingDomain?.domain}"? Traffic to this domain will no longer be routed to this service.`}
        confirmText={isDeleting ? "Removing..." : "Remove Domain"}
        variant="danger"
      />
    </div>
  );
}
