# Fastest Lap Leaderboard

Live leaderboard for a racing simulator event. One person enters lap times on a phone or laptop; a big screen shows the board with broadcast-style animations.

- Big screen: open the site URL.
- Operator: open the site URL with `#/control` on the end.

Laps and the current screen are stored in Supabase, so refreshing or swapping devices loses nothing.

## Run locally

Needs Node 22 (`nvm use`).

```bash
npm install
npm run dev
```

With no `.env.local` the app runs in demo mode: data is kept in that browser only. Open the board in one tab and `#/control` in another to try it.

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor > New query: paste `supabase/schema.sql` and run it.
3. Project Settings > API: copy the Project URL and the anon public key.
4. Copy `.env.example` to `.env.local` and fill them in.
5. Set the operator passphrase: SQL Editor > New query, run this with your own phrase in place of `CHANGE-ME` (use something long, e.g. four random words):

```sql
insert into public.operator_secret (id, pin_hash)
values (1, encode(sha256(convert_to('CHANGE-ME', 'UTF8')), 'hex'))
on conflict (id) do update set pin_hash = excluded.pin_hash;
```

Run the same snippet again to change it. Until it is set, nothing can be written.

### What is protected

The Supabase URL and key are visible to anyone who opens the site. That is normal, and with this setup that key can only read. Adding or deleting laps and switching the big screen all go through database functions that check the operator passphrase. The passphrase is typed on the operator page, kept in that browser, and is never part of the site's code. The board (names and lap times) is readable by anyone with the URL.

Free Supabase projects pause after about a week without use. Open the app the day before the event to make sure it is awake.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Repo Settings > Pages > Source: GitHub Actions.
2. Repo Settings > Secrets and variables > Actions > Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

These values end up in the public site bundle. That is expected for a Supabase public key.

## On the day

- Big screen: open the site, press F11 for full screen. Keep that tab in front.
- Operator page: enter the passphrase once per device. Then, per run: type the driver's name, optionally tap **Show "On track" banner**, then enter their time and **Submit lap**. Times accept `1:22.115`, `1.22.115` or `82.115`.
- **Big screen** buttons switch between Leaderboard, Podium and Head to head. For a head to head against someone with no time yet, type their name: the screen shows the time to beat until their lap is in.
- Wrong entry: delete it under Recent laps.
- To reset before the event, run `delete from laps;` in the Supabase SQL editor.

## Checks

```bash
npm test        # logic: time parsing, standings, paging, animation queue
npm run lint
npm run build
```
# RacingSimulatorLeaderboard
