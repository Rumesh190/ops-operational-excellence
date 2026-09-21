import { ProfileSettingsPage } from "@/features/profile/profile-page";

const PROFILE_TABS = ["profile", "security", "preferences", "notifications"] as const;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = PROFILE_TABS.find((item) => item === tab) ?? "profile";
  return <ProfileSettingsPage initialTab={initialTab} />;
}
