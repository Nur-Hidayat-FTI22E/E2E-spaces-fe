export function GitlabIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg"
      alt="GitLab"
      title="GitLab"
      className={className}
      style={{ objectFit: "contain" }}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
