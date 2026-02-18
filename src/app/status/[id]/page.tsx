
"use client";

import { useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Loader2, MapPin, PhoneCall, History, CheckCircle2, User, Info, Navigation, Siren } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';

export default function PublicStatusPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const db = useFirestore();

  const childRef = useMemoFirebase(() => id ? doc(db, 'children', id) : null, [db, id]);
  const { data: child, isLoading: loadingChild } = useDoc(childRef);

  const alertsRef = useMemoFirebase(() => id ? query(
    collection(db, 'rescueEvents'), 
    where('childId', '==', id),
    orderBy('scanTime', 'desc'),
    limit(1)
  ) : null, [db, id]);
  const { data: alerts, isLoading: loadingAlerts } = useCollection(alertsRef);
  const latestAlert = alerts?.[0];

  if (loadingChild || loadingAlerts) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest">Establishing Secure Link...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="ID Status" backHref="/" />
        <main className="container max-w-md py-20 px-6 mx-auto text-center space-y-6">
          <ShieldAlert className="w-20 h-20 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-black uppercase">ID Not Found</h2>
          <p className="text-muted-foreground">The Guardian ID <span className="text-primary font-bold">"{id}"</span> is not active in our registry.</p>
          <Button onClick={() => router.push('/')} className="w-full">Return to Hub</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Guardian Status" backHref="/" />
      <main className="container max-w-xl py-8 px-4 mx-auto space-y-6">
        <Card className="border-4 border-slate-900 overflow-hidden rounded-[2rem] shadow-2xl bg-white">
          <div className="bg-slate-900 p-6 text-white text-center">
             <p className="text-[10px] font-black text-primary uppercase mb-1 tracking-widest">Guardian Protocol ID</p>
             <h1 className="text-5xl font-black tracking-tighter">{child.id}</h1>
          </div>
          <CardContent className="p-8 space-y-8">
             <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-3xl border-4 border-primary overflow-hidden relative shadow-xl">
                   {child.photoUrl ? (
                     <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                   ) : (
                     <div className="w-full h-full bg-slate-100 flex items-center justify-center"><User className="w-12 h-12 text-slate-300" /></div>
                   )}
                </div>
                <div className="text-center">
                   <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tight">{child.childName}</h2>
                   <p className="text-sm font-bold text-muted-foreground uppercase">{child.age} Years Old</p>
                </div>
             </div>

             <div className="grid gap-4">
               {latestAlert ? (
                 <div className="p-6 bg-primary/5 border-2 border-primary rounded-3xl space-y-4 animate-entrance">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Siren className="w-6 h-6 text-primary animate-pulse" />
                        <h3 className="text-lg font-black uppercase">Live SITREP</h3>
                      </div>
                      <Badge className="font-black uppercase">{latestAlert.status}</Badge>
                   </div>
                   <p className="text-slate-700 font-bold leading-tight">
                     Our field teams have located the child. Please proceed to the nearest **Information Hub** for reunion protocols.
                   </p>
                   <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button className="font-black uppercase text-[10px] h-10 shadow-lg" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${latestAlert.locationLatitude},${latestAlert.locationLongitude}`)}>
                        <Navigation className="w-3 h-3 mr-2" /> Hub Route
                      </Button>
                      <Button variant="outline" className="font-black uppercase text-[10px] h-10 border-slate-900" asChild>
                         <a href={`tel:${child.parentMobileNumber}`}><PhoneCall className="w-3 h-3 mr-2" /> Help Line</a>
                      </Button>
                   </div>
                 </div>
               ) : (
                 <div className="p-6 bg-teal-50 border-2 border-teal-500 rounded-3xl space-y-4 text-center">
                    <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
                    <h3 className="text-xl font-black uppercase text-teal-800">Registration Active</h3>
                    <p className="text-teal-700 text-sm font-medium">
                      Child is currently active in our secure registry. No active rescue signals detected.
                    </p>
                 </div>
               )}
             </div>

             <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-start gap-3">
                   <Info className="w-5 h-5 text-slate-400 mt-1" />
                   <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Emergency Briefing</p>
                      <p className="text-sm font-medium text-slate-600">If your child is missing and this status has not updated, please find the nearest uniformed **Volunteer** or trigger a **Manual SOS** from the main dashboard.</p>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
