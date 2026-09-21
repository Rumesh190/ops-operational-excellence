import { redirect } from "next/navigation";

// The Dashboard is the application's landing page per the Information
// Architecture doc. Login isn't in scope for this sprint, so this always
// redirects straight into the shell.
export default function RootPage() {
  redirect("/dashboard");
}
