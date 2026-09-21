import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/audits/settings/evidence-rules");
}
