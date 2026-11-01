import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Studio() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">Broadcaster studio</h1>
      <Card className="space-y-3">
        <p>Create, schedule and edit your broadcasts.</p>
        <p className="text-sm text-muted">Open a broadcast and choose Live studio to go live, manage speakers and see recording status.</p>
        <div className="flex gap-3"><Button href="/studio/broadcasts/new">New broadcast</Button><Button href="/studio/broadcasts" variant="secondary">My broadcasts</Button></div>
      </Card>
    </div>
  );
}
