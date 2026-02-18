
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ChevronLeft, LogOut, UserCircle, Siren, Loader2, Navigation, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore, initiateAnonymousSignIn, setDocumentNonBlocking } from '@/firebase';
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

export function NavBar({ title, backHref }: { title: string, backHref?: string }) {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const triggerGlobalSOS = async () => {
    setIsSOSLoading(true);
    
    // Ensure anonymous sign-in for guests
    let currentUser = user;
    if (!currentUser) {
      initiateAnonymousSignIn(auth);
      // We'll wait a brief moment for the auth state to settle, 
      // though non-blocking is preferred, we need a UID for the SOS record.
      toast({ title: "Authenticating SOS...", description: "Establishing secure link to Command." });
      return; // The user will need to tap again once auth settles, or we could poll.
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
          
          <div className="hidden md:flex">
            <InteractiveHoverButton 
              text="Menu" 
              className="h-9 w-24 text-[10px] font-bold uppercase tracking-widest"
              onClick={() => router.push('/')}
            />
          </div>
          
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-destructive h-9">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
