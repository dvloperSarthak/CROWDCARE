
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ChevronLeft, 
  LogOut, 
  UserCircle, 
  Siren, 
  Loader2, 
  Navigation, 
  AlertTriangle, 
  Home, 
  Menu as MenuIcon,
  UserCog,
  Camera,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, initiateAnonymousSignIn, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NavBar({ title, backHref }: { title: string, backHref?: string }) {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Role verification for menu links
  const adminRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const operatorRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_operator', user.uid) : null, [db, user]);
  
  const { data: adminRole } = useDoc(adminRoleRef);
  const { data: operatorRole } = useDoc(operatorRoleRef);

  const isEmailUser = user && !user.isAnonymous;
  const isAdmin = !!adminRole || isEmailUser;
  const isOperator = !!operatorRole || isEmailUser;

  const handleLogout = async () => {
    await signOut(auth);
    setIsMenuOpen(false);
    router.push('/');
  };

  const triggerGlobalSOS = async () => {
    setIsSOSLoading(true);
    let currentUser = user;
    if (!currentUser) {
      initiateAnonymousSignIn(auth);
      toast({ title: "Authenticating SOS...", description: "Establishing secure link to Command." });
      return;
    }

    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Required", description: "Global SOS requires location telemetry." });
      setIsSOSLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const alertId = `SOS-PUB-${Date.now()}`;
        const alertRef = doc(db, 'rescueEvents', alertId);
        
        const sosData = {
          id: alertId,
          childId: 'PUBLIC_SOS',
          volunteerId: currentUser.uid,
          locationLatitude: pos.coords.latitude,
          locationLongitude: pos.coords.longitude,
          scanTime: new Date().toISOString(),
          status: 'SOS',
          statusUpdateTime: new Date().toISOString(),
          isDuplicate: false,
          notes: 'USER PANIC SIGNAL - DISTRESS DETECTED VIA GLOBAL NAV',
          isSOS: true
        };

        setDocumentNonBlocking(alertRef, sosData, { merge: true });
        
        toast({
          variant: "destructive",
          title: "SOS BROADCAST LIVE",
          description: "Emergency coordinates transmitted to Command Center.",
        });
        setIsSOSLoading(false);
      },
      (err) => {
        toast({ variant: "destructive", title: "Signal Failure", description: "Could not lock GPS for SOS dispatch." });
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center px-6 mx-auto">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="mr-4">
            <Link href={backHref}>
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight hidden sm:inline-block">{title}</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {/* Global SOS Trigger */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-9 px-4 font-black uppercase tracking-widest animate-pulse shadow-lg bg-red-600 hover:bg-red-700">
                <Siren className="w-4 h-4 mr-2" /> SOS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-950 border-4 border-red-600 text-white rounded-[2rem]">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter text-red-500">
                  <AlertTriangle className="w-8 h-8 animate-bounce" /> Confirm SOS
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-300 font-bold text-base">
                  This will broadcast your LIVE GPS coordinates to the CrowdCare Control Room for immediate emergency assistance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="bg-transparent border-2 border-white text-white font-black uppercase h-12 rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={triggerGlobalSOS} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase h-12 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  {isSOSLoading ? <Loader2 className="animate-spin" /> : "Broadcast SOS"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {user && (
            <div className="hidden lg:flex items-center gap-2 mr-4 bg-slate-50 px-3 py-1 rounded-full border">
              <UserCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold max-w-[150px] truncate">
                {user.isAnonymous ? 'Guest' : user.email}
              </span>
            </div>
          )}
          
          {/* Tactical Sidebar Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <div className="hidden md:flex">
                <InteractiveHoverButton 
                  text="Menu" 
                  className="h-9 w-24 text-[10px] font-bold uppercase tracking-widest"
                />
              </div>
            </SheetTrigger>
            <SheetContent className="bg-slate-50 border-l-4 border-primary sm:max-w-sm">
              <SheetHeader className="border-b pb-6 mb-6">
                <SheetTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tighter">
                  <ShieldAlert className="w-8 h-8 text-primary" /> Tactical Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">
                <MenuLink 
                  href="/" 
                  icon={<Home className="w-5 h-5" />} 
                  label="Command Dashboard" 
                  onClick={() => setIsMenuOpen(false)} 
                />
                <MenuLink 
                  href="/volunteer" 
                  icon={<Camera className="w-5 h-5" />} 
                  label="Volunteer Terminal" 
                  onClick={() => setIsMenuOpen(false)} 
                />
                
                {(isAdmin || isOperator) && (
                  <>
                    <div className="h-px bg-slate-200 my-2" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Guardian Operations</p>
                    {isAdmin && (
                      <MenuLink 
                        href="/admin/children" 
                        icon={<UserCog className="w-5 h-5" />} 
                        label="Registry Management" 
                        onClick={() => setIsMenuOpen(false)} 
                      />
                    )}
                    {isOperator && (
                      <MenuLink 
                        href="/control-room" 
                        icon={<LayoutDashboard className="w-5 h-5" />} 
                        label="Tactical Control Room" 
                        onClick={() => setIsMenuOpen(false)} 
                      />
                    )}
                  </>
                )}

                <div className="mt-auto pt-8 flex flex-col gap-4">
                  {user && !user.isAnonymous ? (
                    <Button 
                      variant="outline" 
                      className="w-full h-12 justify-start gap-4 font-black uppercase border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5" /> Logout Node
                    </Button>
                  ) : (
                    <Button 
                      className="w-full h-12 justify-start gap-4 font-black uppercase bg-primary" 
                      onClick={() => { setIsMenuOpen(false); router.push('/login'); }}
                    >
                      <ShieldCheck className="w-5 h-5" /> Guardian Login
                    </Button>
                  )}
                  <p className="text-center text-[8px] font-black uppercase text-slate-400 tracking-[0.3em]">Guardian Protocol v2.5.1</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Mobile Menu Icon */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}>
              <MenuIcon className="w-6 h-6 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-200 group"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="font-black uppercase text-xs tracking-widest text-slate-700">{label}</span>
    </Link>
  );
}
