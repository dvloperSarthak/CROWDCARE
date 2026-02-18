
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Search, Download, Loader2, UserCircle, MapPin, Navigation, Map as MapIcon, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

// Dynamically import tactical map for inbuilt embed
const TacticalMap = dynamic(() => import('@/components/tactical-map'), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-slate-100 animate-pulse rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] font-black uppercase text-slate-400">Loading Tactical Intel...</div>
});

export default function ChildrenList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const db = useFirestore();
  const { user } = useUser();

  const childrenRef = useMemoFirebase(() => user ? collection(db, 'children') : null, [db, user]);
  const { data: children, isLoading } = useCollection(childrenRef);

  const eventsRef = useMemoFirebase(() => user ? collection(db, 'rescueEvents') : null, [db, user]);
  const { data: events } = useCollection(eventsRef);

  const filtered = children?.filter(c => 
    c.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePrint = (childId: string, childName: string, photo?: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${childId}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Guardian ID - ${childId}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { border: 8px solid #FF7733; padding: 40px; border-radius: 24px; text-align: center; max-width: 400px; background: white; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
            .photo { width: 120px; height: 120px; border-radius: 60px; object-fit: cover; border: 4px solid #FF7733; margin-bottom: 20px; }
            h1 { font-size: 48px; margin: 10px 0; color: #0f172a; font-weight: 900; }
            h2 { font-size: 24px; margin: 0; color: #FF7733; font-weight: 700; }
            .qr { width: 180px; height: 180px; margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 10px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${photo ? `<img src="${photo}" class="photo" />` : ''}
            <h2>${childName}</h2>
            <h1>${childId}</h1>
            <img src="${qrUrl}" class="qr" />
            <div class="footer">Verified Guardian Protocol</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExport = async (childId: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${childId}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GuardianID-${childId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Failed to generate Guardian ID file.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Guardian ID Registry" backHref="/" />
      <main className="container py-8 px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search Registry..." className="pl-10 h-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button className="w-full md:w-auto font-black uppercase tracking-widest shadow-lg" asChild>
            <a href="/admin/register">New Registration</a>
          </Button>
        </div>

        <Card className="shadow-md border-2">
          <CardContent className="p-0">
            {isLoading || !user ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Syncing Central Registry...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">ID</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Field Telemetry</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Ops</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">Registry empty or no matches.</TableCell></TableRow>
                  ) : (
                    filtered.map((child) => {
                      const latestEvent = events
                        ?.filter(e => e.childId === child.id)
                        .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())[0];

                      return (
                        <TableRow key={child.id}>
                          <TableCell>
                            {child.photoUrl ? (
                              <div className="w-10 h-10 rounded-full border border-primary overflow-hidden relative shadow-sm">
                                <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><UserCircle className="w-6 h-6 text-slate-400" /></div>
                            )}
                          </TableCell>
                          <TableCell className="font-black text-primary tracking-tighter text-lg">{child.id}</TableCell>
                          <TableCell className="font-black text-sm uppercase">{child.childName}</TableCell>
                          <TableCell>
                            {latestEvent ? (
                              <div className="flex flex-col gap-1">
                                <p className="font-mono text-[10px] font-bold text-slate-700 leading-tight">
                                  {latestEvent.locationLatitude.toFixed(6)}, {latestEvent.locationLongitude.toFixed(6)}
                                </p>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-[9px] font-black uppercase text-primary items-center justify-start gap-1">
                                      <MapIcon className="w-2.5 h-2.5" /> View In-App Map
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle className="font-black uppercase tracking-tight">Tactical Field View: {child.id}</DialogTitle>
                                    </DialogHeader>
                                    <div className="w-full h-[400px] rounded-xl overflow-hidden border-2 border-slate-900 shadow-2xl relative">
                                      <TacticalMap 
                                        alerts={[latestEvent]} 
                                        center={[latestEvent.locationLatitude, latestEvent.locationLongitude]} 
                                        zoom={17} 
                                      />
                                      <div className="absolute top-2 left-2 z-[1000] bg-slate-900 text-white p-2 rounded-lg border border-primary/20">
                                        <p className="font-mono text-[10px] font-bold">POS: {latestEvent.locationLatitude.toFixed(6)}, {latestEvent.locationLongitude.toFixed(6)}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold uppercase italic">No Active Signal</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" className="gap-2 font-black uppercase text-[10px] h-8 shadow-sm"><Eye className="w-3 h-3" /> Inspect</Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader><DialogTitle className="text-center font-black uppercase">Guardian ID Profile: {child.id}</DialogTitle></DialogHeader>
                                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                  <div className="flex gap-4 items-center">
                                    {child.photoUrl && (
                                      <div className="w-24 h-24 rounded-2xl border-4 border-primary overflow-hidden relative shadow-lg">
                                        <Image src={child.photoUrl} alt={child.childName} fill className="object-cover" />
                                      </div>
                                    )}
                                    <div className="bg-white p-3 border-8 border-primary rounded-xl shadow-2xl">
                                      <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${child.id}`} alt="QR" width={100} height={100} className="rounded-sm" />
                                    </div>
                                  </div>
                                  <div className="text-center space-y-1">
                                    <p className="font-black text-3xl text-slate-900 tracking-tighter">{child.id}</p>
                                    <p className="font-black text-xl text-primary uppercase">{child.childName}</p>
                                  </div>

                                  {latestEvent && (
                                    <div className="w-full space-y-3">
                                      <div className="bg-slate-900 p-4 rounded-xl border-2 border-primary/20 space-y-2 shadow-inner">
                                        <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2"><Navigation className="w-3 h-3 animate-pulse" /> Field Intelligence Locked</p>
                                        <div className="flex justify-between items-center">
                                          <p className="font-mono text-xs font-bold text-slate-300">{latestEvent.locationLatitude.toFixed(6)}, {latestEvent.locationLongitude.toFixed(6)}</p>
                                          <Badge className="bg-primary/20 border-primary text-primary text-[8px] font-black uppercase">Live Tracking</Badge>
                                        </div>
                                      </div>
                                      
                                      {/* Inbuilt Map Embed */}
                                      <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-slate-900 shadow-2xl relative">
                                        <TacticalMap 
                                          alerts={[latestEvent]} 
                                          center={[latestEvent.locationLatitude, latestEvent.locationLongitude]} 
                                          zoom={18} 
                                        />
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-4 w-full pt-4">
                                    <Button className="flex-1 h-12 text-xs font-black uppercase" onClick={() => handlePrint(child.id, child.childName, child.photoUrl)}><Printer className="w-4 h-4 mr-2" /> Print ID</Button>
                                    <Button variant="outline" className="flex-1 h-12 text-xs font-black uppercase" onClick={() => handleExport(child.id)}><Download className="w-4 h-4 mr-2" /> Export</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
