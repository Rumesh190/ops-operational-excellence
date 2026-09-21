import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/actions/settings/reminder-rules");
}
