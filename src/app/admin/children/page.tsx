"use client";

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DataStore } from '@/lib/store';
import { Child } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ChildrenList() {
  const [children, setChildren] = useState<Child[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setChildren(DataStore.getChildren());
  }, []);

  const filtered = children.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <a href="/admin/register">Register Another</a>
          </Button>
        </div>

        <Card className="shadow-md border-2">
          <CardContent className="p-0">
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
                {filtered.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-bold text-primary">{child.id}</TableCell>
                    <TableCell className="font-medium">{child.name}</TableCell>
                    <TableCell>{child.parentName}</TableCell>
                    <TableCell>{child.parentPhone}</TableCell>
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
                            <div className="bg-white p-4 border-8 border-primary rounded-xl shadow-inner">
                              {/* Simple QR Simulation */}
                              <div className="grid grid-cols-4 gap-1 w-48 h-48">
                                {Array.from({ length: 16 }).map((_, i) => (
                                  <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'}`} />
                                ))}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                   <div className="bg-white px-3 py-1 border-2 border-black font-bold text-xl">{child.id}</div>
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-lg">{child.name}</p>
                              <p className="text-muted-foreground text-sm">Valid for Event: Summer Fair 2024</p>
                            </div>
                            <div className="flex gap-4 w-full">
                              <Button className="flex-1 gap-2">
                                <Printer className="w-4 h-4" /> Print
                              </Button>
                              <Button variant="outline" className="flex-1 gap-2">
                                <Download className="w-4 h-4" /> Export
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}