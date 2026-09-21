"use client";

import * as React from "react";
import { ClipboardCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { useI18n } from "@/components/preferences/use-i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentDemoUser } from "@/lib/current-user";
import { getPersonalSettings } from "@/lib/profile-settings";

export function AuthLoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ username?: string; password?: string; credentials?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const usernameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const next: typeof errors = {};
    if (!username.trim()) next.username = t("auth.usernameRequired");
    if (!password) next.password = t("auth.passwordRequired");
    setErrors(next);
    if (next.username || next.password) {
      (next.username ? usernameRef : passwordRef).current?.focus();
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      return;
    }
    setSubmitting(true);
    const valid = await login(username.trim(), password);
    if (!valid) {
      setSubmitting(false);
      setErrors({ credentials: t("auth.incorrectCredentials") });
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      passwordRef.current?.focus();
      return;
    }
    if (pathname === "/dashboard") router.replace(getPersonalSettings(getCurrentDemoUser().id).preferences.defaultLandingPage);
  }

  return <main className="grid min-h-screen place-items-center overflow-x-hidden bg-[radial-gradient(circle_at_top,var(--color-primary)/.07,transparent_34%)] bg-muted/35 px-4 py-6 dark:bg-background">
    <Card className={`motion-page-enter w-full max-w-[420px] border-border/75 bg-card/95 shadow-xl shadow-black/[.06] backdrop-blur ${shake ? "motion-validation-shake" : ""}`} onAnimationEnd={() => setShake(false)}>
      <CardContent className="p-6 sm:p-8">
        <div className="grid justify-items-center text-center"><span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20"><ClipboardCheck className="size-6" /></span><p className="mt-3 text-sm font-semibold">OPS</p><h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight">{t("auth.welcome")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p></div>
        <form className="mt-7 grid gap-5" onSubmit={submit} noValidate>
          <div className="grid gap-2"><Label htmlFor="auth-username">{t("auth.username")}</Label><Input ref={usernameRef} id="auth-username" autoComplete="username" className={`h-11 ${errors.username || errors.credentials ? "border-destructive" : ""}`} value={username} onChange={(event) => { setUsername(event.target.value); setErrors({}); }} placeholder={t("auth.enterUsername")} aria-invalid={Boolean(errors.username || errors.credentials)} />{errors.username && <p role="alert" className="text-xs font-medium text-destructive">{errors.username}</p>}</div>
          <div className="grid gap-2"><Label htmlFor="auth-password">{t("auth.password")}</Label><div className="relative"><Input ref={passwordRef} id="auth-password" type={showPassword ? "text" : "password"} autoComplete="current-password" className={`h-11 pr-11 ${errors.password || errors.credentials ? "border-destructive" : ""}`} value={password} onChange={(event) => { setPassword(event.target.value); setErrors({}); }} placeholder={t("auth.enterPassword")} aria-invalid={Boolean(errors.password || errors.credentials)} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 grid size-11 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{errors.password && <p role="alert" className="text-xs font-medium text-destructive">{errors.password}</p>}</div>
          {errors.credentials && <p role="alert" className="-mt-1 text-sm font-medium text-destructive">{errors.credentials}</p>}
          <Button type="submit" className="h-11 w-full" disabled={submitting}>{submitting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />}{submitting ? t("auth.signingIn") : t("auth.signIn")}</Button>
        </form>
        <div className="mt-6 border-t pt-5 text-center text-xs text-muted-foreground"><span>{t("auth.demoAccess")}: </span><span className="font-mono font-semibold text-foreground">admin / admin</span><span className="mt-1 block">The password changes if updated in Profile Settings.</span></div>
      </CardContent>
    </Card>
  </main>;
}
