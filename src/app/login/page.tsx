"use client";

import { AuthComponent } from "@/components/ui/sign-up";
import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { doc } from "firebase/firestore";

const GuardianLogo = () => (
  <div className="bg-primary text-white rounded-md p-1.5 shadow-lg">
    <ShieldAlert className="h-5 w-5" />
  </div>
);

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      // Auto-provision Guardian (Admin) role on first login for prototype access
      const adminRoleRef = doc(db, 'roles_admin', user.uid);
      const userProfileRef = doc(db, 'users', user.uid);

      // Create role marker
      setDocumentNonBlocking(adminRoleRef, {
        id: user.uid,
        email: user.email,
        role: 'Admin',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Create user profile
      setDocumentNonBlocking(userProfileRef, {
        id: user.uid,
        email: user.email,
        firstName: 'New',
        lastName: 'Guardian',
        role: 'Admin',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Small delay to ensure Firestore propagation before redirecting to home
      setTimeout(() => {
        router.push('/');
      }, 500);
    }
  }, [user, isUserLoading, db, router]);

  return (
    <AuthComponent 
      logo={<GuardianLogo />} 
      brandName="Guardian Hub" 
      onSuccess={() => {
        // Handled by the useEffect above
      }}
    />
  );
}