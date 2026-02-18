
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertCircle, Check, User, Clock, Loader2, Sparkles, ShieldAlert, Phone, PhoneCall, Navigation, ExternalLink, LocateFixed, Map as MapIcon, BellRing, Camera, AlertTriangle, Lock, ShieldCheck, BarChart3, History, Volume2, VolumeX, Flame, Siren, Download, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[400px] bg-slate-100 flex items-center justify-center border-4 border-dashed border-slate-300 rounded-xl"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
});

export default function ControlRoom() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);

  const alertsRef = useMemoFirebase(() => user && isAuthorized ? collection(db, 'rescueEvents') : null, [db, user, isAuthorized]);
  const { data: alerts, isLoading: loadingAlerts } = useCollection(alertsRef);
  
  const childrenRef = useMemoFirebase(() => user && isAuthorized ? collection(db, 'children') : null, [db, user, isAuthorized]);
  const { data: children } = useCollection(childrenRef);

  const selectedAlert = alerts?.find(a => a.id === selectedAlertId) || null;
  const relatedChild = children?.find(c => c.id === selectedAlert?.childId) || null;

  const exportTacticalData = () => {
    if (!alerts) return;
    const headers = ["AlertID", "ChildID", "Status", "Latitude", "Longitude", "Time", "Notes"];
    const rows = alerts.map(a => [a.id, a.childId, a.status, a.locationLatitude, a.locationLongitude, a.scanTime, (a.notes || '').replace(/,/g, ';')]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SITREP_EXPORT_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: "Export Complete", description: "Tactical incident log downloaded." });
  };

  const stats = useMemo(() => {
    if (!alerts || !children) return { active: 0, resolved: 0, total: 0, sos: 0 };
    return {
      active: alerts.filter(a => a.status !== 'Child Reunited' && a.status !== 'Resolved').length,
      resolved: alerts.filter(a => a.status === 'Child Reunited' || a.status === 'Resolved').length,
      total: children.length,
      sos: alerts.filter(a => a.status === 'SOS').length
    };
  }, [alerts, children]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2411') setIsAuthorized(true);
    else { toast({ variant: "destructive", title: "Access Denied" }); setPasscode(''); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full border-4 border-primary p-8 space-y-8 bg-slate-900 text-white rounded-[2rem]">
          <div className="text-center space-y-4">
             <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary mx-auto animate-pulse"><Lock className="w-10 h-10 text-primary" /></div>
             <h2 className="text-3xl font-black uppercase tracking-tighter">Command Authentication</h2>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Secure Passcode Required</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input type="password" placeholder="****" className="h-16 text-center text-4xl font-black bg-slate-800 border-none text-white tracking-[0.5em]" value={passcode} onChange={e => setPasscode(e.target.value)} maxLength={4} />
            <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest bg-primary">Authenticate Node</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Command Dashboard" backHref="/" />
      <main className="container py-6 px-6 mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-8 border-l-primary bg-white p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">Active Alerts</p><h3 className="text-4xl font-black">{stats.active}</h3></div>
            <ShieldAlert className="w-8 h-8 text-primary" />
          </Card>
          <Card className="border-l-8 border-l-teal-500 bg-white p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">Resolved</p><h3 className="text-4xl font-black">{stats.resolved}</h3></div>
            <Check className="w-8 h-8 text-teal-600" />
          </Card>
          <Card className="border-l-8 border-l-red-600 bg-white p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">SOS Emergencies</p><h3 className="text-4xl font-black text-red-600">{stats.sos}</h3></div>
            <Siren className="w-8 h-8 text-red-600" />
          </Card>
          <Card className="bg-slate-900 text-white p-4 flex flex-row items-center gap-4">
             <div className="flex-1">
                <p className="text-[10px] font-black text-primary uppercase">Tactical Ops</p>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-[8px] font-black uppercase border-primary text-primary hover:bg-primary/10" onClick={exportTacticalData}>
                   <Download className="w-3 h-3 mr-1" /> Export SITREPs
                </Button>
             </div>
             <BarChart3 className="w-10 h-10 text-primary opacity-20" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-2xl border-4 border-slate-900 h-[500px] overflow-hidden">
               <TacticalMap alerts={alerts || []} center={mapCenter} onMarkerClick={setSelectedAlertId} />
            </Card>
            <Card className="shadow-xl border-2">
               <Table>
                 <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-black text-[10px] uppercase">Incident ID</TableHead><TableHead className="font-black text-[10px] uppercase">Status</TableHead><TableHead className="text-right font-black text-[10px] uppercase">Ops</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {alerts?.map(alert => (
                     <TableRow key={alert.id} className={cn(selectedAlertId === alert.id && "bg-primary/10", alert.status === 'SOS' && "bg-red-50")}>
                        <TableCell className="font-black">{alert.id} ({alert.childId})</TableCell>
                        <TableCell><Badge variant={alert.status === 'SOS' ? "destructive" : "default"} className="text-[9px] font-black uppercase">{alert.status}</Badge></TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase" onClick={() => { setMapCenter([alert.locationLatitude, alert.locationLongitude]); setSelectedAlertId(alert.id); }}>Locate</Button></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className={cn("shadow-2xl border-4 transition-all duration-500 h-full", !selectedAlert ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100', selectedAlert?.status === 'SOS' ? "border-red-600" : "border-slate-900")}>
               <CardHeader className={cn("text-white p-4 font-black uppercase", selectedAlert?.status === 'SOS' ? "bg-red-700" : "bg-slate-900")}>
                 <CardTitle className="text-sm flex items-center gap-2">
                   {selectedAlert?.status === 'SOS' ? <Siren className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-primary" />}
                   SITREP: {selectedAlert?.childId}
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                 {selectedAlert ? (
                   <>
                     <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 rounded-xl border-4 border-primary overflow-hidden relative shadow-lg shrink-0">
                           {relatedChild?.photoUrl ? <Image src={relatedChild.photoUrl} alt="Subject" fill className="object-cover" /> : <User className="w-full h-full text-slate-200" />}
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-primary uppercase">{relatedChild?.childName || 'Unregistered'}</p>
                           <p className="text-xs font-bold text-slate-500">{relatedChild?.age || '?'} Years Old</p>
                           {relatedChild?.medicalRequirements && relatedChild.medicalRequirements !== 'None' && (
                             <div className="mt-2 text-[9px] font-black uppercase text-red-600 animate-pulse flex items-center gap-1"><Activity className="w-3 h-3" /> Medical Alert</div>
                           )}
                        </div>
                     </div>

                     {relatedChild?.medicalRequirements && relatedChild.medicalRequirements !== 'None' && (
                       <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-[10px] font-medium text-red-900">
                          <p className="font-black uppercase mb-1">Medical Briefing:</p>
                          {relatedChild.medicalRequirements}
                       </div>
                     )}

                     {selectedAlert.statusPhotoUrl && (
                       <div className="space-y-2">
                         <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Camera className="w-3 h-3" /> Field Status Intel</p>
                         <div className="w-full h-40 relative rounded-xl overflow-hidden border-2 border-slate-200">
                            <Image src={selectedAlert.statusPhotoUrl} alt="Field Status" fill className="object-cover" />
                         </div>
                       </div>
                     )}

                     <div className="p-4 bg-slate-900 rounded-xl border-2 border-primary/20 space-y-3">
                        <h4 className="text-[9px] font-black text-primary uppercase flex items-center gap-2"><Navigation className="w-3 h-3" /> Telemetry</h4>
                        <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-700">
                           <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${selectedAlert.locationLatitude},${selectedAlert.locationLongitude}&t=k&z=17&output=embed`} allowFullScreen></iframe>
                        </div>
                     </div>

                     <div className="space-y-3 pt-4 border-t">
                        <Button className="w-full h-12 font-black uppercase bg-teal-600 hover:bg-teal-700" disabled={selectedAlert.status !== 'Scanned'} onClick={() => {
                          const logId = `LOG-${Date.now()}`;
                          const logRef = doc(db, 'rescueEvents', selectedAlert.id, 'notificationLogs', logId);
                          setDocumentNonBlocking(logRef, { id: logId, rescueEventId: selectedAlert.id, recipientMobileNumber: relatedChild?.parentMobileNumber || 'N/A', notificationType: 'Tactical Alert', messageBody: `Guardian Alert: ${relatedChild?.childName || 'Your child'} located. Proceed to nearest hub.`, sentTime: new Date().toISOString(), deliveryStatus: 'Delivered' }, { merge: true });
                          updateDocumentNonBlocking(doc(db, 'rescueEvents', selectedAlert.id), { status: 'Parent Notified' });
                          toast({ title: "Dispatch Complete" });
                        }}>Notify Parent</Button>
                        <Button variant="outline" className="w-full h-12 font-black uppercase border-slate-900" onClick={() => {
                          updateDocumentNonBlocking(doc(db, 'rescueEvents', selectedAlert.id), { status: 'Child Reunited', resolvedTime: new Date().toISOString() });
                          toast({ title: "Mission Resolved" });
                          setSelectedAlertId(null);
                        }}>Mission Clear</Button>
                     </div>
                   </>
                 ) : (
                   <div className="text-center py-24 text-muted-foreground uppercase text-[10px] font-black tracking-widest">Select Incident Log</div>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
