
"use client";

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertCircle, Map, Bell, Check, User, Phone, ShieldAlert, Clock, Loader2, Sparkles, UserCircle, ExternalLink, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import Image from 'next/image';

export default function ControlRoom() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const alertsRef = useMemoFirebase(() => user ? collection(db, 'rescueEvents') : null, [db, user]);
  const { data: alerts, isLoading: loadingAlerts } = useCollection(alertsRef);
  
  const childrenRef = useMemoFirebase(() => user ? collection(db, 'children') : null, [db, user]);
  const { data: children } = useCollection(childrenRef);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [prevAlertsCount, setPrevAlertsCount] = useState(0);

  const selectedAlert = alerts?.find(a => a.id === selectedAlertId) || null;
  const relatedChild = children?.find(c => c.id === selectedAlert?.childId) || null;

  useEffect(() => {
    if (alerts && alerts.length > prevAlertsCount) {
      if (prevAlertsCount > 0) {
        toast({
          title: "NEW ALERT RECEIVED",
          description: `Child ID ${alerts[alerts.length - 1].childId} detected. coordinates locked.`,
          className: "bg-primary text-white border-none shadow-2xl animate-bounce"
        });
      }
      setPrevAlertsCount(alerts.length);
    }
  }, [alerts, prevAlertsCount, toast]);

  const handleSelectAlert = (alert: any) => {
    setSelectedAlertId(alert.id);
    if (alert.isDuplicate === undefined || alert.isDuplicate === false) {
      checkDuplicate(alert);
    }
  };

  const checkDuplicate = async (newAlert: any) => {
    try {
      const recentAlerts = (alerts || [])
        .filter(a => a.id !== newAlert.id)
        .map(a => ({
          alertId: a.id,
          childId: a.childId,
          location: `${a.locationLatitude}, ${a.locationLongitude}`,
          timestamp: a.scanTime
        }));

      if (recentAlerts.length === 0) return;

      const result = await detectDuplicateRescueAlert({
        childId: newAlert.childId,
        location: `${newAlert.locationLatitude}, ${newAlert.locationLongitude}`,
        timestamp: newAlert.scanTime,
        recentAlerts
      });

      if (result.isDuplicate) {
        toast({ title: "AI Detection Warning", description: `Potential duplicate identified: ${result.reason}`, variant: "destructive" });
        const alertRef = doc(db, 'rescueEvents', newAlert.id);
        updateDocumentNonBlocking(alertRef, { isDuplicate: true, notes: result.reason, statusUpdateTime: new Date().toISOString() });
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }
  };

  const notifyParent = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    updateDocumentNonBlocking(alertRef, { status: 'Parent Notified', statusUpdateTime: new Date().toISOString() });
    toast({ title: "Notification Sent", description: "SMS and Push dispatch complete.", variant: "secondary" });
  };

  const resolveRescue = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    updateDocumentNonBlocking(alertRef, { status: 'Child Reunited', resolvedTime: new Date().toISOString(), statusUpdateTime: new Date().toISOString() });
    toast({ title: "Mission Resolved", description: "Alert cleared. Family reunited." });
    setSelectedAlertId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Central Control Dashboard" backHref="/" />
      
      <main className="container-fluid py-6 px-6 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Statistics Bar */}
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-primary p-2 rounded-lg shadow-md"><AlertCircle className="text-white h-6 w-6" /></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Alerts</p><p className="text-3xl font-black text-primary">{alerts?.filter(a => a.status !== 'Child Reunited').length || 0}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 border-teal-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-teal-500 p-2 rounded-lg shadow-md"><Check className="text-white h-6 w-6" /></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reunited</p><p className="text-3xl font-black text-teal-700">{alerts?.filter(a => a.status === 'Child Reunited').length || 0}</p></div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-slate-200 p-2 rounded-lg"><User className="text-slate-700 h-6 w-6" /></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Registered</p><p className="text-3xl font-black">{children?.length || 0}</p></div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-slate-200 p-2 rounded-lg"><Clock className="text-slate-700 h-6 w-6" /></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Avg Response</p><p className="text-3xl font-black">4.2m</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Live Alerts Table */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-xl border-2 overflow-hidden">
            <CardHeader className="border-b bg-slate-50 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Live Rescue Feed</CardTitle>
                </div>
                <Badge variant="outline" className="animate-pulse border-primary text-primary px-3 bg-primary/5 text-[9px] font-black">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2" /> SECURE LIVE FEED
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAlerts || !user ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-muted-foreground font-black uppercase text-xs">Decrypting field signals...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="w-24 font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Location</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Identity</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Map</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Ops</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!alerts || alerts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">No active field alerts.</TableCell></TableRow>
                    ) : (
                      [...alerts].reverse().map((alert) => {
                        const child = children?.find(c => c.id === alert.childId);
                        return (
                          <TableRow key={alert.id} className={`cursor-pointer transition-all duration-300 ${selectedAlertId === alert.id ? 'bg-primary/10' : ''}`} onClick={() => handleSelectAlert(alert)}>
                            <TableCell className="font-black text-primary">{alert.childId}</TableCell>
                            <TableCell className="text-[10px] font-mono font-bold text-slate-600">
                               <div className="flex flex-col leading-none">
                                 <span className="flex items-center gap-1"><Navigation className="w-2 h-2 text-primary" /> {alert.locationLatitude?.toFixed(4)}</span>
                                 <span className="ml-3">{alert.locationLongitude?.toFixed(4)}</span>
                               </div>
                            </TableCell>
                            <TableCell className="text-xs font-bold">{child?.childName || 'UNKNOWN'}</TableCell>
                            <TableCell><Badge variant={alert.status === 'Child Reunited' ? 'secondary' : 'default'} className="text-[9px] font-black h-5 uppercase tracking-tighter">{alert.status}</Badge></TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={`https://www.google.com/maps?q=${alert.locationLatitude},${alert.locationLongitude}`} target="_blank" rel="noopener noreferrer">
                                  <Map className="w-4 h-4 text-primary" />
                                </a>
                              </Button>
                            </TableCell>
                            <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 text-[10px] font-black">INSPECT</Button></TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Inspection Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className={`shadow-2xl border-2 transition-all duration-500 ${!selectedAlert ? 'opacity-40 grayscale pointer-events-none scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            <CardHeader className="bg-slate-900 text-white rounded-t-lg border-b-4 border-primary p-4">
              <CardTitle className="flex items-center gap-2 text-md"><ShieldAlert className="w-5 h-5 text-primary" />SITUATION REPORT</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {selectedAlert ? (
                <>
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-xl border-2 border-primary overflow-hidden relative shadow-lg bg-slate-100 shrink-0">
                      {relatedChild?.photoUrl ? <Image src={relatedChild.photoUrl} alt={relatedChild.childName} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserCircle className="w-12 h-12 text-slate-300" /></div>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Incident Target</p>
                      <h3 className="text-3xl font-black text-primary tracking-tighter">{selectedAlert.childId}</h3>
                      <Badge className="bg-primary px-3 text-[10px] font-black uppercase tracking-widest shadow-md">{selectedAlert.status}</Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border-2 border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Navigation className="w-3 h-3" /> Live GPS Telemetry</h4>
                      <Button size="sm" variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-primary" asChild>
                        <a href={`https://www.google.com/maps?q=${selectedAlert.locationLatitude},${selectedAlert.locationLongitude}`} target="_blank" rel="noopener noreferrer">
                          Satellite Link <ExternalLink className="w-2 h-2 ml-1" />
                        </a>
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-slate-300 font-bold bg-black/40 p-2 rounded border border-white/5">
                      LOC: {selectedAlert.locationLatitude?.toFixed(6)}, {selectedAlert.locationLongitude?.toFixed(6)}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase italic">Reported: {new Date(selectedAlert.scanTime).toLocaleString()}</p>
                  </div>

                  <div className="p-5 bg-teal-50 border-2 border-teal-100 rounded-2xl space-y-2 shadow-inner">
                    <h4 className="text-[10px] font-black text-teal-900 uppercase tracking-widest flex items-center gap-2"><Phone className="w-3 h-3" /> Secure Contact</h4>
                    <p className="text-lg font-black text-teal-950">{relatedChild?.parentName || 'DATA RESTRICTED'}</p>
                    <p className="text-2xl font-black text-teal-600 tracking-tighter">{relatedChild?.parentMobileNumber || '--- --- ----'}</p>
                  </div>

                  <div className="pt-4 border-t-2 space-y-3">
                    <Button className="w-full h-14 text-lg font-black uppercase tracking-widest bg-teal-600 hover:bg-teal-700 shadow-lg" disabled={selectedAlert.status !== 'Scanned'} onClick={() => notifyParent(selectedAlert.id)}>
                      <Bell className="mr-2 w-5 h-5" /> Notify Parent
                    </Button>
                    <Button className="w-full h-14 text-lg font-black uppercase tracking-widest" variant="outline" disabled={selectedAlert.status !== 'Parent Notified'} onClick={() => resolveRescue(selectedAlert.id)}>
                      <Check className="mr-2 w-6 h-6" /> Reunited & Clear
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-24 text-muted-foreground space-y-4">
                  <div className="bg-slate-100 w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-slate-300"><AlertCircle className="w-8 h-8 opacity-20" /></div>
                  <p className="text-xs font-black uppercase tracking-widest">Monitor Mode Active</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

