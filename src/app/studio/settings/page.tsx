import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudioSettings() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold">Studio settings</h1>
      <Card className="space-y-3"><p className="text-sm text-muted">Pick your microphone inside the Live studio once you are on air.</p><Button href="/profile" variant="secondary">Edit your profile</Button></Card>
    </div>
  );
}
