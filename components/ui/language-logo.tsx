"use client";

import React from "react";

interface LanguageLogoProps {
  language?: string;
  className?: string;
}

// Devicon base URL — classic colored icons for databases & languages
const DEVICON = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";

// Simple Icons CDN — for brand logos not in devicon
// Format: https://cdn.simpleicons.org/{slug}/{hex-color}
const SI = (slug: string, color: string) =>
  `https://cdn.simpleicons.org/${slug}/${color}`;

interface IconEntry {
  src: string;
  label: string;
}

const ICON_MAP: Record<string, IconEntry> = {
  // ── Databases ─────────────────────────────────────────────────────────────
  mongodb:    { src: `${DEVICON}/mongodb/mongodb-original.svg`,         label: "MongoDB"    },
  mongo:      { src: `${DEVICON}/mongodb/mongodb-original.svg`,         label: "MongoDB"    },
  postgres:   { src: `${DEVICON}/postgresql/postgresql-original.svg`,   label: "PostgreSQL" },
  postgresql: { src: `${DEVICON}/postgresql/postgresql-original.svg`,   label: "PostgreSQL" },
  mysql:      { src: `${DEVICON}/mysql/mysql-original.svg`,             label: "MySQL"      },
  mariadb:    { src: `${DEVICON}/mariadb/mariadb-original.svg`,         label: "MariaDB"    },
  redis:      { src: `${DEVICON}/redis/redis-original.svg`,             label: "Redis"      }, // classic logo
  sqlite:     { src: `${DEVICON}/sqlite/sqlite-original.svg`,           label: "SQLite"     },
  // ── Languages & Runtimes ─────────────────────────────────────────────────
  node:       { src: `${DEVICON}/nodejs/nodejs-original.svg`,           label: "Node.js"    },
  nodejs:     { src: `${DEVICON}/nodejs/nodejs-original.svg`,           label: "Node.js"    },
  javascript: { src: `${DEVICON}/javascript/javascript-original.svg`,   label: "JavaScript" },
  js:         { src: `${DEVICON}/javascript/javascript-original.svg`,   label: "JavaScript" },
  typescript: { src: `${DEVICON}/typescript/typescript-original.svg`,   label: "TypeScript" },
  ts:         { src: `${DEVICON}/typescript/typescript-original.svg`,   label: "TypeScript" },
  python:     { src: `${DEVICON}/python/python-original.svg`,           label: "Python"     },
  py:         { src: `${DEVICON}/python/python-original.svg`,           label: "Python"     },
  go:         { src: `${DEVICON}/go/go-original.svg`,                   label: "Go"         },
  golang:     { src: `${DEVICON}/go/go-original.svg`,                   label: "Go"         },
  rust:       { src: SI("rust", "CE422B"),                              label: "Rust"       },
  java:       { src: `${DEVICON}/java/java-original.svg`,               label: "Java"       },
  php:        { src: `${DEVICON}/php/php-original.svg`,                 label: "PHP"        },
  ruby:       { src: `${DEVICON}/ruby/ruby-original.svg`,               label: "Ruby"       },
  // ── Frameworks ────────────────────────────────────────────────────────────
  next:       { src: `${DEVICON}/nextjs/nextjs-original.svg`,           label: "Next.js"    },
  nextjs:     { src: `${DEVICON}/nextjs/nextjs-original.svg`,           label: "Next.js"    },
  react:      { src: `${DEVICON}/react/react-original.svg`,             label: "React"      },
  vite:       { src: `${DEVICON}/vitejs/vitejs-original.svg`,           label: "Vite"       },
  vue:        { src: `${DEVICON}/vuejs/vuejs-original.svg`,             label: "Vue.js"     },
  nuxt:       { src: `${DEVICON}/nuxtjs/nuxtjs-original.svg`,          label: "Nuxt.js"    },
  svelte:     { src: `${DEVICON}/svelte/svelte-original.svg`,           label: "Svelte"     },
  laravel:    { src: `${DEVICON}/laravel/laravel-original.svg`,         label: "Laravel"    },
  django:     { src: `${DEVICON}/django/django-plain.svg`,              label: "Django"     },
  flask:      { src: SI("flask", "cccccc"),                             label: "Flask"      },
  fastapi:    { src: `${DEVICON}/fastapi/fastapi-original.svg`,         label: "FastAPI"    },
  spring:     { src: `${DEVICON}/spring/spring-original.svg`,           label: "Spring"     },
  express:    { src: `${DEVICON}/express/express-original.svg`,         label: "Express"    },
  nestjs:     { src: `${DEVICON}/nestjs/nestjs-original.svg`,           label: "NestJS"     },
  // ── DevOps ────────────────────────────────────────────────────────────────
  docker:     { src: `${DEVICON}/docker/docker-original.svg`,           label: "Docker"     },
  nginx:      { src: `${DEVICON}/nginx/nginx-original.svg`,             label: "Nginx"      },
  // ── Web ───────────────────────────────────────────────────────────────────
  html:       { src: `${DEVICON}/html5/html5-original.svg`,             label: "HTML5"      },
  css:        { src: `${DEVICON}/css3/css3-original.svg`,               label: "CSS3"       },
};

export function LanguageLogo({ language = "", className = "w-5 h-5" }: LanguageLogoProps) {
  const key = language.toLowerCase().trim();
  const icon = ICON_MAP[key];

  if (icon) {
    return (
      <img
        src={icon.src}
        alt={icon.label}
        title={icon.label}
        className={className}
        style={{ objectFit: "contain" }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.onerror = null;
          // Fallback to generic code icon
          el.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='16 18 22 12 16 6'/%3E%3Cpolyline points='8 6 2 12 8 18'/%3E%3C/svg%3E";
        }}
      />
    );
  }

  // Default fallback SVG
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b7280"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Application"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

