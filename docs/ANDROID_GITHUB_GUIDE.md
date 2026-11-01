# Android + GitHub guide (no terminal)
GitHub's mobile uploader cannot upload folders or unzip files. This one-time trick lets GitHub unzip for you. (UNTESTED by me: if a step fails, tell me the exact error.)

## One-time setup
1. github.com > sign in > **New repository** > name it `audio-platform` > **Private** > Create.
2. Open the repo > **Add file > Create new file**. In the name box type exactly `.github/workflows/unpack.yml` (typing the slashes creates the folders).
3. Open `unpack-upload.yml` (provided with this delivery), copy all its text, paste into the editor, tap **Commit changes**.

## Every delivery (Phase 1, 2, 3...)
1. Repo > **Add file > Upload files** > choose the zip (file name must start with `audio-platform-`) > **Commit changes**.
2. Open the **Actions** tab. A run named "Unpack upload" starts. Wait for the green check (about 30 seconds).
3. Back on **Code**, the project files now appear. Vercel redeploys automatically.
4. If the run is red: tap it, tap the failed step, and send me the error text.

Never upload a file containing real keys. Keys go only into Vercel's Environment Variables.
