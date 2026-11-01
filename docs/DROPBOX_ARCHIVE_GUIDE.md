# Dropbox archive guide (manual, no Dropbox login stored by the app)
Where: Admin > Recordings > a ready recording > **Manage archive**. The page walks you through 7 steps and unlocks each only when the previous one is truly done.
1. **Download** the temporary file (button). 2. In the Dropbox app/website, upload it, then Share > create a link (anyone with the link). 3. Paste the link; the app turns `dl=0` into `raw=1` for direct playback.
4. **Run check**: the server fetches the first 2 KB, follows redirects, and confirms: real OGG + Opus bytes (not an HTML page), range support (HTTP 206), and the size equals the recording's size.
5. **Test playback and seeking**: press play, drag the bar ahead, keep listening. The button unlocks only when your browser actually did both.
6. **Mark archive verified**, then **Create library item**, then Publish it from Admin > Library.
7. Optional: **Delete temporary file** (dialog). Allowed only when verified. Metadata and the Dropbox link stay.
If any check fails you get a plain message and nothing is deleted. Re-run the check any time: Dropbox can change or throttle links.
Honest limits: Dropbox staff say the `raw=1` trick works for embedding, but Dropbox is not a content host and shared-link bandwidth is capped per account per day. A forum user cites 20 GB/day for Basic accounts (second-hand, UNVERIFIED). At ~21 MB per hour of audio that is roughly 900 full one-hour plays per day, and when the cap is hit playback fails until it resets. The player then shows a clear error. Keep the originals; if traffic grows you will need a real audio host.
