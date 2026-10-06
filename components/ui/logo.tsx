import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
}

export function Logo({
  size = "md",
  showText = true,
  href = "/",
  className = "",
}: LogoProps) {
  const sizeConfig = {
    sm: { height: 24, width: 85, imgClass: "h-6 w-auto" },
    md: { height: 32, width: 110, imgClass: "h-8 w-auto" },
    lg: { height: 42, width: 145, imgClass: "h-10 w-auto" },
  }[size];

  const content = (
    <div className={`inline-flex items-center group cursor-pointer select-none ${className}`}>
      {showText ? (
        <Image
          src="/logo.png"
          alt="KotaCloud Spaces"
          width={sizeConfig.width * 2}
          height={sizeConfig.height * 2}
          style={{ width: "auto" }}
          className={`${sizeConfig.imgClass} object-contain transition-all duration-200 group-hover:opacity-90`}
          priority
        />
      ) : (
        <div className={`${sizeConfig.imgClass} aspect-square overflow-hidden flex items-center justify-start`}>
          <Image
            src="/logo.png"
            alt="KotaCloud Spaces"
            width={sizeConfig.width * 2}
            height={sizeConfig.height * 2}
            style={{ width: "auto" }}
            className={`${sizeConfig.imgClass} max-w-none object-left object-contain`}
            priority
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

