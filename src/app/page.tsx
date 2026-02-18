"use client";

import Link from 'next/link';
import { UserCog, Camera, LayoutDashboard, Fingerprint, LogIn, UserCircle, ShieldCheck } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Hero } from '@/components/ui/animated-hero';
import { cn } from '@/lib/utils';
import { NavBar } from '@/components/nav-bar';
import { doc } from 'firebase/firestore';

export default function Home() {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();

  // Role verification (checks if current UID exists in roles collections)
  const adminRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const operatorRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_operator', user.uid) : null, [db, user]);
  
  const { data: adminRole } = useDoc(adminRoleRef);
  const { data: operatorRole } = useDoc(operatorRoleRef);

  const isAdmin = !!adminRole;
  const isOperator = !!operatorRole;
  const isGuardian = isAdmin || isOperator;

  const handleGuestAccess = () => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden">
      <NavBar title="CrowdCare Guardian" />
      
      <main className="flex-1 flex flex-col items-center p-6 space-y-12">
        <div className="relative z-10 w-full">
          <Hero />
        </div>

        <div className="w-full max-w-6xl space-y-8 relative z-10" id="roles">
          <div className="flex flex-col items-center gap-4">
            {user && (
              <div className="flex flex-col items-center gap-2 animate-entrance">
                <div className="bg-white border-2 border-primary/20 rounded-full px-6 py-2 flex items-center gap-2 shadow-lg">
                  {isGuardian ? (
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  ) : (
                    <UserCircle className="w-5 h-5 text-teal-600" />
                  )}
                  <span className="font-black text-sm uppercase tracking-tight">
                    {user.isAnonymous ? 'Guest Volunteer Session' : `Authenticated Guardian (${user.email})`}
                  </span>
                </div>
                {isGuardian && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                    {isAdmin ? 'System Administrator' : 'Control Room Operator'}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button size="lg" className="gap-2 px-8 h-12 text-lg shadow-md font-bold" asChild>
                <Link href="/login">
                  <LogIn className="w-5 h-5" /> 
                  Guardian Login
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard 
              href="/admin/register"
              icon={<UserCog className="w-6 h-6" />}
              title="Guardian Admin"
              description="Child Registration & QR Generation."
              isRestricted={!isAdmin}
            />

            <RoleCard 
              href="/volunteer"
              icon={<Camera className="w-6 h-6" />}
              title="Volunteer App"
              description="QR Scanner & Rescue Dispatch."
              onClick={handleGuestAccess}
            />

            <RoleCard 
              href="/control-room"
              icon={<LayoutDashboard className="w-6 h-6" />}
              title="Control Room"
              description="Live Monitoring & Log Tracking."
              isRestricted={!isOperator && !isAdmin}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold relative z-10 pt-10 pb-10">
          <Fingerprint className="w-4 h-4 text-primary" />
          <span className="uppercase tracking-[0.2em] text-[10px]">End-to-End Encrypted & Privacy Centric</span>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ 
  href, 
  icon, 
  title, 
  description, 
  isRestricted = false,
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  isRestricted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="relative group h-full">
      <div className="relative h-full rounded-[1.25rem] border border-border p-2 md:p-3 transition-all">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <Link 
          href={href} 
          onClick={onClick}
          className={cn(
            "relative flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all group-hover:bg-slate-50/50",
            isRestricted && "opacity-60 grayscale cursor-not-allowed"
          )}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="text-muted-foreground font-medium text-sm">{description}</p>
            </div>
          </div>
          {isRestricted && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <p className="text-[10px] font-black text-destructive tracking-widest uppercase flex items-center gap-2">
                Elevated Credentials Required
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
