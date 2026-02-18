
"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Signal, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ImagePlus, 
  UserCircle,
  Navigation,
  ExternalLink,
  LocateFixed,
  Radio,
  Upload,
  Map as MapIcon,
  Wifi,
  WifiOff,
  Phone,
  PhoneCall,
  CloudUpload,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useAuth, initiateAnonymousSignIn } from '@/firebase';
import { doc } from 'firebase/firestore';
import jsQR from 'jsqr';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Dynamically import map for inbuilt embed
const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => <div className="h-32 w-full bg-slate-800 animate-pulse rounded-xl" />
});

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<'low' | 'medium' | 'high' | 'none'>('none');
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [statusPreview, setStatusPreview] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusPhotoRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsAccuracy('none');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(newCoords);
        
        if (pos.coords.accuracy < 15) setGpsAccuracy('high');
        else if (pos.coords.accuracy < 50) setGpsAccuracy('medium');
        else setGpsAccuracy('low');

        if (activeAlertId && db) {
          setIsBroadcasting(true);
          const alertRef = doc(db, 'rescueEvents', activeAlertId);
          updateDocumentNonBlocking(alertRef, {
            locationLatitude: pos.coords.latitude,
            locationLongitude: pos.coords.longitude,
            statusUpdateTime: new Date().toISOString()
          });
        }
      },
      (err) => {
        setGpsAccuracy('none');
        setIsBroadcasting(false);
        const message = err.code === 1 
          ? "GPS Permission Denied. Protocol halted." 
          : "Satellite signal lost. Searching...";
        
        toast({
          variant: "destructive",
          title: "Signal Lost",
          description: message,
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeAlertId, db, toast]);

  const childRef = useMemoFirebase(() => (scannedId && user) ? doc(db, 'children', scannedId) : null, [db, scannedId, user]);
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
      setIsScanning(false);
      toast({ variant: 'destructive', title: 'Camera Offline', description: 'Guardian scanner requires camera access.' });
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
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            setScannedId(code.data);
            stopCamera();
            toast({ title: "ID IDENTIFIED", description: `Guardian ID ${code.data} confirmed.` });
            return;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
            stopCamera();
            toast({ title: "ID DECODED", description: `Guardian ID ${code.data} verified from source.` });
          } else {
            toast({ 
              variant: 'destructive', 
              title: "Scan Failure", 
              description: "No Guardian QR detected. Ensure image is clear." 
            });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStatusFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStatusFile(file);
      const url = URL.createObjectURL(file);
      setStatusPreview(url);
    }
  };

  async function uploadToGuardianNet(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('image', file, `field-status-${Date.now()}.jpg`);
      
      const response = await fetch('https://imgup.infinityfreeapp.com/wp-json/imgup/v1/upload', {
        method: 'POST',
        headers: { 'X-API-Key': 'irHNL9Ibs5LyVUyI2WYXq1mCdiJ9EDxc' },
        body: formData
      });

      if (!response.ok) return null;
      const result = await response.json();
      return result.url || result.data?.url || result.link || null;
    } catch (error) {
      return null;
    }
  }

  const handleRescue = async () => {
    if (!scannedId || !user || !currentCoords) return;
    setIsDispatching(true);
    
    let finalStatusPhotoUrl = null;
    if (statusFile) {
      finalStatusPhotoUrl = await uploadToGuardianNet(statusFile);
    }

    const alertId = `A-${Date.now()}`;
    const newAlert = {
      id: alertId,
      childId: scannedId,
      volunteerId: user.uid,
      locationLatitude: currentCoords.lat, 
      locationLongitude: currentCoords.lng,
      scanTime: new Date().toISOString(),
      status: 'Scanned',
      statusUpdateTime: new Date().toISOString(),
      isDuplicate: false,
      notes: finalStatusPhotoUrl ? `Status Photo attached: ${finalStatusPhotoUrl}` : '',
    };

    const alertRef = doc(db, 'rescueEvents', alertId);
    setDocumentNonBlocking(alertRef, newAlert, { merge: true });

    setTimeout(() => {
      setActiveAlertId(alertId);
      setIsDispatching(false);
      setIsSent(true);
      toast({ title: "SITREP LIVE", description: "Broadcasting high-precision location stream." });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Guardian Field Terminal" backHref="/" />
      
      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-xl border-2 border-primary/20 shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className={cn("w-5 h-5", isBroadcasting ? "text-primary animate-pulse" : "text-slate-500")} />
            <span className="font-black text-[10px] uppercase tracking-widest">
              {isBroadcasting ? "Continuous Broadcast Live" : "Tactical Network Ready"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md">
             <LocateFixed className={cn("w-3 h-3", gpsAccuracy === 'high' ? "text-teal-400" : "text-yellow-400")} />
             <span className="text-[9px] font-black uppercase">Signal: {gpsAccuracy}</span>
          </div>
        </div>

        {!isSent ? (
          <>
            <Card className="border-4 border-slate-900 bg-black aspect-square flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-[2.5rem]">
              <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`} autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="w-full h-1 bg-primary shadow-[0_0_20px_rgba(255,119,51,1)] animate-scan-line absolute" />
                  <div className="absolute inset-0 border-[60px] border-black/50" />
                </div>
              )}

              {!isScanning && (
                <div className="text-center space-y-4 z-20 px-6 w-full max-w-xs">
                  <div className="bg-white/10 p-8 rounded-full inline-block backdrop-blur-xl border-2 border-white/20 shadow-2xl mb-2">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button onClick={startCamera} className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl bg-primary hover:bg-primary/90 rounded-2xl">
                      Start Scanner
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20" /></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-black px-2 text-white/40">Manual Link</span></div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 text-xs font-black uppercase tracking-widest bg-white/5 border-white/20 text-white hover:bg-white/10 rounded-xl gap-2"
                    >
                      <ImagePlus className="w-4 h-4" /> Upload Guardian ID
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                    />
                  </div>
                </div>
              )}
            </Card>

            {scannedId && (
              <div className="animate-entrance space-y-4">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl space-y-4 border-b-8 border-primary relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2"><Badge className="bg-primary font-black uppercase tracking-widest">{scannedId}</Badge></div>
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-2xl border-2 border-primary bg-slate-800 relative overflow-hidden flex-shrink-0">
                      {isLoadingChild ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : childData?.photoUrl ? <Image src={childData.photoUrl} alt="Target" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserCircle className="w-10 h-10 text-slate-600" /></div>}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Protocol Identified</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight truncate leading-tight">{isLoadingChild ? 'Checking Registry...' : (childData?.childName || 'Unrecognized Subject')}</h3>
                      
                      {!isLoadingChild && childData && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-2 py-1 px-2 bg-teal-500/10 rounded border border-teal-500/20 w-fit">
                            <Phone className="w-3 h-3 text-teal-400" />
                            <span className="text-[10px] font-black text-teal-100 uppercase tracking-widest">{childData.parentMobileNumber}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            asChild 
                            className="h-7 px-2 bg-teal-600 hover:bg-teal-700 text-white border-0"
                          >
                            <a href={`tel:${childData.parentMobileNumber}`}>
                              <PhoneCall className="w-3 h-3 mr-1.5" />
                              <span className="text-[9px] font-black uppercase">Call Parent</span>
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optional: Field Status Photo</p>
                    <div className="flex gap-3 items-center">
                      <div 
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 bg-black/40 flex items-center justify-center cursor-pointer overflow-hidden relative group"
                        onClick={() => statusPhotoRef.current?.click()}
                      >
                        {statusPreview ? (
                          <>
                            <Image src={statusPreview} alt="Status" fill className="object-cover" />
                            <Button 
                              size="icon" 
                              variant="destructive" 
                              className="absolute inset-0 m-auto w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setStatusFile(null);
                                setStatusPreview(null);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <CloudUpload className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 italic">Capture current situation for Command Room intel.</p>
                      <input type="file" ref={statusPhotoRef} className="hidden" accept="image/*" onChange={handleStatusFileChange} />
                    </div>
                  </div>

                  {currentCoords && (
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Navigation className="w-3 h-3 text-primary animate-pulse" /> Telemetry Locked</p>
                          <p className="font-mono text-[10px] font-bold text-slate-100">{currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}</p>
                        </div>
                      </div>

                      <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-primary/20 relative shadow-inner">
                        <iframe
                          title="Field Map Embed"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=17&ie=UTF8&iwloc=&output=embed`}
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleRescue} disabled={isDispatching || !currentCoords} className="w-full h-24 text-2xl font-black uppercase tracking-widest shadow-2xl bg-primary hover:bg-primary/90 rounded-3xl border-b-8 border-orange-800">
                  {isDispatching ? <Loader2 className="animate-spin w-8 h-8" /> : <><AlertTriangle className="mr-3 w-8 h-8" /> Initiate Broadcast</>}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 py-8">
            <Card className="border-8 border-teal-500 bg-white p-8 text-center space-y-8 shadow-2xl animate-success-pop rounded-[3rem]">
              <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-16 h-16 text-teal-600" /></div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Broadcasting</h2>
                <div className="bg-slate-900 text-teal-400 p-4 rounded-2xl border-2 border-teal-900/20 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Live situational telemetry active.<br/>Maintain position until contacted.
                </div>
              </div>

              {currentCoords && (
                 <div className="w-full h-48 rounded-3xl overflow-hidden border-4 border-slate-900 shadow-xl relative">
                    <iframe
                      title="Success Map Embed"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=18&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                    ></iframe>
                 </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-teal-600">
                  <Wifi className="w-4 h-4 animate-pulse" /> Continuous Data Stream Active
                </div>
                <Button onClick={() => { 
                  setScannedId(''); 
                  setIsSent(false); 
                  setActiveAlertId(null); 
                  setIsBroadcasting(false); 
                  setStatusFile(null); 
                  setStatusPreview(null);
                }} variant="outline" className="w-full h-12 border-2 border-slate-900 font-black uppercase text-[10px]">Close Mission Terminal</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
