"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ImagePlus, 
  UserCircle,
  Navigation,
  PhoneCall,
  CloudUpload,
  X,
  Clock,
  CircleStop,
  History,
  Trophy,
  ShieldAlert,
  Volume2,
  Activity,
  User,
  Wifi,
  Search,
  MessageSquare,
  Sparkles,
  Megaphone,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useAuth, initiateAnonymousSignIn, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { findChildMatch } from '@/ai/flows/child-matcher-flow';
import jsQR from 'jsqr';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function VolunteerApp() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<'low' | 'medium' | 'high' | 'none'>('none');
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [statusPreview, setStatusPreview] = useState<string | null>(null);
  const [manualDescription, setManualDescription] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusPhotoRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<number>(null);
  const qrGalleryInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Auto-login for public access
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const missionsRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'rescueEvents'), where('volunteerId', '==', user.uid));
  }, [db, user]);
  const { data: pastMissions } = useCollection(missionsRef);

  const childrenRef = useMemoFirebase(() => (db && user) ? collection(db, 'children') : null, [db, user]);
  const { data: allChildren } = useCollection(childrenRef);

  const broadcastRef = useMemoFirebase(() => (db && user) ? query(collection(db, 'broadcasts'), orderBy('timestamp', 'desc'), limit(1)) : null, [db, user]);
  const { data: latestBroadcasts } = useCollection(broadcastRef);
  const latestBroadcast = latestBroadcasts?.[0];

  const guardianRank = useMemo(() => {
    const count = pastMissions?.length || 0;
    if (count >= 10) return { name: "Elite Guardian", color: "text-amber-500", icon: <Trophy className="w-4 h-4" /> };
    if (count >= 5) return { name: "Veteran Scout", color: "text-primary", icon: <Activity className="w-4 h-4" /> };
    return { name: "Sentinel Scout", color: "text-slate-400", icon: <User className="w-4 h-4" /> };
  }, [pastMissions]);

  const toggleCrowdAlarm = () => {
    if (isAlarmActive) {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      setIsAlarmActive(false);
    } else {
      setIsAlarmActive(true);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      alarmIntervalRef.current = setInterval(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      }, 1000);
      toast({ title: "Crowd Signal Active", description: "High-frequency audio beacon engaged." });
    }
  };

  useEffect(() => {
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.accuracy < 15) setGpsAccuracy('high');
        else if (pos.coords.accuracy < 50) setGpsAccuracy('medium');
        else setGpsAccuracy('low');
      },
      () => setGpsAccuracy('none'),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const childRef = useMemoFirebase(() => (scannedId && user) ? doc(db, 'children', scannedId) : null, [db, scannedId, user]);
  const { data: childData, isLoading: isLoadingChild } = useDoc(childRef);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setIsScanning(true);
    setScannedId('');
    
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (error) {
      setIsScanning(false);
      toast({ variant: 'destructive', title: 'Scanner Offline', description: 'Enable camera to decode IDs.' });
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleQrGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            toast({ title: "ID Decoded", description: "Identity verified via gallery asset." });
          } else {
            toast({ variant: 'destructive', title: 'Decode Failure', description: 'Could not detect a tactical QR in this image.' });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const tick = () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
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

  async function uploadToImgBB(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('https://api.imgbb.com/1/upload?key=6874d5a39ecc03ce08ca12b3f4f00fd8', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      return result.data?.url || null;
    } catch (error) { return null; }
  }

  const handleRescue = async (isSOS: boolean = false) => {
    if (!user || !currentCoords) return;
    setIsDispatching(true);
    
    let photoUrl = null;
    if (statusFile) photoUrl = await uploadToImgBB(statusFile);

    const alertId = isSOS ? `SOS-${Date.now()}` : `A-${Date.now()}`;
    const newAlert = {
      id: alertId,
      childId: isSOS ? 'EMERGENCY_SOS' : scannedId,
      volunteerId: user.uid,
      locationLatitude: currentCoords.lat, 
      locationLongitude: currentCoords.lng,
      scanTime: new Date().toISOString(),
      status: isSOS ? 'SOS' : 'Scanned',
      statusUpdateTime: new Date().toISOString(),
      isDuplicate: false,
      statusPhotoUrl: photoUrl,
      notes: isSOS ? 'EMERGENCY SOS TRIGGERED' : `Field SITREP initiated. Manual Match: ${!scannedId}`,
      isSOS: isSOS
    };

    const alertRef = doc(db, 'rescueEvents', alertId);
    setDocumentNonBlocking(alertRef, newAlert, { merge: true });
    setActiveAlertId(alertId);
    setIsDispatching(false);
    setIsSent(true);
  };

  const runAiMatcher = async () => {
    if (!manualDescription || !allChildren) return;
    setIsMatching(true);
    try {
      const result = await findChildMatch({
        description: manualDescription,
        registry: allChildren.map(c => ({ id: c.id, childName: c.childName, age: c.age, physicalDescription: c.physicalDescription }))
      });
      setAiSuggestions(result.matches || []);
      if (result.bestMatchId) {
        toast({ title: "AI Match Found", description: "Identification probability is high." });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: "AI Sync Failure" });
    }
    setIsMatching(false);
  };

  if (isUserLoading || (!user && auth)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-black uppercase">Establishing Tactical Handshake</h2>
        <p className="text-muted-foreground text-sm">Provisioning guest volunteer credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar title="Field Terminal" backHref="/" />
      
      {latestBroadcast && (
        <div className="bg-primary text-white py-2 px-4 overflow-hidden whitespace-nowrap">
           <div className="flex items-center gap-2 animate-marquee font-black uppercase text-[10px] tracking-widest">
              <Megaphone className="w-3 h-3" /> COMMAND BROADCAST: {latestBroadcast.message}
           </div>
        </div>
      )}

      <main className="container max-w-md mx-auto py-6 px-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-900 text-white p-3 border-none shadow-lg rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              {guardianRank.icon}
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{guardianRank.name}</span>
            </div>
            <p className="text-2xl font-black">{pastMissions?.length || 0}</p>
          </Card>
          <Card className="bg-white p-3 border-2 border-slate-900 shadow-md rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">GPS Status</span>
            </div>
            <p className="text-xs font-black uppercase">{gpsAccuracy} Signal</p>
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
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                    <Button variant="destructive" className="h-10 px-6 font-black uppercase text-[10px]" onClick={stopCamera}>Cancel</Button>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-xl" onClick={() => qrGalleryInputRef.current?.click()}>
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-xl" onClick={switchCamera}>
                        <RefreshCw className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {!isScanning && (
                <div className="text-center space-y-4 z-20 px-6 w-full max-w-xs">
                  <div className="bg-white/10 p-8 rounded-full inline-block backdrop-blur-xl border-2 border-white/20 shadow-2xl">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <Button onClick={() => startCamera()} className="w-full h-16 text-lg font-black uppercase tracking-widest bg-primary rounded-2xl">Scan ID</Button>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" className="text-white text-[10px] font-black uppercase" onClick={() => qrGalleryInputRef.current?.click()}>Upload QR From Gallery</Button>
                    <Button variant="ghost" className="text-white text-[10px] font-black uppercase" onClick={() => setManualDescription('describe')}>Describe Child Instead</Button>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={qrGalleryInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleQrGalleryUpload} 
              />
            </Card>

            {manualDescription && !scannedId && (
              <Card className="border-2 border-slate-200 p-4 space-y-4 animate-entrance">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-primary" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">AI Matching Engine</h3>
                </div>
                <Textarea 
                  placeholder="Describe clothing, hair, age, etc..." 
                  className="min-h-[80px]"
                  value={manualDescription === 'describe' ? '' : manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                />
                <Button className="w-full h-10 font-black uppercase text-[10px]" onClick={runAiMatcher} disabled={isMatching}>
                  {isMatching ? <Loader2 className="animate-spin" /> : "Run AI Search"}
                </Button>
                
                {aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion) => (
                      <div key={suggestion.childId} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                        <div>
                          <p className="font-black text-xs">{suggestion.childId}</p>
                          <p className="text-[9px] text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[8px] font-black uppercase" onClick={() => setScannedId(suggestion.childId)}>Select</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <Button onClick={() => handleRescue(true)} variant="destructive" className="h-20 w-full text-xl font-black uppercase shadow-2xl rounded-3xl border-b-8 border-red-900">
               <ShieldAlert className="w-6 h-6 mr-3" /> Emergency SOS
            </Button>

            {scannedId && (
              <div className="animate-entrance space-y-4">
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl space-y-6 border-b-8 border-primary relative overflow-hidden">
                  <div className="flex gap-4 items-center">
                    <div className="w-24 h-24 rounded-2xl border-4 border-primary bg-slate-800 relative overflow-hidden flex-shrink-0">
                      {isLoadingChild ? <Loader2 className="w-6 h-6 animate-spin" /> : childData?.photoUrl ? <Image src={childData.photoUrl} alt="Target" fill className="object-cover" /> : <UserCircle className="w-full h-full text-slate-600" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Guardian ID: {scannedId}</p>
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{isLoadingChild ? 'Syncing...' : (childData?.childName || 'Identity Confirmed')}</h3>
                      {!isLoadingChild && childData && (
                        <div className="flex flex-wrap gap-2 mt-2">
                           <Badge variant="outline" className="text-[9px] border-white/20 text-white font-black">{childData.age} Years Old</Badge>
                           {childData.medicalRequirements && childData.medicalRequirements !== 'None' && <Badge variant="destructive" className="text-[9px] bg-red-600 animate-pulse border-none font-black uppercase"><Activity className="w-3 h-3 mr-1" /> Medical Alert</Badge>}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isLoadingChild && childData && (
                    <div className="grid gap-4 pt-4 border-t border-white/10">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Guardian Contact Info</p>
                        <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-black uppercase text-white">{childData.parentName}</p>
                              <p className="text-lg font-black text-primary tracking-tighter">{childData.parentMobileNumber}</p>
                            </div>
                            <Button size="lg" className="h-14 px-8 font-black uppercase text-xs bg-teal-600 hover:bg-teal-700 shadow-[0_0_20px_rgba(51,255,209,0.3)] shrink-0" asChild>
                              <a href={`tel:${childData.parentMobileNumber}`}>
                                <PhoneCall className="w-5 h-5 mr-2" /> Call Parent
                              </a>
                            </Button>
                          </div>
                          {childData.emergencyContactNumber && (
                             <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                <div>
                                  <p className="text-[8px] font-black uppercase text-slate-500">Alt Emergency</p>
                                  <p className="text-xs font-bold text-slate-300">{childData.emergencyContactNumber}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase text-slate-400" asChild>
                                  <a href={`tel:${childData.emergencyContactNumber}`}>Call Alt</a>
                                </Button>
                             </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-800/50 p-4 rounded-xl text-xs text-slate-300 border border-white/5">
                        <span className="font-black uppercase text-primary text-[10px] block mb-1">Physical Profile:</span>
                        {childData.physicalDescription || "No forensic physical profile available."}
                      </div>
                      
                      {childData.medicalRequirements && childData.medicalRequirements !== 'None' && (
                        <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-xs text-red-200">
                          <span className="font-black uppercase text-red-500 text-[10px] block mb-1">Medical Protocol:</span>
                          {childData.medicalRequirements}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-700 bg-black/40 flex items-center justify-center cursor-pointer overflow-hidden relative shadow-pointer" onClick={() => statusPhotoRef.current?.click()}>
                        {statusPreview ? <Image src={statusPreview} alt="Status" fill className="object-cover" /> : <CloudUpload className="w-6 h-6 text-slate-600" />}
                      </div>
                      <p className="text-[9px] text-slate-500 italic">Optional SITREP Photo.</p>
                      <input type="file" ref={statusPhotoRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setStatusFile(file); setStatusPreview(URL.createObjectURL(file)); }
                      }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={toggleCrowdAlarm} variant={isAlarmActive ? "destructive" : "outline"} className={cn("h-16 font-black uppercase text-[10px]", isAlarmActive && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]")}>
                     <Volume2 className="w-4 h-4 mr-2" /> {isAlarmActive ? "Stop Alarm" : "Crowd Signal"}
                  </Button>
                  <Button onClick={() => handleRescue(false)} disabled={isDispatching} className="h-16 font-black uppercase text-[10px] bg-primary shadow-[0_0_20px_rgba(255,119,51,0.3)]">
                     {isDispatching ? <Loader2 className="animate-spin" /> : <><AlertTriangle className="w-4 h-4 mr-2" /> Dispatch Alert</>}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6 py-8">
            <Card className="p-8 text-center space-y-8 shadow-2xl animate-success-pop rounded-[3rem] border-8 border-teal-500 bg-white">
              <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-16 h-16 text-teal-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Mission Active</h2>
                <Button onClick={toggleCrowdAlarm} variant={isAlarmActive ? "destructive" : "outline"} className={cn("w-full h-14 rounded-2xl font-black uppercase", isAlarmActive && "animate-pulse")}>
                   <Volume2 className="w-5 h-5 mr-3" /> {isAlarmActive ? "Disable Signal" : "Active Crowd Signal"}
                </Button>
                <Button onClick={() => { setIsSent(false); setScannedId(''); setManualDescription(''); setStatusPreview(null); setStatusFile(null); }} variant="ghost" className="text-muted-foreground font-black uppercase text-[10px]">Close & Reset</Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}