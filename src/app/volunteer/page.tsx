
"use client";

import { useState, useEffect, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Send, MapPin, Signal, WifiOff, AlertTriangle, CheckCircle2, Loader2, Sparkles, XCircle, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import jsQR from 'jsqr';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedId, setScannedId] = useState('');
  const [networkMode, setNetworkMode] = useState<'Online' | 'Offline (LoRa)'>('Online');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  
  const db = useFirestore();
  const { user } = useUser();

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions to scan QR IDs.',
      });
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScannedId(code.data);
            stopCamera();
            toast({
              title: "ID Captured",
              description: `Guardian ID ${code.data} verified.`,
            });
            return;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              setScannedId(code.data);
              toast({
                title: "File Processed",
                description: `ID ${code.data} extracted from image.`,
              });
            } else {
              toast({
                variant: "destructive",
                title: "Scan Failed",
                description: "No Guardian QR ID found in the uploaded image.",
              });
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
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
      locationLatitude: 28.6139, // Static simulation for prototype
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
        description: "Alert transmitted to central control hub.",
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
            <Signal className="w-5 h-5 text-green-500 animate-pulse" />
            <span className="font-bold text-sm">Real-time Protocol</span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-black uppercase">v2.5 Live</Badge>
        </div>

        {!isSent ? (
          <>
            <Card className="border-4 border-primary bg-black aspect-square flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-2xl">
              <video 
                ref={videoRef} 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`} 
                autoPlay 
                muted 
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(255,119,51,1)] animate-scan-line absolute" />
                  <div className="absolute inset-0 border-[40px] border-black/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/50 rounded-lg" />
                </div>
              )}

              {!isScanning && (
                <div className="text-center space-y-6 z-20 px-6">
                  <div className="bg-white/10 p-6 rounded-full inline-block backdrop-blur-md border border-white/20">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-4">
                    <Button onClick={startCamera} className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-lg bg-primary hover:bg-primary/90">
                      Live Camera
                    </Button>
                    <div className="flex items-center gap-3">
                      <hr className="flex-1 border-white/20" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">or</span>
                      <hr className="flex-1 border-white/20" />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 border-2 border-white/20 text-white hover:bg-white/10 font-bold uppercase"
                    >
                      <ImagePlus className="mr-2 w-4 h-4" /> Scan from File
                    </Button>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload} 
              />
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-primary" /> Active Guardian ID
                </label>
                <div className="relative">
                   <Input 
                    className="h-16 text-3xl font-black text-center border-2 border-primary bg-white shadow-sm uppercase tracking-tighter" 
                    placeholder="WAITING FOR SCAN..." 
                    value={scannedId}
                    readOnly
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

              <Button 
                onClick={handleRescue}
                disabled={!scannedId || isScanning || isDispatching} 
                className={`w-full h-20 text-2xl font-black uppercase tracking-widest shadow-xl transition-all ${!scannedId ? 'bg-slate-200 text-slate-400' : 'bg-primary hover:bg-primary/90 animate-pulse'}`}
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
              <CheckCircle2 className="w-24 h-24 text-teal-500 mx-auto" />
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-teal-950 uppercase italic tracking-tighter">Alert Sent</h2>
                <p className="text-teal-700 font-bold text-lg leading-tight">
                  ID <span className="text-teal-950 border-b-2 border-teal-950">{scannedId}</span> broadcasted.
                </p>
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 text-xs text-teal-800 font-black uppercase tracking-widest">
                  Stay with child. Ops dispatching.
                </div>
              </div>
              <Button onClick={() => { setScannedId(''); setIsSent(false); }} variant="outline" className="w-full h-12 border-2 border-teal-500 text-teal-900 font-bold hover:bg-teal-50">
                Next Session
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className}`}>{children}</div>;
}
