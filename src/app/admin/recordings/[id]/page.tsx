import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/feedback";
import { ConfirmForm } from "@/components/forms/confirm-form";
import { ArchiveTester } from "@/components/admin/archive-tester";
import { createClient } from "@/lib/supabase/server";
import { addDropboxLink, createLibraryItem, deleteTemporary, markVerified, recordTests, verifyDropbox } from "../archive-actions";

const Step = ({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) => (
  <Card className="space-y-3"><div className="flex items-center gap-2"><Badge tone={done ? "brand" : "neutral"}>{done ? "Done" : `Step ${n}`}</Badge><h2 className="font-semibold">{title}</h2></div>{children}</Card>);

export default async function Archive({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await createClient();
  const { data: r } = await db.from("recordings").select("*,broadcasts(title)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: cats } = await db.from("audio_categories").select("id,name").order("name");
  const title = (r.broadcasts as unknown as { title: string } | null)?.title ?? "Recording";
  const linked = Boolean(r.dropbox_stream_url), checked = r.dropbox_ok === true, verified = r.archive_status === "verified";
  return (
    <div className="max-w-xl space-y-4">
      <Link href="/admin/recordings" className="text-sm font-semibold text-brand">← All recordings</Link>
      <h1 className="text-3xl font-bold">Archive: {title}</h1>
      {sp.error && <p role="alert" className="text-sm font-medium text-danger">{sp.error}</p>}
      {sp.ok && <p role="status" className="text-sm font-medium text-brand">{sp.ok}</p>}
      {r.status !== "ready" ? <Card><p className="text-sm text-muted">This recording is {r.status}. It can be archived once it is ready.</p></Card> : <>
        <Step n={1} title="Download and upload to Dropbox" done={linked}>
          {r.temp_deleted ? <p className="text-sm text-muted">The temporary file was deleted.</p> : <Button href={`/api/admin/recordings/${id}/download`} variant="secondary">Download recording</Button>}
          <p className="text-sm text-muted">Upload the file to Dropbox yourself, then create a share link (Share &gt; Create link &gt; anyone with the link).</p></Step>
        <Step n={2} title="Paste the Dropbox share link" done={linked}>
          <form action={addDropboxLink} className="space-y-3"><input type="hidden" name="id" value={id} /><Input label="Dropbox share link" name="url" type="url" defaultValue={r.dropbox_share_url ?? ""} required /><Button type="submit">Save link</Button></form></Step>
        {linked && <Step n={3} title="Automatic link check" done={checked}>
          <p className="text-sm text-muted">Fetches the first 2 KB through Dropbox and checks that it is a real OGG/Opus file, supports range requests, and matches this recording&rsquo;s size.</p>
          <form action={verifyDropbox}><input type="hidden" name="id" value={id} /><Button type="submit" variant="secondary">{r.dropbox_checked_at ? "Check again" : "Run check"}</Button></form>
          {r.dropbox_checked_at && <p className="text-sm text-muted">Last check: {r.dropbox_ok ? "passed" : "FAILED"} · range requests {r.dropbox_supports_range ? "supported" : "not supported"} · {r.dropbox_content_type || "no content type"}</p>}</Step>}
        {checked && <Step n={4} title="Test playback and seeking" done={r.playback_tested && r.seek_tested}>
          <p className="text-sm text-muted">Press play, then drag the bar well ahead and let it play on. The button unlocks only when your browser really did both.</p>
          {r.playback_tested && r.seek_tested ? <p className="text-sm font-medium text-brand">Recorded as working.</p> : <ArchiveTester src={r.dropbox_stream_url!} id={id} action={recordTests} />}</Step>}
        {checked && r.playback_tested && r.seek_tested && <Step n={5} title="Confirm the archive is ready" done={verified}>
          {verified ? <p className="text-sm font-medium text-brand">Verified.</p> : <form action={markVerified}><input type="hidden" name="id" value={id} /><Button type="submit">Mark archive verified</Button></form>}</Step>}
        {verified && <Step n={6} title="Add to the audio library" done={false}>
          <form action={createLibraryItem} className="space-y-3"><input type="hidden" name="id" value={id} /><Input label="Title" name="title" defaultValue={title} required />
            <div className="space-y-1.5"><label htmlFor="d" className="text-sm font-medium">Description</label><textarea id="d" name="description" rows={3} className="w-full rounded-lg border border-line bg-surface p-3" /></div>
            <div className="space-y-1.5"><label htmlFor="c" className="text-sm font-medium">Category</label><select id="c" name="categoryId" className="min-h-11 w-full rounded-lg border border-line bg-surface px-3"><option value="">No category</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <Button type="submit">Create library item (hidden until you publish)</Button></form></Step>}
        {verified && !r.temp_deleted && <Step n={7} title="Delete the temporary file (optional)" done={false}>
          <p className="text-sm text-muted">Frees storage. Recording details and the Dropbox link are kept. This can&rsquo;t be undone.</p>
          <ConfirmForm action={deleteTemporary} hidden={{ id }} buttonLabel="Delete temporary file" title="Delete the temporary recording?" description="Confirm that the Dropbox copy plays and seeks correctly. The temporary file will be permanently removed." confirmLabel="Delete temporary file" /></Step>}
      </>}
    </div>
  );
}
