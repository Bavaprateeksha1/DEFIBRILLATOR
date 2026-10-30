# Virtual Defibrillator Lab – Ex. 1 (21BMC402J)
Educational simulation only; not clinical advice. No hardware, no APIs, no build step.

## Folder structure
```
defib-virtual-lab/
├── index.html   # page content + lab panels
├── style.css    # styling (responsive)
├── script.js    # simulation logic (ECG generator, charging, sync, shock)
└── README.md
```
## Run locally
Double-click `index.html` (or run `python -m http.server` in the folder and open http://localhost:8000).

## Deploy on GitHub Pages
1. Create a GitHub account → **New repository** (e.g. `defib-virtual-lab`, Public).
2. **Add file → Upload files**, drag in `index.html`, `style.css`, `script.js`, `README.md`, then **Commit**.
3. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. After ~1 minute your site is live at `https://<username>.github.io/defib-virtual-lab/`.
(Netlify Drop or Cloudflare Pages also work: just drag the folder.)

## Simulation rules (illustrative)
- Normal / A-fib → SYNC mode; V-fib → MANUAL mode (as in the procedure).
- A-fib converts at ≥100 J in SYNC; V-fib at ≥200 J in MANUAL; SYNC is inhibited in V-fib (no R-wave).
- Energy → capacitor voltage via E = ½CV² (C = 32 µF); patient load 75 Ω.
