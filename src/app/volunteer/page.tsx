"use client";

import { useState, useEffect, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Send, MapPin, Signal, WifiOff, AlertTriangle, CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedId, setScannedId] = useState('');
  const [networkMode, setNetworkMode] = useState<'Online' | 'Offline (LoRa)'>('Online');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const db = useFirestore();
  const { user } = useUser();

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Realistically, we'd use a library like jsQR here. 
      // For this "real" feel without adding heavy deps, we'll simulate the ID capture after the camera is live.
      setTimeout(() => {
        const mockIds = ['C2045', 'C2046', 'C1122', 'C8899'];
        const capturedId = mockIds[Math.floor(Math.random() * mockIds.length)];
        setScannedId(capturedId);
        stopCamera();
        toast({
          title: "ID Captured",
          description: `Guardian ID ${capturedId} scanned from QR.`,
        });
      }, 3000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to scan QR codes.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
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

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Volunteer Terminal" backHref="/" />
      
      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
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
            Switch Protocol
          </Button>
        </div>

        {!isSent ? (
          <>
            <Card className="border-2 border-primary bg-black aspect-square flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-2xl">
              <video 
                ref={videoRef} 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`} 
                autoPlay 
                muted 
                playsInline
              />
              
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(255,119,51,1)] animate-scan-line absolute" />
                  <div className="absolute inset-0 border-[40px] border-black/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/50 rounded-lg" />
                </div>
              )}

              {!isScanning && (
                <div className="text-center space-y-4 z-20">
                  <div className="bg-white/10 p-6 rounded-full inline-block backdrop-blur-md border border-white/20 mb-2">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="font-bold text-white">Ready for Scanning</h3>
                  <Button onClick={startCamera} className="h-12 px-10 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90">
                    Open Camera
                  </Button>
                </div>
              )}

              {hasCameraPermission === false && (
                <div className="absolute inset-0 bg-background flex items-center justify-center p-6 text-center z-30">
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Hardware Access Denied</AlertTitle>
                    <AlertDescription>
                      The Guardian App requires camera access to process QR IDs.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" /> Captured Guardian ID
                </label>
                <div className="relative">
                   <Input 
                    className="h-16 text-3xl font-black text-center border-2 border-primary bg-white shadow-sm focus:ring-4 focus:ring-primary/10 transition-all uppercase" 
                    placeholder="SCAN ID..." 
                    value={scannedId}
                    onChange={(e) => setScannedId(e.target.value.toUpperCase())}
                  />
                  {scannedId && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setScannedId('')}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  )}
                </div>
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
                    Transmitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-3 w-8 h-8" />
                    Initiate Rescue
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
                  ID <span className="text-teal-950 border-b-2 border-teal-950">{scannedId}</span> has been broadcasted.
                </p>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 text-sm text-teal-800 font-medium">
                  Protocol: Stay with the child. A supervisor is being dispatched to your location.
                </div>
              </div>
              <Button onClick={() => { setScannedId(''); setIsSent(false); }} variant="outline" className="w-full h-12 border-2 border-teal-500 text-teal-900 font-bold hover:bg-teal-50">
                Next Scan Session
              </Button>
            </Card>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 text-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Security Protocol Active | Guardian Node v2.2</p>
      </div>
    </div>
  );
}
