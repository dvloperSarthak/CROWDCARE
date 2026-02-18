"use client";

import { useState } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Camera, Send, MapPin, Signal, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataStore } from '@/lib/store';
import { RescueAlert } from '@/lib/types';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [networkMode, setNetworkMode] = useState<'Online' | 'Offline (LoRa)'>('Online');
  const [isSent, setIsSent] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const ids = ['C2045', 'C2046'];
      setScannedId(ids[Math.floor(Math.random() * ids.length)]);
      setIsScanning(false);
      toast({
        title: "ID Captured",
        description: "Guardian ID scanned successfully.",
      });
    }, 1500);
  };

  const handleRescue = () => {
    if (!scannedId) return;

    const alert: RescueAlert = {
      alertId: `A-${Date.now()}`,
      childId: scannedId,
      location: "28.6139, 77.2090", // Simulated location
      timestamp: new Date().toISOString(),
      status: 'Scanned',
    };

    // Simulate sending
    setTimeout(() => {
      DataStore.addAlert(alert);
      setIsSent(true);
      toast({
        title: "Rescue Alert Sent",
        description: networkMode === 'Online' 
          ? "Alert transmitted to central control via GSM." 
          : "Alert transmitted via LoRa mesh network.",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Volunteer App" backHref="/" />
      
      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
        {/* Network Status Toggle */}
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            {networkMode === 'Online' ? <Signal className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-primary" />}
            <span className="font-bold text-sm">{networkMode} Mode</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNetworkMode(prev => prev === 'Online' ? 'Offline (LoRa)' : 'Online')} className="text-xs">
            Switch Mode
          </Button>
        </div>

        {!isSent ? (
          <>
            <Card className="border-2 border-dashed border-primary bg-white/50 h-64 flex flex-col items-center justify-center relative overflow-hidden">
              {isScanning ? (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="w-full h-1 bg-primary animate-[bounce_1.5s_infinite]" />
                  <p className="font-bold text-primary">Scanning...</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                  <Button onClick={simulateScan} className="h-12 px-8 text-lg font-bold">
                    Start Scan
                  </Button>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Manual Entry / Scanned ID</label>
                <Input 
                  className="h-14 text-2xl font-black text-center border-2 border-primary" 
                  placeholder="e.g. C2045" 
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                />
              </div>

              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex items-center gap-4">
                <MapPin className="w-8 h-8 text-teal-600" />
                <div>
                  <p className="text-xs font-bold text-teal-800 uppercase">Current GPS Location</p>
                  <p className="text-sm font-medium">28.6139° N, 77.2090° E (Stadium West Gate)</p>
                </div>
              </div>

              <Button 
                onClick={handleRescue}
                disabled={!scannedId || isScanning} 
                className={`w-full h-20 text-2xl font-black uppercase tracking-widest shadow-xl transition-all ${!scannedId ? 'bg-muted' : 'bg-primary hover:bg-primary/90'}`}
              >
                <AlertTriangle className="mr-2 w-8 h-8" />
                Rescue Child
              </Button>
            </div>
          </>
        ) : (
          <Card className="border-2 border-teal-500 bg-teal-50 py-12 text-center space-y-6">
            <CheckCircle2 className="w-20 h-20 mx-auto text-teal-600 animate-in zoom-in" />
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-teal-900">RESCUE DISPATCHED</h2>
              <p className="text-teal-700 px-6 font-medium">Alert for {scannedId} has been sent to Control Room. Stay with the child until help arrives.</p>
            </div>
            <Button onClick={() => { setScannedId(''); setIsSent(false); }} variant="outline" className="border-teal-500 text-teal-900">
              Scan Another Child
            </Button>
          </Card>
        )}
      </main>

      {/* Footer Instructions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 text-center">
        <p className="text-xs font-bold text-muted-foreground uppercase">Volunteer ID: VOL-882 | Sector 4 Marshall</p>
      </div>
    </div>
  );
}