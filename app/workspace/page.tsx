import { redirect } from "next/navigation";

// All traffic to /workspace is redirected to /workspace/projects.
export default function WorkspacePage() {
  redirect("/workspace/projects");
}
