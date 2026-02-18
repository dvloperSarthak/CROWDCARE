"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, Send, MapPin, Signal, WifiOff, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [networkMode, setNetworkMode] = useState<'Online' | 'Offline (LoRa)'>('Online');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const db = useFirestore();
  const { user } = useUser();

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Mock some real IDs that might exist in the registry
      const ids = ['C2045', 'C2046', 'C1122', 'C8899'];
      setScannedId(ids[Math.floor(Math.random() * ids.length)]);
      setIsScanning(false);
      toast({
        title: "ID Captured",
        description: "Guardian ID scanned successfully.",
      });
    }, 2000);
  };

  const handleRescue = () => {
    if (!scannedId || !user) {
      if (!user) toast({ title: "Auth Required", description: "You must be signed in.", variant: "destructive" });
      return;
    }

    setIsDispatching(true);

    const alertId = `A-${Date.now()}`;
    const newAlert = {
      id: alertId,
      childId: scannedId,
      volunteerId: user.uid,
      locationLatitude: 28.6139,
      locationLongitude: 77.2090,
      scanTime: new Date().toISOString(),
      status: 'Scanned',
      statusUpdateTime: new Date().toISOString(),
      isDuplicate: false,
    };

    const alertRef = doc(db, 'rescueEvents', alertId);
    setDocumentNonBlocking(alertRef, newAlert, { merge: true });

    // Simulate network delay for better UX feel
    setTimeout(() => {
      setIsDispatching(false);
      setIsSent(true);
      toast({
        title: "Rescue Alert Sent",
        description: networkMode === 'Online' 
          ? "Alert transmitted to central control via GSM." 
          : "Alert transmitted via LoRa mesh network.",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Volunteer App" backHref="/" />
      
      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
        {/* Network Status Toggle */}
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            {networkMode === 'Online' ? (
              <div className="relative">
                <Signal className="w-5 h-5 text-green-500" />
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
              </div>
            ) : (
              <WifiOff className="w-5 h-5 text-primary" />
            )}
            <span className="font-bold text-sm">{networkMode} Mode</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNetworkMode(prev => prev === 'Online' ? 'Offline (LoRa)' : 'Online')} className="text-xs">
            Switch Mode
          </Button>
        </div>

        {!isSent ? (
          <>
            <Card className="border-2 border-dashed border-primary bg-white h-72 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              {isScanning ? (
                <div className="absolute inset-0 bg-primary/5 flex flex-col items-center justify-center">
                  <div className="w-full h-1 bg-primary/50 absolute top-0 shadow-[0_0_15px_rgba(255,119,51,0.8)] animate-scan-line" />
                  <Camera className="w-16 h-16 text-primary animate-pulse" />
                  <p className="font-black text-primary mt-4 tracking-widest uppercase">Analyzing ID...</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-slate-50 p-6 rounded-full inline-block border-2 border-slate-100 mb-2">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-slate-600">Align QR Code in frame</h3>
                  <Button onClick={simulateScan} className="h-12 px-10 text-lg font-bold shadow-lg">
                    Activate Camera
                  </Button>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" /> Scanned Guardian ID
                </label>
                <Input 
                  className="h-16 text-3xl font-black text-center border-2 border-primary bg-white shadow-sm focus:ring-4 focus:ring-primary/10 transition-all" 
                  placeholder="IDXXXX" 
                  value={scannedId}
                  readOnly
                />
              </div>

              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex items-center gap-4">
                <div className="bg-teal-500/10 p-2 rounded-lg">
                  <MapPin className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-teal-800 uppercase tracking-tighter">Verified Dispatch Point</p>
                  <p className="text-sm font-bold text-teal-900">Stadium West Gate - Sector 4</p>
                </div>
              </div>

              <Button 
                onClick={handleRescue}
                disabled={!scannedId || isScanning || isDispatching} 
                className={`w-full h-20 text-2xl font-black uppercase tracking-widest shadow-xl transition-all relative overflow-hidden ${!scannedId ? 'bg-slate-200 text-slate-400' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="mr-2 w-8 h-8 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-3 w-8 h-8" />
                    Rescue Child
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6 py-8">
            <Card className="border-4 border-teal-500 bg-white p-8 text-center space-y-8 shadow-2xl animate-success-pop">
              <div className="relative inline-block mx-auto">
                <CheckCircle2 className="w-24 h-24 text-teal-500" />
                <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-20" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-teal-950 uppercase italic tracking-tighter">Alert Sent</h2>
                <p className="text-teal-700 font-bold text-lg leading-tight">
                  ID <span className="text-teal-950 border-b-2 border-teal-950">{scannedId}</span> has been broadcasted to all units.
                </p>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 text-sm text-teal-800 font-medium">
                  Stay with the child. A supervisor has been dispatched to your GPS location.
                </div>
              </div>
              <Button onClick={() => { setScannedId(''); setIsSent(false); }} variant="outline" className="w-full h-12 border-2 border-teal-500 text-teal-900 font-bold hover:bg-teal-50">
                New Scan Session
              </Button>
            </Card>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 text-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Security Protocol Active | Guardian Node v2.1</p>
      </div>
    </div>
  );
}