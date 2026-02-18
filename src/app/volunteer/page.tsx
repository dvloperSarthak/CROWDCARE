
"use client";

import { useState, useEffect, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  MapPin, 
  Signal, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  XCircle, 
  ImagePlus, 
  UserCircle,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import jsQR from 'jsqr';
import Image from 'next/image';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  
  const db = useFirestore();
  const { user } = useUser();

  // Real-time lookup for scanned child details
  const childRef = useMemoFirebase(() => scannedId ? doc(db, 'children', scannedId) : null, [db, scannedId]);
  const { data: childData, isLoading: isLoadingChild } = useDoc(childRef);

  const startCamera = async () => {
    setIsScanning(true);
    setScannedId('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
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
              title: "Guardian ID Captured",
              description: `Target ${code.data} identified.`,
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
        const img = new window.Image();
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
      if (!user) toast({ title: "Auth Required", description: "Protocol requires node sign-in.", variant: "destructive" });
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
        title: "Alert Broadcasted",
        description: "Control Room has received the sitrep.",
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
            <span className="font-bold text-xs uppercase tracking-widest text-slate-600">Field Protocol Active</span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-black uppercase">Guardian v2.5</Badge>
        </div>

        {!isSent ? (
          <>
            <Card className="border-4 border-slate-900 bg-black aspect-square flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-3xl group">
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
                  <div className="w-full h-1 bg-primary shadow-[0_0_20px_rgba(255,119,51,1)] animate-scan-line absolute" />
                  <div className="absolute inset-0 border-[40px] border-black/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-primary/40 rounded-2xl" />
                </div>
              )}

              {!isScanning && (
                <div className="text-center space-y-6 z-20 px-6">
                  <div className="bg-white/10 p-6 rounded-full inline-block backdrop-blur-xl border border-white/20 shadow-2xl">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-4">
                    <Button onClick={startCamera} className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl bg-primary hover:bg-primary/90 transition-transform active:scale-95">
                      Launch Scanner
                    </Button>
                    <div className="flex items-center gap-3">
                      <hr className="flex-1 border-white/20" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">or</span>
                      <hr className="flex-1 border-white/20" />
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[10px]"
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
              {scannedId && (
                <div className="animate-entrance space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl space-y-4 border-b-4 border-primary">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border-2 border-primary bg-slate-800 relative overflow-hidden flex-shrink-0 shadow-lg">
                        {isLoadingChild ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : childData?.photoUrl ? (
                          <Image src={childData.photoUrl} alt={childData.childName} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserCircle className="w-10 h-10 text-slate-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Protocol Verified</p>
                          <Badge className="bg-primary/20 text-primary border-primary/20 h-5 text-[9px] font-black">{scannedId}</Badge>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight truncate">
                          {isLoadingChild ? 'Checking Registry...' : (childData?.childName || 'Identity Unknown')}
                        </h3>
                        {!isLoadingChild && !childData && (
                          <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Unregistered ID in Grid
                          </p>
                        )}
                        {childData && (
                          <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Secure Node Match
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleRescue}
                    disabled={isDispatching} 
                    className="w-full h-20 text-2xl font-black uppercase tracking-widest shadow-2xl bg-primary hover:bg-primary/90 animate-pulse active:animate-none group"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="mr-3 w-8 h-8 animate-spin" />
                        Broadcasting...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mr-3 w-8 h-8 group-hover:scale-110 transition-transform" />
                        Initiate Rescue
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!scannedId && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Standby for Field ID</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6 py-8">
            <Card className="border-4 border-teal-500 bg-white p-8 text-center space-y-8 shadow-2xl animate-success-pop rounded-3xl">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-20" />
                <CheckCircle2 className="w-24 h-24 text-teal-500 relative z-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Mission Live</h2>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Protocol ID</p>
                  <p className="text-2xl font-black text-primary italic tracking-tight">{scannedId}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 text-xs text-teal-800 font-bold leading-tight">
                  SITREP transmitted. Control Room has initiated emergency response. 
                  <span className="block mt-2 font-black uppercase tracking-widest text-[10px]">Remain with child</span>
                </div>
              </div>
              <Button onClick={() => { setScannedId(''); setIsSent(false); }} variant="outline" className="w-full h-14 border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest hover:bg-slate-50">
                Reset Terminal
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
