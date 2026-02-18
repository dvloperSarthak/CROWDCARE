
"use client";

import Link from 'next/link';
import { UserCog, Camera, LayoutDashboard, Fingerprint, LogIn, UserCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
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
          <div className="flex flex-col items-center gap-6">
            {user ? (
              <div className="flex flex-col items-center gap-4 animate-entrance">
                <div className="bg-white border-2 border-primary/20 rounded-full px-6 py-3 flex items-center gap-3 shadow-xl">
                  {isGuardian ? (
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-teal-600" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900 leading-none mb-1">
                      {user.isAnonymous ? 'Guest Volunteer Node' : `Verified Guardian`}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">
                      {user.email || 'Anonymous ID: ' + user.uid.slice(0, 8)}
                    </span>
                  </div>
                </div>
                
                {(!isGuardian || user.isAnonymous) && (
                  <Button variant="outline" className="gap-2 h-10 px-6 font-bold border-primary text-primary hover:bg-primary/5" asChild>
                    <Link href="/login">
                       <ShieldAlert className="w-4 h-4" /> Guardian Authentication
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Button size="lg" className="gap-2 px-10 h-14 text-xl shadow-xl font-black uppercase tracking-widest" asChild>
                <Link href="/login">
                  <LogIn className="w-6 h-6" /> 
                  Guardian Login
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard 
              href="/admin/register"
              icon={<UserCog className="w-6 h-6" />}
              title="Admin Panel"
              description="Child Registration & QR Generation."
              isRestricted={!isAdmin}
              subtext={!isAdmin ? "Guardian Credentials Required" : "Admin Mode Active"}
            />

            <RoleCard 
              href="/volunteer"
              icon={<Camera className="w-6 h-6" />}
              title="Volunteer App"
              description="QR Scanner & Rescue Dispatch."
              onClick={handleGuestAccess}
              subtext="Public Access Allowed"
            />

            <RoleCard 
              href="/control-room"
              icon={<LayoutDashboard className="w-6 h-6" />}
              title="Control Room"
              description="Live Monitoring & Log Tracking."
              isRestricted={!isOperator && !isAdmin}
              subtext={!isOperator && !isAdmin ? "Operator Credentials Required" : "Dashboard Active"}
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
  subtext,
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  isRestricted?: boolean;
  subtext?: string;
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
          href={isRestricted ? "#" : href} 
          onClick={isRestricted ? undefined : onClick}
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
              <h3 className="text-2xl font-black tracking-tight uppercase">{title}</h3>
              <p className="text-muted-foreground font-medium text-sm">{description}</p>
            </div>
          </div>
          {subtext && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <p className={cn(
                "text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-2",
                isRestricted ? "text-destructive" : "text-teal-600"
              )}>
                {subtext}
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
