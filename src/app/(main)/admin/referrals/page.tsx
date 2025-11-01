"use client";

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link2, Plus, TrendingUp, Users, ShoppingCart, Eye, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ReferralLink {
  id: string;
  code: string;
  name: string;
  credits: number;
  clicks: number;
  signups: number;
  orders: number;
  active: boolean;
  createdAt: any;
  createdBy: string;
}

export default function ReferralsPage() {
  const { firestore, auth } = useFirebase();
  const { toast } = useToast();
  
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    credits: 10,
  });

  // Fetch all referral links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const linksSnapshot = await getDocs(collection(firestore, "referral_links"));
        const linksData = linksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReferralLink[];
        
        setLinks(linksData.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.()));
      } catch (error) {
        console.error("Error fetching links:", error);
        toast({
          variant: "destructive",
          title: "Error loading links",
          description: "Could not fetch referral links",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [firestore, toast]);

  // Generate unique code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Create new referral link - 🔒 SECURITY: Uses server-side API
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name for this link",
      });
      return;
    }

    if (formData.credits < 0 || formData.credits > 100) {
      toast({
        variant: "destructive",
        title: "Invalid credits",
        description: "Credits must be between 0 and 100",
      });
      return;
    }

    setIsCreating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          credits: formData.credits,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create referral link');
      }

      // Refresh links list
      const linksSnapshot = await getDocs(collection(firestore, "referral_links"));
      const linksData = linksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferralLink[];
      
      setLinks(linksData.sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.()));
      
      toast({
        title: "Referral link created! 🎉",
        description: `Code: ${data.link.code} - ${data.link.credits} credits`,
      });

      setIsCreateOpen(false);
      setFormData({ name: "", credits: 10 });
    } catch (error: any) {
      console.error("Error creating link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create referral link",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle active status - 🔒 SECURITY: Uses server-side API
  const toggleActive = async (linkId: string, currentStatus: boolean) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const response = await fetch('/api/referrals/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          linkId,
          active: !currentStatus,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update link status');
      }

      // Update local state
      setLinks(links.map(link => 
        link.id === linkId ? { ...link, active: !currentStatus } : link
      ));

      toast({
        title: currentStatus ? "Link deactivated" : "Link activated",
      });
    } catch (error: any) {
      console.error("Error toggling link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update link status",
      });
    }
  };

  // Copy link to clipboard
  const copyLink = (code: string) => {
    const link = `${window.location.origin}/login?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied! 📋",
      description: "Referral link copied to clipboard",
    });
  };

  // Calculate totals
  const totals = links.reduce((acc, link) => ({
    clicks: acc.clicks + link.clicks,
    signups: acc.signups + link.signups,
    orders: acc.orders + link.orders,
  }), { clicks: 0, signups: 0, orders: 0 });

  const conversionRate = totals.clicks > 0 
    ? ((totals.signups / totals.clicks) * 100).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div className="w-full p-3 sm:p-0">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Loading referral links...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-0 space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 sm:border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Clicks</CardTitle>
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totals.clicks}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Impressions</p>
          </CardContent>
        </Card>

        <Card className="border-0 sm:border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Signups</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totals.signups}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>

        <Card className="border-0 sm:border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{totals.orders}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">From referrals</p>
          </CardContent>
        </Card>

        <Card className="border-0 sm:border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Links</CardTitle>
            <Link2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {links.filter(l => l.active).length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              of {links.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Links Table */}
      <Card className="border-0 sm:border">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Referral Links</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Track clicks, signups, and orders from your referral links
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Referral Link</DialogTitle>
                  <DialogDescription>
                    Generate a new referral link with custom credit bonus
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Link Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Instagram Campaign, Friend Referral"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credits">Bonus Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Users who sign up with this link will get {formData.credits} free credits
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Link"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {links.map(link => (
              <Card key={link.id} className="p-3 border">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{link.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{link.code}</p>
                    </div>
                    <Badge variant={link.active ? "default" : "secondary"} className="text-xs shrink-0">
                      {link.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm font-bold">{link.credits}</p>
                      <p className="text-[10px] text-muted-foreground">Credits</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm font-bold">{link.clicks}</p>
                      <p className="text-[10px] text-muted-foreground">Clicks</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm font-bold">{link.signups}</p>
                      <p className="text-[10px] text-muted-foreground">Signups</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-sm font-bold">{link.orders}</p>
                      <p className="text-[10px] text-muted-foreground">Orders</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => copyLink(link.code)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => toggleActive(link.id, link.active)}
                    >
                      {link.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {links.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No referral links yet</p>
                <p className="text-xs mt-1">Create your first link to start tracking!</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Clicks</TableHead>
                  <TableHead className="text-center">Signups</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(link => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{link.code}</code>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{link.credits}</TableCell>
                    <TableCell className="text-center">{link.clicks}</TableCell>
                    <TableCell className="text-center">{link.signups}</TableCell>
                    <TableCell className="text-center">{link.orders}</TableCell>
                    <TableCell>
                      <Badge variant={link.active ? "default" : "secondary"}>
                        {link.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {link.createdAt ? format(link.createdAt.toDate(), "MMM dd, yyyy") : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(link.code)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(link.id, link.active)}
                        >
                          {link.active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {links.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Link2 className="h-12 w-12 mb-3 opacity-50" />
                        <p>No referral links yet</p>
                        <p className="text-sm mt-1">Create your first link to start tracking!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



