
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertCircle, Check, User, Clock, Loader2, Sparkles, ShieldAlert, Phone, Navigation, ExternalLink, LocateFixed, Map as MapIcon, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import Image from 'next/image';

// Dynamically import map to avoid SSR issues with Leaflet
const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-slate-100 flex items-center justify-center border-4 border-dashed border-slate-300 rounded-xl">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  )
});

export default function ControlRoom() {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  
  const alertsRef = useMemoFirebase(() => user ? collection(db, 'rescueEvents') : null, [db, user]);
  const { data: alerts, isLoading: loadingAlerts } = useCollection(alertsRef);
  
  const childrenRef = useMemoFirebase(() => user ? collection(db, 'children') : null, [db, user]);
  const { data: children } = useCollection(childrenRef);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const selectedAlert = alerts?.find(a => a.id === selectedAlertId) || null;
  const relatedChild = children?.find(c => c.id === selectedAlert?.childId) || null;

  // Request Notification Permissions on Mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setNotificationPermission);
      }
    }
  }, []);

  // Real-time toast and Background Notification for new alerts
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latest = [...alerts].sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())[0];
      const isRecent = (Date.now() - new Date(latest.scanTime).getTime() < 8000);
      
      if (latest.status === 'Scanned' && isRecent) {
        toast({
          title: "SITREP: NEW ALERT",
          description: `ID ${latest.childId} detected. Live tracking established.`,
          className: "bg-primary text-white font-black"
        });

        // Trigger Native Browser Notification (works even if tab is in background)
        if (notificationPermission === 'granted') {
          new Notification("Guardian Alert: Child Located", {
            body: `Incident ${latest.id} (Child ${latest.childId}) is active. Tracking established.`,
            icon: '/favicon.ico',
            tag: latest.id // Prevent duplicate notifications for same event
          });
        }
      }
    }
  }, [alerts, notificationPermission, toast]);

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlertId(alertId);
    const alert = alerts?.find(a => a.id === alertId);
    if (alert) {
      setMapCenter([alert.locationLatitude, alert.locationLongitude]);
      if (alert.isDuplicate === undefined || alert.isDuplicate === false) {
        checkDuplicate(alert);
      }
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
        const alertRef = doc(db, 'rescueEvents', newAlert.id);
        updateDocumentNonBlocking(alertRef, { isDuplicate: true, notes: result.reason, statusUpdateTime: new Date().toISOString() });
      }
    } catch (err) {
      // Silent fail for duplicate detection to keep UI clean
    }
  };

  const notifyParent = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    const alertData = alerts?.find(a => a.id === alertId);
    const childData = children?.find(c => c.id === alertData?.childId);

    // 1. Update primary alert status
    updateDocumentNonBlocking(alertRef, { status: 'Parent Notified', statusUpdateTime: new Date().toISOString() });
    
    // 2. Log formal notification in subcollection (as per backend.json schema)
    const logId = `LOG-${Date.now()}`;
    const logRef = doc(db, 'rescueEvents', alertId, 'notificationLogs', logId);
    setDocumentNonBlocking(logRef, {
      id: logId,
      rescueEventId: alertId,
      recipientMobileNumber: childData?.parentMobileNumber || 'N/A',
      notificationType: 'Push Notification',
      messageBody: `Guardian Alert: ${childData?.childName || 'Your child'} has been located. Please proceed to the nearest Hub.`,
      sentTime: new Date().toISOString(),
      deliveryStatus: 'Sent'
    }, { merge: true });

    toast({ title: "DISPATCH COMPLETE", description: "Parent notified via Guardian Network." });
  };

  const resolveRescue = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    updateDocumentNonBlocking(alertRef, { status: 'Child Reunited', resolvedTime: new Date().toISOString(), statusUpdateTime: new Date().toISOString() });
    toast({ title: "MISSION RESOLVED", description: "Child cleared from active SITREP." });
    setSelectedAlertId(null);
  };

  const activeAlerts = alerts?.filter(a => a.status !== 'Child Reunited') || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Guardian Tactical Dashboard" backHref="/" />
      
      <main className="container-fluid py-6 px-6 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Tactical Map - Realtime Tracking View */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-2xl border-4 border-slate-900 h-[500px] overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-4 flex flex-row items-center justify-between border-b-4 border-primary">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-primary" />
                <CardTitle className="text-md uppercase font-black tracking-widest">Tactical Field View</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {notificationPermission !== 'granted' && (
                   <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 gap-1.5" onClick={() => Notification.requestPermission()}>
                      <BellRing className="w-3 h-3" /> Enable Alerts
                   </Button>
                )}
                <Badge variant="outline" className="animate-pulse bg-primary/10 border-primary text-primary px-3 text-[9px] font-black uppercase">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2" /> Live GPS Stream
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full relative">
              <TacticalMap 
                alerts={alerts || []} 
                center={mapCenter} 
                onMarkerClick={handleSelectAlert} 
              />
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Incident Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-black text-[10px] uppercase">Incident</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Telemetry</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase">Ops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAlerts ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12"><Loader2 className="animate-spin inline mr-2" /> Syncing...</TableCell></TableRow>
                  ) : activeAlerts.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic font-medium tracking-widest text-xs uppercase">All zones clear</TableCell></TableRow>
                  ) : (
                    activeAlerts.map((alert) => (
                      <TableRow key={alert.id} className={`cursor-pointer ${selectedAlertId === alert.id ? 'bg-primary/10' : ''}`} onClick={() => handleSelectAlert(alert.id)}>
                        <TableCell className="font-black text-primary">{alert.childId}</TableCell>
                        <TableCell className="font-mono text-[10px] font-bold">
                          {alert.locationLatitude.toFixed(6)}, {alert.locationLongitude.toFixed(6)}
                        </TableCell>
                        <TableCell><Badge className="text-[9px] font-black uppercase">{alert.status}</Badge></TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase">Track</Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Side Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className={`shadow-2xl border-4 transition-all duration-500 ${!selectedAlert ? 'opacity-40 grayscale pointer-events-none scale-95 origin-top' : 'opacity-100 scale-100'}`}>
            <CardHeader className="bg-slate-900 text-white rounded-t-lg border-b-4 border-primary p-4">
              <CardTitle className="flex items-center gap-2 text-md uppercase font-black tracking-tight"><ShieldAlert className="w-5 h-5 text-primary" />SITREP Detail</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {selectedAlert ? (
                <>
                  <div className="flex gap-4 items-start">
                    <div className="w-24 h-24 rounded-xl border-4 border-primary overflow-hidden relative shadow-lg bg-slate-100 shrink-0">
                      {relatedChild?.photoUrl ? <Image src={relatedChild.photoUrl} alt={relatedChild.childName} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User className="w-12 h-12" /></div>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Incident Target</p>
                      <h3 className="text-2xl font-black text-primary tracking-tighter">{selectedAlert.childId}</h3>
                      <p className="font-black text-slate-900 text-sm uppercase">{relatedChild?.childName || 'Identity Check Required'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border-2 border-primary/20 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Navigation className="w-3 h-3 animate-pulse" /> Live Telemetry</h4>
                      <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase bg-transparent border-primary/40 text-primary" asChild>
                        <a href={`https://www.google.com/maps?q=${selectedAlert.locationLatitude},${selectedAlert.locationLongitude}`} target="_blank" rel="noopener noreferrer">Satellite View</a>
                      </Button>
                    </div>
                    <div className="font-mono text-xs text-slate-300 font-bold bg-black/40 p-3 rounded border border-white/5 flex items-center justify-between">
                      <span>{selectedAlert.locationLatitude.toFixed(8)}<br/>{selectedAlert.locationLongitude.toFixed(8)}</span>
                      <LocateFixed className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50 border-2 border-teal-100 rounded-xl space-y-1">
                    <h4 className="text-[9px] font-black text-teal-900 uppercase tracking-widest flex items-center gap-2"><Phone className="w-3 h-3" /> Contact Command</h4>
                    <p className="font-black text-teal-950 text-md uppercase leading-tight">{relatedChild?.parentName || 'DATA RESTRICTED'}</p>
                    <p className="text-xl font-black text-teal-600 tracking-tighter">{relatedChild?.parentMobileNumber || '--- --- ----'}</p>
                  </div>

                  <div className="pt-4 border-t-2 space-y-3">
                    <Button className="w-full h-14 text-lg font-black uppercase tracking-widest bg-teal-600 hover:bg-teal-700 shadow-lg" disabled={selectedAlert.status !== 'Scanned'} onClick={() => notifyParent(selectedAlert.id)}>
                      Notify Parent
                    </Button>
                    <Button className="w-full h-14 text-lg font-black uppercase tracking-widest" variant="outline" disabled={selectedAlert.status !== 'Parent Notified'} onClick={() => resolveRescue(selectedAlert.id)}>
                      Resolve & Clear
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-24 text-muted-foreground space-y-4">
                  <div className="bg-slate-100 w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-slate-300"><AlertCircle className="w-8 h-8 opacity-20" /></div>
                  <p className="text-xs font-black uppercase tracking-widest">Select Incident to Track</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
