"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertCircle, Check, User, Clock, Loader2, Sparkles, ShieldAlert, Phone, PhoneCall, Navigation, ExternalLink, LocateFixed, Map as MapIcon, BellRing, Camera, AlertTriangle, Lock, ShieldCheck, BarChart3, History, Volume2, VolumeX, Flame, Siren, Download, Activity, Megaphone, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] md:min-h-[400px] bg-slate-100 flex items-center justify-center border-4 border-dashed border-slate-300 rounded-xl"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
});

export default function ControlRoom() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const alertsRef = useMemoFirebase(() => user && isAuthorized ? collection(db, 'rescueEvents') : null, [db, user, isAuthorized]);
  const { data: alerts } = useCollection(alertsRef);
  
  const childrenRef = useMemoFirebase(() => user && isAuthorized ? collection(db, 'children') : null, [db, user, isAuthorized]);
  const { data: children } = useCollection(childrenRef);

  const selectedAlert = alerts?.find(a => a.id === selectedAlertId) || null;
  const relatedChild = children?.find(c => c.id === selectedAlert?.childId) || null;

  const handleBroadcast = async () => {
    if (!broadcastMsg || !user) return;
    setIsBroadcasting(true);
    const broadcastId = `BC-${Date.now()}`;
    const broadcastRef = doc(db, 'broadcasts', broadcastId);
    
    setDocumentNonBlocking(broadcastRef, {
      id: broadcastId,
      message: broadcastMsg,
      priority: 'High',
      sentBy: user.uid,
      timestamp: new Date().toISOString()
    }, { merge: true });

    toast({ title: "Broadcast Disseminated", description: "Global tactical alert pushed to all field terminals." });
    setBroadcastMsg('');
    setIsBroadcasting(false);
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6">
        <Card className="max-w-md w-full border-4 border-primary p-6 md:p-8 space-y-8 bg-slate-900 text-white rounded-[2rem]">
          <div className="text-center space-y-4">
             <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary mx-auto animate-pulse"><Lock className="w-8 h-8 md:w-10 md:h-10 text-primary" /></div>
             <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Command Authentication</h2>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Secure Passcode Required</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <Input type="password" placeholder="****" className="h-14 md:h-16 text-center text-3xl md:text-4xl font-black bg-slate-800 border-none text-white tracking-[0.5em]" value={passcode} onChange={e => setPasscode(e.target.value)} maxLength={4} />
            <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest bg-primary">Authenticate Node</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <NavBar title="Command Dashboard" backHref="/" />
      <main className="container py-6 px-4 md:px-6 mx-auto space-y-8">
        {/* Responsive Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-l-8 border-l-primary bg-white p-4 md:p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">Active Alerts</p><h3 className="text-3xl md:text-4xl font-black">{stats.active}</h3></div>
            <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </Card>
          <Card className="border-l-8 border-l-teal-500 bg-white p-4 md:p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">Resolved</p><h3 className="text-3xl md:text-4xl font-black">{stats.resolved}</h3></div>
            <Check className="w-6 h-6 md:w-8 md:h-8 text-teal-600" />
          </Card>
          <Card className="border-l-8 border-l-red-600 bg-white p-4 md:p-6 flex items-center justify-between">
            <div><p className="text-[10px] font-black text-muted-foreground uppercase">SOS Emergencies</p><h3 className="text-3xl md:text-4xl font-black text-red-600">{stats.sos}</h3></div>
            <Siren className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
          </Card>
          <Card className="bg-slate-900 text-white p-4 space-y-3 shadow-xl">
             <p className="text-[10px] font-black text-primary uppercase flex items-center gap-2"><Megaphone className="w-3 h-3" /> Mass Broadcast</p>
             <div className="flex gap-2">
                <Input 
                  placeholder="Message volunteers..." 
                  className="h-8 text-[10px] bg-slate-800 border-none text-white flex-1" 
                  value={broadcastMsg} 
                  onChange={e => setBroadcastMsg(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBroadcast(); }}
                />
                <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90" onClick={handleBroadcast} disabled={isBroadcasting}>
                  {isBroadcasting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </Button>
             </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-2xl border-4 border-slate-900 h-[400px] md:h-[500px] overflow-hidden">
               <TacticalMap alerts={alerts || []} center={mapCenter} onMarkerClick={setSelectedAlertId} />
            </Card>
            <Card className="shadow-xl border-2 overflow-hidden">
               <div className="overflow-x-auto">
                 <Table>
                   <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-black text-[10px] uppercase">Incident ID</TableHead><TableHead className="font-black text-[10px] uppercase">Status</TableHead><TableHead className="text-right font-black text-[10px] uppercase">Ops</TableHead></TableRow></TableHeader>
                   <TableBody>
                     {alerts?.length === 0 ? (
                       <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground font-black uppercase text-[10px]">No active signals</TableCell></TableRow>
                     ) : alerts?.map(alert => (
                       <TableRow key={alert.id} className={cn(selectedAlertId === alert.id && "bg-primary/10", alert.status === 'SOS' && "bg-red-50")}>
                          <TableCell className="font-black text-xs md:text-sm">{alert.id} ({alert.childId})</TableCell>
                          <TableCell><Badge variant={alert.status === 'SOS' ? "destructive" : "default"} className="text-[8px] md:text-[9px] font-black uppercase">{alert.status}</Badge></TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-[8px] md:text-[9px] font-black uppercase" onClick={() => { setMapCenter([alert.locationLatitude, alert.locationLongitude]); setSelectedAlertId(alert.id); }}>Locate</Button></TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className={cn("shadow-2xl border-4 transition-all duration-500 min-h-[400px] lg:h-full", !selectedAlert ? 'opacity-40 grayscale pointer-events-none hidden lg:block' : 'opacity-100 block', selectedAlert?.status === 'SOS' ? "border-red-600" : "border-slate-900")}>
               <CardHeader className={cn("text-white p-4 font-black uppercase", selectedAlert?.status === 'SOS' ? "bg-red-700" : "bg-slate-900")}>
                 <CardTitle className="text-sm flex items-center justify-between gap-2">
                   <span className="flex items-center gap-2">
                     {selectedAlert?.status === 'SOS' ? <Siren className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 text-primary" />}
                     SITREP: {selectedAlert?.childId}
                   </span>
                   {selectedAlert && <Button variant="ghost" size="sm" className="lg:hidden text-white" onClick={() => setSelectedAlertId(null)}><X className="w-4 h-4" /></Button>}
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                 {selectedAlert ? (
                   <>
                     <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-4 border-primary overflow-hidden relative shadow-lg shrink-0">
                           {relatedChild?.photoUrl ? <Image src={relatedChild.photoUrl} alt="Subject" fill className="object-cover" /> : <User className="w-full h-full text-slate-200" />}
                        </div>
                        <div className="space-y-1">
                           <p className="text-base md:text-lg font-black text-slate-900 uppercase leading-none">{relatedChild?.childName || 'Unregistered'}</p>
                           <p className="text-xs font-bold text-slate-500">{relatedChild?.age || '?'} Years Old</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="bg-slate-50 border p-3 rounded-xl text-[10px] font-medium text-slate-600">
                           <p className="font-black uppercase text-[8px] text-primary mb-1 tracking-widest">Physical Profile:</p>
                           {relatedChild?.physicalDescription || "No physical description available."}
                        </div>

                        {relatedChild?.medicalRequirements && relatedChild.medicalRequirements !== 'None' && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-[10px] font-medium text-red-900 animate-pulse">
                             <p className="font-black uppercase mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Medical Briefing:</p>
                             {relatedChild.medicalRequirements}
                          </div>
                        )}
                     </div>

                     {selectedAlert.statusPhotoUrl && (
                       <div className="space-y-2">
                         <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Camera className="w-3 h-3" /> Field Status Intel</p>
                         <div className="w-full h-32 md:h-40 relative rounded-xl overflow-hidden border-2 border-slate-200">
                            <Image src={selectedAlert.statusPhotoUrl} alt="Field Status" fill className="object-cover" />
                         </div>
                       </div>
                     )}

                     <div className="p-3 md:p-4 bg-slate-900 rounded-xl border-2 border-primary/20 space-y-3">
                        <h4 className="text-[9px] font-black text-primary uppercase flex items-center gap-2"><Navigation className="w-3 h-3" /> Telemetry</h4>
                        <div className="w-full h-20 md:h-24 rounded-lg overflow-hidden border border-slate-700">
                           <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${selectedAlert.locationLatitude},${selectedAlert.locationLongitude}&t=k&z=17&output=embed`} allowFullScreen></iframe>
                        </div>
                        <Button className="w-full h-8 text-[9px] font-black uppercase" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedAlert.locationLatitude},${selectedAlert.locationLongitude}`)}>Tactical Nav (App)</Button>
                     </div>

                     <div className="grid grid-cols-1 gap-3 pt-4 border-t">
                        <Button className="w-full h-12 font-black uppercase bg-teal-600 hover:bg-teal-700" disabled={selectedAlert.status !== 'Scanned' && selectedAlert.status !== 'SOS'} onClick={() => {
                          updateDocumentNonBlocking(doc(db, 'rescueEvents', selectedAlert.id), { status: 'Parent Notified' });
                          toast({ title: "Notification Dispatched", description: "Protocol updated to 'Parent Notified'." });
                        }}>Notify Parent</Button>
                        <Button variant="outline" className="w-full h-12 font-black uppercase border-slate-900" onClick={() => {
                          updateDocumentNonBlocking(doc(db, 'rescueEvents', selectedAlert.id), { status: 'Child Reunited', resolvedTime: new Date().toISOString() });
                          toast({ title: "Mission Resolved", description: "Event marked as cleared." });
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

// Re-using X icon for close button in detail panel
import { X } from 'lucide-react';
