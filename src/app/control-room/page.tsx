"use client";

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertCircle, Map, Bell, Check, User, Phone, ShieldAlert, Clock, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function ControlRoom() {
  const { toast } = useToast();
  const db = useFirestore();
  
  // Real-time feeds
  const alertsRef = useMemoFirebase(() => collection(db, 'rescueEvents'), [db]);
  const { data: alerts, isLoading: loadingAlerts } = useCollection(alertsRef);
  
  const childrenRef = useMemoFirebase(() => collection(db, 'children'), [db]);
  const { data: children } = useCollection(childrenRef);

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [prevAlertsCount, setPrevAlertsCount] = useState(0);

  const selectedAlert = alerts?.find(a => a.id === selectedAlertId) || null;
  const relatedChild = children?.find(c => c.id === selectedAlert?.childId) || null;

  // Track new alerts to show visual notification
  useEffect(() => {
    if (alerts && alerts.length > prevAlertsCount) {
      if (prevAlertsCount > 0) {
        const newest = alerts[alerts.length - 1];
        toast({
          title: "NEW ALERT RECEIVED",
          description: `Child ID ${newest.childId} detected in Stadium West.`,
          variant: "default",
          className: "bg-primary text-white border-none shadow-2xl animate-bounce"
        });
      }
      setPrevAlertsCount(alerts.length);
    }
  }, [alerts, prevAlertsCount, toast]);

  const handleSelectAlert = (alert: any) => {
    setSelectedAlertId(alert.id);
    
    // Auto-check for duplicates if not already checked or if specifically requested
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
        toast({
          title: "AI Detection Warning",
          description: `Potential duplicate identified: ${result.reason}`,
          variant: "destructive"
        });
        
        const alertRef = doc(db, 'rescueEvents', newAlert.id);
        updateDocumentNonBlocking(alertRef, { 
          isDuplicate: true, 
          notes: result.reason,
          statusUpdateTime: new Date().toISOString() 
        });
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }
  };

  const notifyParent = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    updateDocumentNonBlocking(alertRef, { 
      status: 'Parent Notified',
      statusUpdateTime: new Date().toISOString()
    });
    
    toast({
      title: "Notification Sent",
      description: "SMS and Push dispatch complete. Confirmation received.",
      variant: "secondary"
    });
  };

  const resolveRescue = (alertId: string) => {
    const alertRef = doc(db, 'rescueEvents', alertId);
    updateDocumentNonBlocking(alertRef, { 
      status: 'Child Reunited',
      resolvedTime: new Date().toISOString(),
      statusUpdateTime: new Date().toISOString()
    });
    
    toast({
      title: "Mission Resolved",
      description: "Alert cleared. Family reunited.",
    });
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
                  <div>
                    <CardTitle className="text-lg">Live Rescue Feed</CardTitle>
                    <CardDescription className="text-xs">Real-time field intelligence</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="animate-pulse flex gap-1 items-center border-primary text-primary px-3 bg-primary/5">
                  <div className="w-2 h-2 rounded-full bg-primary" /> SECURE LIVE FEED
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAlerts ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Decrypting field signals...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableHead className="w-24 font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Location</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest">AI Audit</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Ops</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!alerts || alerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground font-medium">No active field alerts currently. Monitor standing by.</TableCell>
                      </TableRow>
                    ) : (
                      [...alerts].reverse().map((alert) => (
                        <TableRow 
                          key={alert.id} 
                          className={`cursor-pointer transition-all duration-300 animate-entrance ${selectedAlertId === alert.id ? 'bg-primary/10' : ''}`}
                          onClick={() => handleSelectAlert(alert)}
                        >
                          <TableCell className="font-black text-primary">{alert.childId}</TableCell>
                          <TableCell className="flex items-center gap-2 text-xs font-bold text-slate-600">
                             <Map className="w-3 h-3 text-primary" /> Sector 4 Gateway
                          </TableCell>
                          <TableCell className="font-medium text-xs text-slate-500">{new Date(alert.scanTime).toLocaleTimeString()}</TableCell>
                          <TableCell>
                            <Badge variant={alert.status === 'Child Reunited' ? 'secondary' : 'default'} className={`text-[10px] font-black h-5 uppercase tracking-tighter ${alert.status === 'Scanned' ? 'rescue-pulse bg-primary' : ''}`}>
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.isDuplicate === true && <Badge variant="destructive" className="bg-red-500 text-[9px] font-black h-5">DUPLICATE ALERT</Badge>}
                            {alert.isDuplicate === false && <Badge variant="outline" className="text-teal-600 border-teal-600 text-[9px] font-black h-5">UNIQUE INCIDENT</Badge>}
                            {alert.isDuplicate === undefined && <span className="text-[9px] text-slate-400 font-bold italic">Analyzing...</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-8 text-xs font-black" onClick={(e) => { e.stopPropagation(); handleSelectAlert(alert); }}>INSPECT</Button>
                          </TableCell>
                        </TableRow>
                      ))
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
            <CardHeader className="bg-slate-900 text-white rounded-t-lg border-b-4 border-primary">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="w-5 h-5 text-primary" />
                SITUATION REPORT
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {selectedAlert ? (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Incident Target</p>
                        <h3 className="text-4xl font-black text-primary tracking-tighter">{selectedAlert.childId}</h3>
                      </div>
                      <Badge className="bg-primary h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-md">{selectedAlert.status}</Badge>
                    </div>

                    {selectedAlert.isDuplicate && (
                      <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex gap-3 animate-pulse">
                        <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                        <div>
                           <p className="text-[10px] font-black text-red-900 uppercase">AI Intelligence Warning</p>
                           <p className="text-xs text-red-800 font-bold leading-tight">{selectedAlert.notes}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Identity</p>
                        <p className="font-black text-sm text-slate-900 truncate">{relatedChild?.childName || 'PENDING...'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Time In</p>
                        <p className="font-black text-sm text-slate-900 truncate">{new Date(selectedAlert.scanTime).toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-teal-50 border-2 border-teal-100 rounded-2xl space-y-4 shadow-inner">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black text-teal-900 uppercase tracking-widest flex items-center gap-2">
                           <Phone className="w-3 h-3" /> Secure Contact
                         </h4>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-teal-700 uppercase tracking-tighter">Parent/Guardian</p>
                        <p className="text-lg font-black text-teal-950">{relatedChild?.parentName || 'DATA RESTRICTED'}</p>
                        <p className="text-2xl font-black text-teal-600 tracking-tighter">{relatedChild?.parentMobileNumber || '--- --- ----'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 space-y-3">
                    <Button 
                      className="w-full h-14 text-lg font-black uppercase tracking-widest bg-teal-600 hover:bg-teal-700 shadow-lg group"
                      disabled={selectedAlert.status !== 'Scanned'}
                      onClick={() => notifyParent(selectedAlert.id)}
                    >
                      <Bell className="mr-2 w-5 h-5 group-hover:animate-ring" /> Notify Parent
                    </Button>
                    <Button 
                      className="w-full h-14 text-lg font-black uppercase tracking-widest"
                      variant="outline"
                      disabled={selectedAlert.status !== 'Parent Notified'}
                      onClick={() => resolveRescue(selectedAlert.id)}
                    >
                      <Check className="mr-2 w-6 h-6" /> Reunited & Clear
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-24 text-muted-foreground space-y-4">
                  <div className="bg-slate-100 w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 border-dashed border-slate-300">
                    <AlertCircle className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Monitor Mode Active</p>
                  <p className="text-xs font-medium px-8">Select a field event from the live feed to initiate resolution protocols.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map View Simulation */}
          <Card className="h-56 overflow-hidden relative border-2 shadow-inner group">
            <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
              <Map className="w-16 h-16 text-slate-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-300/50 to-transparent pointer-events-none" />
              <p className="absolute bottom-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Guardian Dynamic Grid Map</p>
              
              {selectedAlert && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <div className="bg-primary w-6 h-6 rounded-full animate-ping opacity-40" />
                   <div className="bg-primary w-4 h-4 rounded-full border-2 border-white shadow-xl relative z-10" />
                </div>
              )}
            </div>
            <div className="absolute top-3 left-3 flex flex-col gap-1">
               <Badge className="bg-black/80 backdrop-blur-md text-[8px] font-black h-5 border-none">SAT_LINK: ONLINE</Badge>
               <Badge className="bg-black/80 backdrop-blur-md text-[8px] font-black h-5 border-none">GRID: STADIUM_WEST_4</Badge>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}