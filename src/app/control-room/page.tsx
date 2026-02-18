"use client";

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DataStore } from '@/lib/store';
import { RescueAlert, Child } from '@/lib/types';
import { AlertCircle, Map, Bell, Check, User, Phone, ShieldAlert, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectDuplicateRescueAlert } from '@/ai/flows/duplicate-rescue-detection-flow';

export default function ControlRoom() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<RescueAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<RescueAlert | null>(null);
  const [relatedChild, setRelatedChild] = useState<Child | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts([...DataStore.getAlerts()]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAlert = (alert: RescueAlert) => {
    setSelectedAlert(alert);
    setRelatedChild(DataStore.getChildById(alert.childId) || null);
    
    // Auto-check for duplicates if not already checked
    if (alert.isDuplicate === undefined) {
      checkDuplicate(alert);
    }
  };

  const checkDuplicate = async (newAlert: RescueAlert) => {
    try {
      const recentAlerts = alerts
        .filter(a => a.alertId !== newAlert.alertId)
        .map(a => ({
          alertId: a.alertId,
          childId: a.childId,
          location: a.location,
          timestamp: a.timestamp
        }));

      const result = await detectDuplicateRescueAlert({
        childId: newAlert.childId,
        location: newAlert.location,
        timestamp: newAlert.timestamp,
        recentAlerts
      });

      if (result.isDuplicate) {
        toast({
          title: "AI Detection",
          description: `Duplicate detected: ${result.reason}`,
          variant: "destructive"
        });
        // Update local state and store
        setAlerts(prev => prev.map(a => a.alertId === newAlert.alertId ? { ...a, isDuplicate: true, duplicateReason: result.reason } : a));
      } else {
        setAlerts(prev => prev.map(a => a.alertId === newAlert.alertId ? { ...a, isDuplicate: false } : a));
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }
  };

  const notifyParent = (alertId: string) => {
    DataStore.updateAlertStatus(alertId, 'Parent Notified');
    toast({
      title: "Notification Sent",
      description: "SMS alert and Push notification sent to parent's device.",
    });
    setAlerts([...DataStore.getAlerts()]);
  };

  const resolveRescue = (alertId: string) => {
    DataStore.updateAlertStatus(alertId, 'Child Reunited');
    toast({
      title: "Rescue Resolved",
      description: "Status updated to Child Reunited.",
    });
    setAlerts([...DataStore.getAlerts()]);
    setSelectedAlert(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Central Control Dashboard" backHref="/" />
      
      <main className="container-fluid py-6 px-6 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Statistics Bar */}
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-primary p-2 rounded-lg"><AlertCircle className="text-white h-6 w-6" /></div>
              <div><p className="text-xs font-bold uppercase text-muted-foreground">Active Alerts</p><p className="text-2xl font-black">{alerts.filter(a => a.status !== 'Child Reunited').length}</p></div>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-teal-500 p-2 rounded-lg"><Check className="text-white h-6 w-6" /></div>
              <div><p className="text-xs font-bold uppercase text-muted-foreground">Reunited</p><p className="text-2xl font-black">{alerts.filter(a => a.status === 'Child Reunited').length}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-slate-200 p-2 rounded-lg"><User className="text-slate-700 h-6 w-6" /></div>
              <div><p className="text-xs font-bold uppercase text-muted-foreground">Registered</p><p className="text-2xl font-black">{DataStore.getChildren().length}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-slate-200 p-2 rounded-lg"><Clock className="text-slate-700 h-6 w-6" /></div>
              <div><p className="text-xs font-bold uppercase text-muted-foreground">Avg. Response</p><p className="text-2xl font-black">4.2m</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Live Alerts Table */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader className="border-b bg-slate-50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Live Rescue Feed</CardTitle>
                  <CardDescription>Real-time incoming alerts from volunteers.</CardDescription>
                </div>
                <Badge variant="outline" className="animate-pulse flex gap-1 items-center border-primary text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary" /> LIVE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Tag</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No active rescue alerts currently.</TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow 
                        key={alert.alertId} 
                        className={`cursor-pointer transition-colors ${selectedAlert?.alertId === alert.alertId ? 'bg-primary/10' : ''}`}
                        onClick={() => handleSelectAlert(alert)}
                      >
                        <TableCell className="font-bold">{alert.childId}</TableCell>
                        <TableCell className="flex items-center gap-1"><Map className="w-3 h-3 text-muted-foreground" /> {alert.location}</TableCell>
                        <TableCell>{new Date(alert.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant={alert.status === 'Child Reunited' ? 'secondary' : 'default'} className={alert.status === 'Scanned' ? 'rescue-pulse bg-primary' : ''}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.isDuplicate === true && <Badge variant="destructive" className="bg-red-500 text-[10px]">POTENTIAL DUPLICATE</Badge>}
                          {alert.isDuplicate === false && <Badge variant="outline" className="text-teal-600 border-teal-600 text-[10px]">VERIFIED UNIQUE</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSelectAlert(alert); }}>View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Inspection Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className={`shadow-xl border-2 transition-opacity ${!selectedAlert ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
            <CardHeader className="bg-slate-900 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Alert Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {selectedAlert ? (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Target ID</p>
                        <h3 className="text-3xl font-black text-primary">{selectedAlert.childId}</h3>
                      </div>
                      <Badge className="bg-primary h-8 px-4 text-sm uppercase">{selectedAlert.status}</Badge>
                    </div>

                    {alert.isDuplicate && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-xs text-red-800 font-medium">AI Flagged Duplicate: {selectedAlert.duplicateReason}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Child Name</p>
                        <p className="font-bold truncate">{relatedChild?.name || 'Loading...'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Registered At</p>
                        <p className="font-bold truncate">{relatedChild ? new Date(relatedChild.registeredAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                         <h4 className="text-xs font-bold text-teal-900 uppercase tracking-tighter">Parent Information</h4>
                         <Phone className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-teal-900">{relatedChild?.parentName || 'Unknown'}</p>
                        <p className="text-lg font-bold text-teal-700">{relatedChild?.parentPhone || 'No contact info'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <Button 
                      className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700"
                      disabled={selectedAlert.status !== 'Scanned'}
                      onClick={() => notifyParent(selectedAlert.alertId)}
                    >
                      <Bell className="mr-2 w-5 h-5" /> Notify Parent
                    </Button>
                    <Button 
                      className="w-full h-12 text-lg"
                      variant="outline"
                      disabled={selectedAlert.status !== 'Parent Notified'}
                      onClick={() => resolveRescue(selectedAlert.alertId)}
                    >
                      <Check className="mr-2 w-5 h-5" /> Resolve & Close Alert
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  Select an alert from the feed to view full details and contact parent.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map View Simulation */}
          <Card className="h-48 overflow-hidden relative group">
            <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
              <Map className="w-12 h-12 text-slate-400" />
              <p className="absolute bottom-2 text-xs font-bold text-slate-500">DYNAMIC EVENT MAP SIMULATION</p>
              {selectedAlert && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <div className="bg-primary w-4 h-4 rounded-full rescue-pulse border-2 border-white shadow-lg" />
                </div>
              )}
            </div>
            <div className="absolute top-2 right-2 flex flex-col gap-1">
               <Badge className="bg-black/60 backdrop-blur-sm text-[8px]">ZOOM: 18x</Badge>
               <Badge className="bg-black/60 backdrop-blur-sm text-[8px]">GRID: STADIUM_WEST</Badge>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}