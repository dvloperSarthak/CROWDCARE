"use client";

import Link from 'next/link';
import { UserCog, Camera, LayoutDashboard, Fingerprint, UserCircle, ShieldCheck, ShieldAlert, Loader2, Siren, AlertTriangle, QrCode, RefreshCw, Image as ImageIcon, Upload, Camera as CameraIcon } from 'lucide-react';
import { useAuth, initiateAnonymousSignIn, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Hero } from '@/components/ui/animated-hero';
import { cn } from '@/lib/utils';
import { NavBar } from '@/components/nav-bar';
import { doc } from 'firebase/firestore';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from '@/components/ui/card';
import jsQR from 'jsqr';

export default function Home() {
  const auth = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Role verification
  const adminRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_admin', user.uid) : null, [db, user]);
  const operatorRoleRef = useMemoFirebase(() => user ? doc(db, 'roles_operator', user.uid) : null, [db, user]);
  
  const { data: adminRole, isLoading: loadingAdmin } = useDoc(adminRoleRef);
  const { data: operatorRole, isLoading: loadingOperator } = useDoc(operatorRoleRef);

  const isEmailUser = user && !user.isAnonymous;
  const isAdmin = !!adminRole || isEmailUser; 
  const isOperator = !!operatorRole || isEmailUser;
  const isGuardian = isAdmin || isOperator;
  const isLoadingRoles = (loadingAdmin || loadingOperator) && !isEmailUser;

  const startScanning = async (mode: 'user' | 'environment' = facingMode) => {
    setIsScanning(true);
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
    } catch (err) {
      setIsScanning(false);
      toast({ variant: 'destructive', title: 'Scanner Offline', description: 'Camera access is required.' });
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isScanning) startScanning(newMode);
  };

  const stopScanning = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

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
            stopScanning();
            window.location.href = `/status/${code.data}`;
          } else {
            toast({ variant: 'destructive', title: 'No QR Found', description: 'Could not detect a tactical ID in this image.' });
          }
        }
      };
      img.src = result;
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
            stopScanning();
            window.location.href = `/status/${code.data}`;
            return;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  const handleGuestAccess = () => {
    if (auth && !user) {
      initiateAnonymousSignIn(auth);
    }
  };

  const triggerGlobalSOS = async () => {
    setIsSOSLoading(true);
    if (!user) {
      initiateAnonymousSignIn(auth);
      toast({ title: "Authenticating SOS..." });
      return;
    }
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Error" });
      setIsSOSLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const alertId = `SOS-PUB-${Date.now()}`;
        const alertRef = doc(db, 'rescueEvents', alertId);
        const sosData = {
          id: alertId,
          childId: 'PUBLIC_SOS',
          volunteerId: user.uid,
          locationLatitude: pos.coords.latitude,
          locationLongitude: pos.coords.longitude,
          scanTime: new Date().toISOString(),
          status: 'SOS',
          statusUpdateTime: new Date().toISOString(),
          isDuplicate: false,
          notes: 'URGENT: PANIC SIGNAL TRIGGERED FROM MAIN DASHBOARD',
          isSOS: true
        };
        import('firebase/firestore').then(({ setDoc }) => {
          setDoc(alertRef, sosData, { merge: true });
        });
        toast({ variant: "destructive", title: "SOS ACTIVE" });
        setIsSOSLoading(false);
      },
      () => {
        toast({ variant: "destructive", title: "Signal Failure" });
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden">
      <NavBar title="CrowdCare Guardian" />
      <main className="flex-1 flex flex-col items-center p-6 space-y-12">
        <div className="relative z-10 w-full"><Hero /></div>

        <div className="w-full max-w-xl animate-entrance">
           <Card className="border-4 border-slate-900 bg-black aspect-square flex flex-col items-center justify-center relative overflow-hidden shadow-2xl rounded-[2.5rem]">
              <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isScanning ? 'opacity-100' : 'opacity-0'}`} autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute top-0 left-0 right-0 bg-slate-900/80 p-4 flex items-center justify-center gap-2 z-30">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Secure Guardian Scanner</h3>
              </div>

              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-primary border-dashed rounded-3xl animate-pulse" />
                  <div className="absolute top-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(255,119,51,1)] animate-scan-line" />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
                    <Button variant="destructive" className="h-10 px-6 font-black uppercase text-[10px]" onClick={stopScanning}>Stop Scanner</Button>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-xl" onClick={() => galleryInputRef.current?.click()}>
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
                    <CameraIcon className="w-12 h-12 text-white" />
                  </div>
                  <Button onClick={() => startScanning()} className="w-full h-16 text-lg font-black uppercase tracking-widest bg-primary rounded-2xl shadow-[0_0_20px_rgba(255,119,51,0.4)]">Start Secure Scan</Button>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" className="text-white text-[10px] font-black uppercase" onClick={() => galleryInputRef.current?.click()}>Upload ID From Gallery</Button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Secure ID Verification Hub</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={galleryInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleGalleryUpload} 
              />
           </Card>
           <div className="text-center mt-4 space-y-1">
             <p className="text-xs font-bold text-slate-500 uppercase">Parent Status Hub</p>
             <p className="text-[9px] font-medium text-slate-400">Lost ID? Proceed to Command Hub for manual verification.</p>
           </div>
        </div>

        <div className="w-full max-w-6xl space-y-8 relative z-10" id="roles">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Tactical Role Selection</h2>
            </div>
            
            {isLoadingRoles ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : user ? (
              <div className="flex flex-col items-center gap-4 animate-entrance">
                <div className="bg-white border-2 border-primary/20 rounded-full px-6 py-3 flex items-center gap-3 shadow-xl">
                  {isGuardian ? <ShieldCheck className="w-6 h-6 text-teal-600" /> : <UserCircle className="w-6 h-6 text-primary" />}
                  <div className="flex flex-col">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900 mb-1">{isGuardian ? 'Verified Guardian' : 'Guest Volunteer'}</span>
                    <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">{user.email || 'Anonymous ID: ' + user.uid.slice(0, 8)}</span>
                  </div>
                </div>
                {(!isGuardian || user.isAnonymous) && (
                  <Button variant="outline" className="gap-2 h-10 px-6 font-bold border-primary text-primary" asChild>
                    <Link href="/login"><ShieldAlert className="w-4 h-4" /> Guardian Auth</Link>
                  </Button>
                )}
              </div>
            ) : (
              <InteractiveHoverButton 
                text="Guardian Login" 
                className="h-14 w-64"
                onClick={() => window.location.href = "/login"}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard href="/admin/children" icon={<UserCog className="w-6 h-6" />} title="Guardian Panel" description="Registry & ID Management." isRestricted={!isAdmin} isLoading={isLoadingRoles} subtext={!isAdmin ? "Auth Required" : "Mode Active"} />
            <RoleCard href="/volunteer" icon={<CameraIcon className="w-6 h-6" />} title="Volunteer App" description="QR Scanner & Dispatch." onClick={handleGuestAccess} subtext="Public Access" />
            <RoleCard href="/control-room" icon={<LayoutDashboard className="w-6 h-6" />} title="Control Room" description="Live Dashboard & Intel." isRestricted={!isOperator && !isAdmin} isLoading={isLoadingRoles} subtext={!isOperator && !isAdmin ? "Auth Required" : "Dashboard Active"} />
          </div>
        </div>

        <div className="w-full max-w-2xl animate-entrance pb-12">
          <Card className="bg-red-50 border-4 border-red-600 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <div className="bg-red-600 text-white p-6 text-center">
              <h3 className="flex items-center justify-center gap-3 text-3xl font-black uppercase tracking-tighter"><Siren className="w-8 h-8 animate-pulse" /> Emergency Hub</h3>
            </div>
            <CardContent className="p-8 space-y-6 text-center">
              <p className="text-slate-900 font-bold text-lg leading-tight">Are you or someone else in immediate danger? Trigger a silent GPS panic signal to our tactical control room.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full h-20 text-2xl font-black uppercase shadow-xl bg-red-600 hover:bg-red-700 rounded-2xl border-b-8 border-red-900"><AlertTriangle className="mr-3 w-8 h-8" /> Trigger Panic SOS</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-950 border-4 border-red-600 text-white rounded-[2rem]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3 text-2xl font-black uppercase text-red-500"><Siren className="w-8 h-8 animate-bounce" /> Confirm SOS</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-300 font-bold text-base">Dispatch live GPS tracking to tactical response?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="bg-transparent border-2 border-white text-white font-black uppercase h-12 rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={triggerGlobalSOS} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase h-12 rounded-xl">{isSOSLoading ? <Loader2 className="animate-spin" /> : "Initiate SOS"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ href, icon, title, description, isRestricted = false, isLoading = false, subtext, onClick }: { href: string; icon: React.ReactNode; title: string; description: string; isRestricted?: boolean; isLoading?: boolean; subtext?: string; onClick?: () => void; }) {
  return (
    <div className="relative group h-full">
      <div className="relative h-full rounded-[1.25rem] border p-2 transition-all">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
        <Link href={isRestricted || isLoading ? "#" : href} onClick={isRestricted || isLoading ? undefined : onClick} className={cn("relative flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all group-hover:bg-slate-50/50", (isRestricted || isLoading) && "opacity-60 grayscale cursor-not-allowed")}>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary">{isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}</div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black tracking-tight uppercase">{title}</h3>
              <p className="text-muted-foreground font-medium text-sm">{description}</p>
            </div>
          </div>
          {subtext && <div className="mt-4 pt-4 border-t border-dashed"><p className={cn("text-[9px] font-black tracking-widest uppercase flex items-center gap-2", isRestricted ? "text-destructive" : "text-teal-600")}>{subtext}</p></div>}
        </Link>
      </div>
    </div>
  );
}