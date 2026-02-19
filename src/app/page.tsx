"use client";

import Link from 'next/link';
import { UserCog, LayoutDashboard, ShieldCheck, Loader2, Siren, AlertTriangle, Zap, Camera as CameraIcon, ScanLine } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Hero } from '@/components/ui/animated-hero';
import { NavBar } from '@/components/nav-bar';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

export default function Home() {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);

  const triggerGlobalSOS = async () => {
    setIsSOSLoading(true);
    if (!user) {
      initiateAnonymousSignIn(auth);
      toast({ title: "Authenticating SOS..." });
      return;
    }
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Error" });
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
          volunteerId: user.uid,
          locationLatitude: pos.coords.latitude,
          locationLongitude: pos.coords.longitude,
          scanTime: new Date().toISOString(),
          status: 'SOS',
          statusUpdateTime: new Date().toISOString(),
          isDuplicate: false,
          notes: 'URGENT: PANIC SIGNAL TRIGGERED FROM MAIN DASHBOARD',
          isSOS: true
        };
        
        setDoc(alertRef, sosData, { merge: true });
        
        toast({ variant: "destructive", title: "SOS ACTIVE" });
        setIsSOSLoading(false);
      },
      () => {
        toast({ variant: "destructive", title: "Signal Failure" });
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden">
      <NavBar title="CrowdCare Guardian" />
      <main className="flex-1 flex flex-col items-center p-6 space-y-12">
        <div className="relative z-10 w-full"><Hero /></div>

        {/* Tactical Shortcuts - Primary Role Access */}
        <div className="w-full max-w-6xl space-y-12 relative z-10" id="roles">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Tactical Launchpad</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-center">
              {/* 1:1 SCAN AN ID SHORTCUT */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = "/volunteer"}
                className="aspect-square w-64 h-64 bg-slate-900 text-white rounded-[2.5rem] border-b-8 border-slate-950 shadow-2xl flex flex-col items-center justify-center gap-6 group transition-all"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ScanLine className="w-10 h-10" />
                </div>
                <div className="text-center px-4">
                  <span className="block text-3xl font-black uppercase tracking-widest leading-none mb-2">SCAN AN ID</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors">Volunteer Terminal</span>
                </div>
              </motion.button>

              <div className="flex flex-col gap-4 w-full md:w-80">
                {!user ? (
                  <InteractiveHoverButton 
                    text="Guardian Login" 
                    className="h-20 w-full text-xl font-black uppercase tracking-widest"
                    onClick={() => window.location.href = "/login"}
                  />
                ) : (
                  <div className="bg-white border-4 border-primary/20 rounded-3xl px-8 py-4 flex items-center gap-4 shadow-xl animate-entrance h-20 w-full">
                    <ShieldCheck className="w-8 h-8 text-teal-600" />
                    <div className="flex flex-col">
                      <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1">Authenticated</span>
                      <span className="text-xs font-black text-slate-900 truncate max-w-[150px]">{user.email || 'Tactical Guest'}</span>
                    </div>
                  </div>
                )}
                <RoleCard href="/control-room" icon={<LayoutDashboard className="w-6 h-6" />} title="Control Room" description="Live Dashboard & Intel." />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12 max-w-4xl mx-auto">
            <RoleCard href="/admin/children" icon={<UserCog className="w-6 h-6" />} title="Guardian Panel" description="Registry & ID Management." />
            <RoleCard href="/volunteer" icon={<CameraIcon className="w-6 h-6" />} title="Volunteer App" description="QR Scanner & Dispatch Hub." />
          </div>
        </div>

        {/* SOS Emergency Hub */}
        <div className="w-full max-w-2xl animate-entrance pb-24">
          <Card className="bg-red-50 border-4 border-red-600 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-red-600 text-white p-6 text-center">
              <h3 className="flex items-center justify-center gap-3 text-3xl font-black uppercase tracking-tighter"><Siren className="w-8 h-8 animate-pulse" /> Emergency SOS</h3>
            </div>
            <CardContent className="p-8 space-y-6 text-center">
              <p className="text-slate-900 font-bold text-lg leading-tight">Immediate danger? Trigger a silent GPS panic signal to our tactical control room.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full h-20 text-2xl font-black uppercase shadow-xl bg-red-600 hover:bg-red-700 rounded-2xl border-b-8 border-red-900"><AlertTriangle className="mr-3 w-8 h-8" /> Trigger Panic SOS</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-950 border-4 border-red-600 text-white rounded-[2rem]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3 text-2xl font-black uppercase text-red-500"><Siren className="w-8 h-8 animate-bounce" /> Confirm SOS</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-300 font-bold text-base">Dispatch live GPS tracking to tactical response?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="bg-transparent border-2 border-white text-white font-black uppercase h-12 rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerGlobalSOS} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase h-12 rounded-xl">{isSOSLoading ? <Loader2 className="animate-spin" /> : "Initiate SOS"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string; }) {
  return (
    <div className="relative group h-full">
      <div className="relative h-full rounded-[1.25rem] border p-2 transition-all">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
        <Link href={href} className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all group-hover:bg-slate-50/50">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">{icon}</div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight uppercase">{title}</h3>
              <p className="text-muted-foreground font-medium text-sm">{description}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
