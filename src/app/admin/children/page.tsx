
"use client";

import { useState, useRef } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import Image from 'next/image';

export default function ChildrenList() {
  const [searchTerm, setSearchTerm] = useState('');
  const db = useFirestore();

  const childrenRef = useMemoFirebase(() => collection(db, 'children'), [db]);
  const { data: children, isLoading } = useCollection(childrenRef);

  const filtered = children?.filter(c => 
    c.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handlePrint = (childId: string, childName: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${childId}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Guardian ID - ${childId}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 10px solid #FF7733; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; }
            h1 { font-size: 48px; margin: 20px 0 10px; color: #0f172a; }
            h2 { font-size: 24px; margin: 0; color: #FF7733; }
            img { width: 250px; height: 250px; }
            .footer { margin-top: 20px; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${qrUrl}" alt="QR Code" />
            <h1>${childId}</h1>
            <h2>${childName}</h2>
            <div class="footer">Verified Guardian ID Node</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
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
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Guardian ID Registry" backHref="/admin/register" />
      <main className="container py-8 px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by ID or Name..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="w-full md:w-auto" variant="outline" asChild>
            <a href="/admin/register">Register New ID</a>
          </Button>
        </div>

        <Card className="shadow-md border-2">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Syncing with Central Registry...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No children found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="font-bold text-primary">{child.id}</TableCell>
                        <TableCell className="font-medium">{child.childName}</TableCell>
                        <TableCell>{child.parentName}</TableCell>
                        <TableCell>{child.parentMobileNumber}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="gap-2">
                                <QrCode className="w-4 h-4" />
                                View QR
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-center">Guardian QR ID: {child.id}</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                <div className="bg-white p-4 border-8 border-primary rounded-xl shadow-2xl">
                                  <Image 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${child.id}`}
                                    alt={`QR Code for ${child.id}`}
                                    width={200}
                                    height={200}
                                    className="rounded-sm"
                                  />
                                </div>
                                <div className="text-center">
                                  <p className="font-black text-2xl text-slate-900">{child.id}</p>
                                  <p className="font-bold text-lg text-primary">{child.childName}</p>
                                  <p className="text-muted-foreground text-sm">Registered: {new Date(child.registrationDate).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-4 w-full">
                                  <Button 
                                    className="flex-1 gap-2 h-12 text-lg font-bold" 
                                    onClick={() => handlePrint(child.id, child.childName)}
                                  >
                                    <Printer className="w-4 h-4" /> Print
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className="flex-1 gap-2 h-12 text-lg font-bold"
                                    onClick={() => handleExport(child.id)}
                                  >
                                    <Download className="w-4 h-4" /> Export
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
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
