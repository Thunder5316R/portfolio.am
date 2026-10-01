# Asiful Mowla — 3D Portfolio

Personal portfolio built with **HTML, CSS (Bootstrap 5), JavaScript, Three.js and GSAP**. No build step — just static files, ready for GitHub Pages.

## Structure
```
index.html          → all page sections
css/style.css       → theme & styles (colors at the top in :root)
js/data.js          → YOUR PROJECTS — edit this file to add/change projects
js/main.js          → UI: loader, typing text, tilt cards, skills sphere, contact form
js/scene.js         → Three.js scene: cute chrome robot that follows the cursor + one 3D piece per section that animates in on scroll
assets/             → CV (Asiful-Mowla-CV.pdf), photo (profile.webp), link preview (og-image.jpg)
assets/projects/    → project screenshots
```

## Run locally
The 3D scene is an ES module, so it won't load if you double‑click `index.html` (browsers block modules on `file://`).
Use any local server instead:
- **VS Code** → install "Live Server" → right‑click `index.html` → *Open with Live Server*, or
- copy the folder into `xampp/htdocs/` and open `http://localhost/<folder-name>/`, or
- `python -m http.server` in this folder, then open `http://localhost:8000`

## Publish on GitHub Pages
1. Create a new repo on GitHub named **`Thunder5316R.github.io`** (gives you `https://thunder5316r.github.io`)
   — or any name, e.g. `portfolio` (gives you `https://thunder5316r.github.io/portfolio`).
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/Thunder5316R/Thunder5316R.github.io.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**. Live in ~1 minute.

## Common edits
- **Add / edit a project**: edit `js/data.js`. Put a screenshot (about 1280×720) in `assets/projects/` and set `image: "assets/projects/name.jpg"`. Set `live` / `github` links — empty links are hidden automatically.
- **Update the CV**: replace `assets/Asiful-Mowla-CV.pdf` with the new file (keep the same name).
- **Change the photo**: replace `assets/profile.webp` (square image, transparent or dark background works best).
- **Experience, education, certifications**: the *05 / Journey* section in `index.html`.
- **3D pieces per section**: each `piece("section-id", { x, yPx, scale ... })` block in `js/scene.js` — `x` is the position across the screen (0–1), `yPx` the distance from the section's top (or bottom with `fromBottom: true`).
- **Change the accent color**: edit `--accent` and `--accent-rgb` in `css/style.css`, and `ACCENT` in `js/scene.js`.
- **Stats** (years, projects…): edit the `data-count` numbers in the About section of `index.html`.

Live: https://thunder5316r.github.io/portfolio.am/
