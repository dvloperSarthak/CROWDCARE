
"use client";

import { AuthComponent } from "@/components/ui/sign-up";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

const GuardianLogo = () => (
  <div className="bg-primary text-white rounded-md p-1.5 shadow-lg">
    <ShieldAlert className="h-5 w-5" />
  </div>
);

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in as a real user
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  return (
    <AuthComponent 
      logo={<GuardianLogo />} 
      brandName="Guardian Hub" 
      onSuccess={() => router.push('/')}
    />
  );
}
