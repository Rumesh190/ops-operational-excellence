"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Edit3, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { OpsFeedback } from "@/components/ops/ops-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import FiveSPageHeader from "@/features/five-s/components/FiveSPageHeader";
import { addActionCategory, moveActionCategory, setActionCategoryActive, updateActionCategory, useActionCategorySettings, type ActionCategorySetting } from "@/lib/actions/action-category-store";
import { SettingsAccessDenied, useSettingsAccess } from "./settings-access";

type Editor = ActionCategorySetting | "new";

export default function ActionCategoriesPage() {
  const access = useSettingsAccess();
  const items = useActionCategorySettings();
  const [editing, setEditing] = useState<Editor | null>(null);
  const [form, setForm] = useState({ name: "", description: "", active: true });
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string }>();
  const ordered = [...items].sort((a, b) => a.order - b.order);
  if (!access.canManageConfiguration) return <PageContainer><FiveSPageHeader eyebrow="Actions" title="Action Categories" description="Manage the classifications used for corrective and improvement Actions." /><SettingsAccessDenied area="Action Configuration" /></PageContainer>;

  function openEditor(item: Editor) {
    setEditing(item);
    setForm(item === "new" ? { name: "", description: "", active: true } : { name: item.name, description: item.description ?? "", active: item.active });
    setFeedback(undefined);
  }
  function save() {
    const result = editing === "new" ? addActionCategory(form) : editing ? updateActionCategory(editing.id, form) : false;
    if (!result) return setFeedback({ tone: "error", message: "Category name is required and must be unique." });
    setEditing(null);
    setFeedback({ tone: "success", message: editing === "new" ? "Category added." : "Category updated." });
  }
  function toggle(item: ActionCategorySetting) {
    const saved = setActionCategoryActive(item.id, !item.active);
    setFeedback(saved ? { tone: "success", message: item.active ? "Category deactivated. Historical Actions keep their category." : "Category reactivated." } : { tone: "error", message: "Could not save changes. Try again." });
  }

  return <PageContainer>
    <FiveSPageHeader eyebrow="Actions" title="Action Categories" description="Manage the classifications used for corrective and improvement Actions." actions={<Button onClick={() => openEditor("new")}><Plus className="size-4" />Add Category</Button>} />
    {feedback && <OpsFeedback {...feedback} />}
    <Card className="gap-0 overflow-hidden"><CardContent className="p-0">
      <div className="hidden lg:block"><Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Order</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{ordered.map((item, index) => <TableRow key={item.id} className={item.active ? "" : "opacity-60"}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="max-w-md whitespace-normal text-muted-foreground">{item.description || "—"}</TableCell><TableCell><Badge variant={item.active ? "success" : "muted"}>{item.active ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{item.order}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => moveActionCategory(item.id, -1)} aria-label={`Move ${item.name} up`}><ArrowUp className="size-4" /></Button><Button size="icon-sm" variant="ghost" disabled={index === ordered.length - 1} onClick={() => moveActionCategory(item.id, 1)} aria-label={`Move ${item.name} down`}><ArrowDown className="size-4" /></Button><Button size="sm" variant="ghost" onClick={() => openEditor(item)}><Edit3 className="size-4" />Edit</Button><Button size="sm" variant="ghost" onClick={() => toggle(item)}>{item.active ? "Deactivate" : "Reactivate"}</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
      <div className="grid gap-3 p-3 lg:hidden">{ordered.map((item, index) => <div key={item.id} className={`rounded-lg border p-3 ${item.active ? "" : "opacity-60"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description || "No description"}</p></div><Badge variant={item.active ? "success" : "muted"}>{item.active ? "Active" : "Inactive"}</Badge></div><div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-2"><span className="mr-auto text-xs text-muted-foreground">Order {item.order}</span><Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => moveActionCategory(item.id, -1)} aria-label={`Move ${item.name} up`}><ArrowUp className="size-4" /></Button><Button size="icon-sm" variant="ghost" disabled={index === ordered.length - 1} onClick={() => moveActionCategory(item.id, 1)} aria-label={`Move ${item.name} down`}><ArrowDown className="size-4" /></Button><Button size="sm" variant="ghost" onClick={() => openEditor(item)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => toggle(item)}>{item.active ? "Deactivate" : "Reactivate"}</Button></div></div>)}</div>
    </CardContent></Card>
    <p className="text-xs leading-5 text-muted-foreground">Inactive categories are excluded from new Action creation. Existing Action records retain their stored category value.</p>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{editing === "new" ? "Add Category" : "Edit Category"}</DialogTitle><DialogDescription>Changes affect new Action creation only. Historical Action values are preserved.</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label htmlFor="action-category-name">Category Name</Label><Input id="action-category-name" className="mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div><Label htmlFor="action-category-description">Description</Label><Textarea id="action-category-description" className="mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div><Label>Status</Label><Select value={form.active ? "active" : "inactive"} onValueChange={(value) => setForm({ ...form, active: value === "active" })}><SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={!form.name.trim()} onClick={save}>{editing === "new" ? "Add Category" : "Save Changes"}</Button></DialogFooter></DialogContent></Dialog>
  </PageContainer>;
}
