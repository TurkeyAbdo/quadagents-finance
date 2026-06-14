"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/db/client";
import type { Client, ClientType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

function emptyClient(): Client {
  return {
    id: "",
    name: "",
    type: "client",
    email: "",
    phone: "",
    address: "",
    notes: "",
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);

  async function load() {
    const db = createClient();
    setLoading(true);
    const { data } = await db
      .from("clients")
      .select("*")
      .order("name");
    setClients((data ?? []) as Client[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(c: Client) {
    const db = createClient();
    if (!c.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
      });
      return;
    }
    const payload = {
      name: c.name,
      type: c.type,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      notes: c.notes || null,
    };
    const { error } = c.id
      ? await db.from("clients").update(payload).eq("id", c.id)
      : await db.from("clients").insert(payload);
    if (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message,
      });
      return;
    }
    toast({ title: c.id ? "Contact updated" : "Contact created" });
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this contact? Related transactions/invoices are kept."))
      return;
    const db = createClient();
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message,
      });
      return;
    }
    toast({ title: "Contact deleted" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients & Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everyone you bill or pay. Linked to invoices and transactions.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyClient())}>
          <Plus className="h-4 w-4" /> New contact
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No contacts yet. Add your first client or vendor.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {c.type === "client" ? (
                        <Badge variant="info">Client</Badge>
                      ) : (
                        <Badge variant="warning">Vendor</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(c)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(c.id)}
                          aria-label="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit contact" : "New contact"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="cli-name">Name</Label>
                  <Input
                    id="cli-name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cli-type">Type</Label>
                  <Select
                    value={editing.type}
                    onValueChange={(v) =>
                      setEditing({ ...editing, type: v as ClientType })
                    }
                  >
                    <SelectTrigger id="cli-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cli-email">Email</Label>
                  <Input
                    id="cli-email"
                    type="email"
                    value={editing.email ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cli-phone">Phone</Label>
                  <Input
                    id="cli-phone"
                    value={editing.phone ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="cli-address">Address</Label>
                  <Textarea
                    id="cli-address"
                    className="min-h-[70px]"
                    value={editing.address ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, address: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="cli-notes">Notes</Label>
                  <Textarea
                    id="cli-notes"
                    className="min-h-[70px]"
                    value={editing.notes ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && save(editing)}>
              {editing?.id ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
