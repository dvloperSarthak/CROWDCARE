
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  X,
  Clock,
  CircleStop,
  History,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useAuth, initiateAnonymousSignIn, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
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
  const [showReminder, setShowReminder] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusPhotoRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Fetch past missions for this volunteer
  const missionsRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'rescueEvents'), where('volunteerId', '==', user.uid));
  }, [db, user]);
  const { data: pastMissions } = useCollection(missionsRef);

  // Automated Reminder Effect: Ask every 30 minutes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBroadcasting && isSent) {
      interval = setInterval(() => {
        setShowReminder(true);
      }, 30 * 60 * 1000); 
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBroadcasting, isSent]);

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
            toast({ variant: 'destructive', title: "Scan Failure", description: "No Guardian QR detected." });
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

  async function uploadToImgBB(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('https://api.imgbb.com/1/upload?key=6874d5a39ecc03ce08ca12b3f4f00fd8', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.data?.url || null;
    } catch (error) {
      return null;
    }
  }

  const handleRescue = async () => {
    if (!scannedId || !user || !currentCoords) return;
    setIsDispatching(true);
    
    let finalStatusPhotoUrl = null;
    if (statusFile) {
      finalStatusPhotoUrl = await uploadToImgBB(statusFile);
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
      statusPhotoUrl: finalStatusPhotoUrl,
      notes: finalStatusPhotoUrl ? `Status Photo attached.` : 'Standard alert.',
    };

    const alertRef = doc(db, 'rescueEvents', alertId);
    setDocumentNonBlocking(alertRef, newAlert, { merge: true });

    setTimeout(() => {
      setActiveAlertId(alertId);
      setIsDispatching(false);
      setIsSent(true);
      toast({ title: "SITREP LIVE", description: "Broadcasting situational telemetry." });
    }, 1200);
  };

  const closeMission = () => {
    setScannedId(''); 
    setIsSent(false); 
    setActiveAlertId(null); 
    setIsBroadcasting(false); 
    setStatusFile(null); 
    setStatusPreview(null);
    setShowReminder(false);
    toast({ title: "MISSION SECURED", description: "Telemetry broadcast terminated." });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Guardian Field Terminal" backHref="/" />
      
      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
        
        {/* Personalized Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-900 text-white p-3 border-none shadow-lg rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-3 h-3 text-primary" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Missions</span>
            </div>
            <p className="text-2xl font-black">{pastMissions?.length || 0}</p>
          </Card>
          <Card className="bg-white p-3 border-2 border-slate-900 shadow-md rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Network Link</span>
            </div>
            <p className="text-xs font-black uppercase">{gpsAccuracy} Accuracy</p>
          </Card>
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
                  <Button variant="destructive" size="sm" onClick={stopCamera} className="absolute bottom-6 left-1/2 -translate-x-1/2 font-black uppercase text-[10px]">Abort Scanner</Button>
                </div>
              )}

              {!isScanning && (
                <div className="text-center space-y-4 z-20 px-6 w-full max-w-xs">
                  <div className="bg-white/10 p-8 rounded-full inline-block backdrop-blur-xl border-2 border-white/20 shadow-2xl">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <Button onClick={startCamera} className="w-full h-16 text-lg font-black uppercase tracking-widest bg-primary rounded-2xl">Start Scanner</Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-12 text-xs font-black uppercase bg-white/5 border-white/20 text-white rounded-xl gap-2">
                    <ImagePlus className="w-4 h-4" /> Manual Link
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
              )}
            </Card>

            {scannedId && (
              <div className="animate-entrance space-y-4">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl space-y-4 border-b-8 border-primary relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2">
                    <Button size="icon" variant="ghost" className="text-white/40 hover:text-white" onClick={() => setScannedId('')}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-2xl border-2 border-primary bg-slate-800 relative overflow-hidden flex-shrink-0">
                      {isLoadingChild ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : childData?.photoUrl ? <Image src={childData.photoUrl} alt="Target" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserCircle className="w-10 h-10 text-slate-600" /></div>}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Subject: {scannedId}</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight truncate leading-tight">{isLoadingChild ? 'Syncing...' : (childData?.childName || 'Identity check required')}</h3>
                      {!isLoadingChild && childData && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[9px] font-black uppercase">{childData.parentMobileNumber}</Badge>
                          <Button size="sm" variant="secondary" asChild className="h-6 px-2 bg-teal-600 hover:bg-teal-700 text-white border-0 text-[8px] font-black uppercase">
                            <a href={`tel:${childData.parentMobileNumber}`}><PhoneCall className="w-2.5 h-2.5 mr-1" /> Call</a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach Field Condition Photo</p>
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 bg-black/40 flex items-center justify-center cursor-pointer overflow-hidden relative shadow-pointer" onClick={() => statusPhotoRef.current?.click()}>
                        {statusPreview ? <Image src={statusPreview} alt="Status" fill className="object-cover" /> : <CloudUpload className="w-6 h-6 text-slate-600" />}
                      </div>
                      <p className="text-[9px] text-slate-500 italic">Visual intel for control room.</p>
                      <input type="file" ref={statusPhotoRef} className="hidden" accept="image/*" onChange={handleStatusFileChange} />
                    </div>
                  </div>

                  {currentCoords && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-primary/20 relative shadow-inner">
                      <iframe title="Field Map Embed" width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}&z=17&ie=UTF8&iwloc=&output=embed`} allowFullScreen></iframe>
                    </div>
                  )}
                </div>

                <Button onClick={handleRescue} disabled={isDispatching || !currentCoords} className="w-full h-20 text-xl font-black uppercase shadow-2xl bg-primary hover:bg-primary/90 rounded-3xl border-b-8 border-orange-800">
                  {isDispatching ? <Loader2 className="animate-spin" /> : <><AlertTriangle className="mr-3 w-6 h-6" /> Initiate Broadcast</>}
                </Button>
              </div>
            )}

            {/* Past Mission Log */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">My Mission Log</h3>
              </div>
              {pastMissions && pastMissions.length > 0 ? (
                <div className="space-y-3">
                  {pastMissions.slice(0, 3).map(mission => (
                    <Card key={mission.id} className="p-3 border-2 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-primary">{mission.childId}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(mission.scanTime).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={mission.status === 'Child Reunited' ? 'secondary' : 'default'} className="text-[8px] font-black uppercase">{mission.status}</Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">No past missions on record.</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6 py-8">
            <Card className="border-8 border-teal-500 bg-white p-8 text-center space-y-8 shadow-2xl animate-success-pop rounded-[3rem]">
              <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-inner"><CheckCircle2 className="w-16 h-16 text-teal-600" /></div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Broadcasting</h2>
                <div className="bg-slate-900 text-teal-400 p-4 rounded-2xl border-2 border-teal-900/20 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Live situational telemetry active.
                </div>
              </div>
              <Button onClick={closeMission} variant="destructive" className="w-full h-14 border-b-4 border-red-900 font-black uppercase text-sm shadow-xl flex gap-3">
                <CircleStop className="w-5 h-5" /> Stop Sharing & Close
              </Button>
            </Card>
          </div>
        )}

        <AlertDialog open={showReminder} onOpenChange={setShowReminder}>
          <AlertDialogContent className="bg-slate-900 border-4 border-primary text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-primary font-black uppercase tracking-tighter">
                <Clock className="w-6 h-6 animate-pulse" /> Safety Verification
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300 font-bold">
                You have been broadcasting for 30 minutes. Are you still maintaining situational presence?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => setShowReminder(false)} className="bg-transparent border-2 border-white text-white font-black uppercase text-[10px]">Continue</AlertDialogCancel>
              <AlertDialogAction onClick={closeMission} className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase text-[10px]">End Mission</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
