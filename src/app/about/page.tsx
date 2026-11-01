import type { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">About {appConfig.name}</h1>
      <p className="text-lg">{appConfig.description}</p>
      <p className="text-muted">You can listen to public shows without an account. Create one to save bookmarks, playlists and your listening history.</p>
    </article>
  );
}
