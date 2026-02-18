
"use client";

import Link from 'next/link';
import { UserCog, Camera, LayoutDashboard, Fingerprint, LogIn, UserCircle, ShieldCheck, ShieldAlert, Loader2, Siren, AlertTriangle } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Hero } from '@/components/ui/animated-hero';
import { cn } from '@/lib/utils';
import { NavBar } from '@/components/nav-bar';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Home() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);

  // Role verification
  const adminRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const operatorRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_operator', user.uid) : null, [db, user]);
  
  const { data: adminRole, isLoading: loadingAdmin } = useDoc(adminRoleRef);
  const { data: operatorRole, isLoading: loadingOperator } = useDoc(operatorRoleRef);

  const isEmailUser = user && !user.isAnonymous;
  const isAdmin = !!adminRole || isEmailUser; 
  const isOperator = !!operatorRole || isEmailUser;
  const isGuardian = isAdmin || isOperator;
  const isLoadingRoles = (loadingAdmin || loadingOperator) && !isEmailUser;

  useEffect(() => {
    if (user && !user.isAnonymous && !adminRole && !loadingAdmin) {
      const roleRef = doc(db, 'roles_admin', user.uid);
      const userRef = doc(db, 'users', user.uid);
      
      setDocumentNonBlocking(roleRef, {
        id: user.uid,
        email: user.email,
        role: 'Admin',
        createdAt: new Date().toISOString()
      }, { merge: true });

      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email,
        firstName: 'Authorized',
        lastName: 'Guardian',
        role: 'Admin',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
  }, [user, adminRole, loadingAdmin, db]);

  const handleGuestAccess = () => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  };

  const triggerGlobalSOS = async () => {
    setIsSOSLoading(true);
    
    if (!user) {
      initiateAnonymousSignIn(auth);
      toast({ title: "Authenticating SOS...", description: "Establishing guest protocol." });
      return;
    }

    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Error", description: "Emergency protocol requires location." });
      setIsSOSLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const alertId = `SOS-PUB-${Date.now()}`;
        const alertRef = doc(db, 'rescueEvents', alertId);
        
        setDocumentNonBlocking(alertRef, {
          id: alertId,
          childId: 'PUBLIC_SOS',
          volunteerId: user.uid,
          locationLatitude: pos.coords.latitude,
          locationLongitude: pos.coords.longitude,
          scanTime: new Date().toISOString(),
          status: 'SOS',
          statusUpdateTime: new Date().toISOString(),
          isDuplicate: false,
          notes: 'URGENT: PANIC SIGNAL TRIGGERED FROM MAIN DASHBOARD',
          isSOS: true
        }, { merge: true });
        
        toast({
          variant: "destructive",
          title: "SOS ACTIVE",
          description: "Tactical telemetry sent to Command Center.",
        });
        setIsSOSLoading(false);
      },
      () => {
        toast({ variant: "destructive", title: "Signal Failure", description: "GPS failed to lock for SOS dispatch." });
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true }
    );
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
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Tactical Role Selection</h2>
            </div>
            
            {isUserLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : user ? (
              <div className="flex flex-col items-center gap-4 animate-entrance">
                <div className="bg-white border-2 border-primary/20 rounded-full px-6 py-3 flex items-center gap-3 shadow-xl">
                  {isGuardian ? (
                    <ShieldCheck className="w-6 h-6 text-teal-600" />
                  ) : (
                    <UserCircle className="w-6 h-6 text-primary" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900 leading-none mb-1">
                      {isGuardian ? 'Verified Guardian Node' : 'Guest Volunteer'}
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
              href="/admin/children"
              icon={<UserCog className="w-6 h-6" />}
              title="Guardian Panel"
              description="ID Registry & Registration Management."
              isRestricted={!isAdmin}
              isLoading={isLoadingRoles}
              subtext={!isAdmin ? "Guardian Credentials Required" : "Guardian Mode Active"}
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
              isLoading={isLoadingRoles}
              subtext={!isOperator && !isAdmin ? "Operator Credentials Required" : "Dashboard Active"}
            />
          </div>
        </div>

        {/* SOS Emergency Hub - Moved to bottom */}
        <div className="w-full max-w-2xl animate-entrance pb-12">
          <Card className="bg-red-50 border-4 border-red-600 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-red-600 text-white p-6 text-center">
              <CardTitle className="flex items-center justify-center gap-3 text-3xl font-black uppercase tracking-tighter">
                <Siren className="w-8 h-8 animate-pulse" /> Emergency Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-center">
              <p className="text-slate-900 font-bold text-lg leading-tight">
                Are you or someone else in immediate danger? Trigger a silent GPS panic signal to our tactical control room.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full h-20 text-2xl font-black uppercase tracking-widest shadow-xl bg-red-600 hover:bg-red-700 rounded-2xl border-b-8 border-red-900">
                    <AlertTriangle className="mr-3 w-8 h-8" /> Trigger Panic SOS
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-950 border-4 border-red-600 text-white rounded-[2rem]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-red-500">
                      <Siren className="w-8 h-8 animate-bounce" /> Confirm Emergency
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-300 font-bold text-base">
                      Dispatch live GPS tracking to our safety response team? Use only in real emergencies.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="bg-transparent border-2 border-white text-white font-black uppercase h-12 rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerGlobalSOS} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase h-12 rounded-xl">
                      {isSOSLoading ? <Loader2 className="animate-spin" /> : "Initiate SOS"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold relative z-10 pt-4 pb-10">
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
  isLoading = false,
  subtext,
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  isRestricted?: boolean;
  isLoading?: boolean;
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
          href={isRestricted || isLoading ? "#" : href} 
          onClick={isRestricted || isLoading ? undefined : onClick}
          className={cn(
            "relative flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all group-hover:bg-slate-50/50",
            (isRestricted || isLoading) && "opacity-60 grayscale cursor-not-allowed"
          )}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
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
