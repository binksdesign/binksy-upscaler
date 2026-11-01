# UPSCALER — MODE D’EMPLOI POUR AGENTS IA

Ce document s’adresse aux agents IA (Claude Code, Codex, ou tout agent qui pilote un navigateur via Playwright / CDP). Il explique comment utiliser **Upscaler** (`app.html`), l’agrandisseur d’images par IA de Binks Design : importer des images, choisir un modèle, agrandir, comparer, retoucher et exporter.

Il existe en deux endroits, toujours identiques : `AGENTS.md` (Markdown, français puis anglais) et la page `agent/index.html`. Résumé court : `llms.txt`.

Points d’entrée découvrables sans JavaScript : `index.html` et `docs.html` déclarent `<link rel="alternate" type="text/markdown" href="AGENTS.md">`, `<link rel="help" href="agent/">` et `<link rel="alternate" type="text/plain" href="llms.txt">`, contiennent un commentaire HTML et un `<noscript>` qui renvoient ici. `robots.txt` autorise tout et cite `llms.txt` et `AGENTS.md`.

---

## 1. Règle fondamentale

Upscaler **agrandit** les images que l’utilisateur fournit. Ce n’est pas un générateur d’images ni un outil de création de logo.

* **N’invente jamais** une image, un logo, une couleur, une police ou un texte de marque. Les fichiers fournis par l’utilisateur **font foi** : ne les remplace pas par une image « approchante » trouvée ou générée ailleurs.
* N’annonce jamais un agrandissement comme un **vectoriel** : le résultat reste une image pixel. Ne redessine pas un logo ou un SVG fourni ; pour un logo destiné à un client, signale que le fichier vectoriel d’origine reste préférable.
* L’IA peut inventer des détails (texture, traits, lettres). Si la fidélité compte (packshot, document, archive, logo), choisis un modèle fidèle (`plksr4`, `plksr2`) ou baisse la **Force de l’IA**, et dis-le à l’utilisateur.
* **Licences** : cinq modèles sont **non commerciaux** (CC BY-NC-SA) : `usv2lite`, `ultrasharp`, `usv2`, `remacri`, `animesharp`. Pour un travail commercial, prends un autre modèle ou demande à l’utilisateur.
* **Aucune clé API, aucun compte.** L’app n’en utilise aucune ; ne demande jamais de clé à l’utilisateur.
* **Les images restent locales** : rien n’est envoyé à un serveur. Seuls le moteur ONNX Runtime Web (CDN jsDelivr) et les modèles (Hugging Face) sont **téléchargés** vers le navigateur.

Après chaque action : vérifie l’état dans la page (texte de `#dims`, `#toast`, carte `.m-card.sel`, fichier téléchargé). **Un clic n’est pas une preuve de réussite.**

---

## 2. Démarrer

### Servir l’app

Le dépôt est statique, sans étape de build : `index.html` (accueil), `app.html` (l’application, un seul fichier), `docs.html` (documentation), `agent/index.html` (cette page), `AGENTS.md`, `llms.txt`, `robots.txt` et `assets/` (pages uniquement).

```bash
python3 -m http.server 8000
# puis ouvrir http://127.0.0.1:8000/app.html
```

* **http:// recommandé.** `file://` marche aussi, mais un seul cœur du processeur est alors utilisé.
* **Connexion Internet requise** : au chargement, l’app télécharge ONNX Runtime Web 1.30.0 depuis `cdn.jsdelivr.net` ; au premier usage d’un modèle, elle le télécharge depuis `huggingface.co` (1,7 à 69 Mo) et le garde dans le cache du navigateur. Sans moteur, seuls `bicubic` et `nearest` fonctionnent.
* Au premier lancement, un **mini-test** du matériel télécharge ClearReality (1,7 Mo) et mesure la vitesse : attends qu’il finisse ou laisse l’agrandissement l’attendre.
* Utilise une fenêtre **d’au moins 900 px de large, sans écran tactile** : en dessous de 900 px (ou avec un pointeur tactile), l’interface passe en mode mobile (feuilles, barre d’onglets) et l’export ouvre une feuille de partage au lieu d’un téléchargement direct.
* En Chromium headless, WebGPU est souvent absent : le calcul tourne sur le processeur, nettement plus lentement. Prévois des délais longs (plusieurs minutes pour les gros modèles).
* Utilise un profil de navigateur dédié : les réglages sont mémorisés pour l’origine.

### Pas d’API publique

Upscaler **n’a pas d’API JavaScript publique**. On le pilote par l’interface, avec les identifiants stables listés au § 4. Pour lire l’état, l’app expose aussi un objet interne `window.UP` (voir § 6), non documenté comme API : lecture seule de préférence.

---

## 3. Parcours pas à pas

1. **Ouvrir** `app.html` et attendre que le moteur charge (le texte de `#engineHint` ne doit pas annoncer « Moteur IA non chargé »).
2. **Importer** : `setInputFiles('#file', [...])` (accepte `image/*`, plusieurs fichiers). Ou les exemples : `#demoPhoto` / `#emptyDemo` (portrait 260 × 390), `#demoLogo` / `#emptyLogo` (logo 170 × 170, choisit `anime`). L’image apparaît dans `#queue` et devient l’image sélectionnée.
3. **Choisir le modèle** : onglet `.tab[data-tab="model"]`, puis `.m-card[data-id="<id>"]` (ou une puce de `#guide`). Vérifie `.m-card.sel`.
4. **Régler** : onglet `.tab[data-tab="set"]`.
    * Facteur : `#factorSeg button` dont le texte est `×2`, `×3`, `×4` ou `×8` (le bouton actif a la classe `on`).
    * Ou largeur précise : remplir `#customW` (16 à 32 000 px ; vide ou 0 = facteur).
    * `#outInfo` affiche la taille du résultat, le nombre de passes et le temps estimé, ou « Trop grand… ».
    * Curseurs (`input type="range"`) : `#denoise` (0–100, défaut 0), `#mix` Force de l’IA (0–100, défaut 100), `#sharp` (0–100, défaut 0), `#grain` (0–100, défaut 0). Pour les régler : `el.value = n; el.dispatchEvent(new Event('input', {bubbles: true}))`.
    * Transparence (visible seulement si l’image en a) : `#alphaSeg button[data-v="ai"|"fast"]`.
    * Moteur : `#epSeg button[data-v="auto"|"webgpu"|"wasm"]` ; tuiles : `#tileSeg button[data-v="0"|"64"|"128"|"256"|"384"]`.
5. **Agrandir** : `#runBtn` (ou `Ctrl`/`Cmd` + `Entrée`). Pendant le calcul, `#progress` est visible (`#pgTitle`, `#pgSub` : « tuile 8/15 · encore ~8 s ») ; `#pgCancel` annule.
6. **Attendre la fin** : `#toast` commence par « Terminé en … · L × H px ». `#dims` passe à `260 × 390 → 1 040 × 1 560`. Un échec affiche un message d’erreur dans `#toast` (§ 8).
7. **Comparer** (facultatif) : `#compareBtn` (ou touche `C`), `#refSel` pour choisir la référence, zoom `[data-z="fit"|"1"|"2"|"4"]`.
8. **Exporter** : onglet `.tab[data-tab="out"]`, format `#fmtSeg button[data-v="png"|"jpeg"|"webp"]`, qualité `#qual` (50–100, JPEG/WebP), résolution `#dpiSeg button[data-v="72"|"150"|"300"]`, nom `#fname`. Puis `#exportOne` ou `#exportBtn` : déclenche un **téléchargement** du navigateur (événement `download` dans Playwright).
9. **Lot** : `#runAll` (Tout agrandir, saute les images déjà faites avec ce modèle et ce facteur ; toast final « N images agrandies »), puis `#exportZip` ou `#zipAll` → `upscaler-binks.zip`.

### Fichiers produits

* Nom par défaut : `<nom>_x<facteur>_<id-modèle>.<ext>`, ex. `photo-exemple_x4_clear.png` (`#fname` le modifie, sans extension).
* Extension : `png`, `jpg` ou `webp`. En JPEG, la transparence devient blanche.
* Les dpi sont inscrits dans les PNG (bloc pHYs) et JPEG (JFIF) ; ils ne changent pas les pixels.
* ZIP : `upscaler-binks.zip`, une image par image agrandie, dans le format choisi.
* Les fichiers vont dans le dossier de téléchargement du navigateur : avec Playwright, récupère-les par `page.wait_for_event('download')` puis `save_as()`.

---

## 4. Sélecteurs stables

| Sélecteur | Rôle |
| --- | --- |
| `#file` | champ fichier caché (`accept="image/*" multiple`) |
| `#drop` | zone « Importe tes images » (clic ou dépôt) |
| `#demoPhoto`, `#emptyDemo` | photo d’exemple |
| `#demoLogo`, `#emptyLogo` | logo d’exemple (passe au modèle `anime`) |
| `#emptyImport` | ouvre le sélecteur de fichiers (écran vide) |
| `#queue .q-item`, `.q-item.sel`, `.q-x` | liste des images, image sélectionnée, retirer |
| `#clearAll` | tout retirer |
| `.tab[data-tab]` (`model`, `set`, `out`) | onglets Modèle, Réglages, Export |
| `#guide .chip` | guide « Je veux agrandir… » |
| `.m-card[data-id]`, `.m-card.sel` | cartes de modèle, modèle choisi |
| `#factorSeg button`, `#customW` | facteur, largeur précise |
| `#denoise`, `#mix`, `#sharp`, `#grain`, `#qual` | curseurs |
| `#alphaSeg`, `#epSeg`, `#tileSeg`, `#fmtSeg`, `#dpiSeg` (`button[data-v]`) | choix segmentés |
| `#fname` | nom du fichier exporté |
| `#runBtn`, `#runAll` | agrandir, tout agrandir |
| `#pgCancel`, `#progress`, `#pgTitle`, `#pgSub`, `#pgBar` | progression |
| `#toast` | messages (fin, export, erreurs) |
| `#dims`, `#outInfo`, `#printInfo` | tailles, temps estimé, taille d’impression |
| `#exportBtn`, `#exportOne`, `#exportZip`, `#zipAll` | exports |
| `#compareBtn`, `#refSel`, `[data-z]` | comparaison, référence, zoom |
| `#hwBox`, `#benchBtn`, `#engineHint` | matériel, refaire le mini-test, état du moteur |
| `#clearCache` | vider les modèles téléchargés |

### Identifiants des modèles (`data-id`)

| id | Nom | Facteur | Poids | Licence |
| --- | --- | --- | --- | --- |
| `general` | Real-ESRGAN General | ×4 | 4,9 Mo | BSD-3 |
| `usv2lite` | UltraSharp V2 Lite | ×4 | 28,5 Mo | CC BY-NC-SA (non commercial) |
| `ultrasharp` | UltraSharp | ×4 | 64 Mo | CC BY-NC-SA (non commercial) |
| `usv2` | UltraSharp V2 Max | ×4 | 49,4 Mo | CC BY-NC-SA (non commercial) |
| `clear` | ClearReality | ×4 | 1,7 Mo | Apache 2.0 |
| `clearsoft` | ClearReality Soft | ×4 | 1,7 Mo | Apache 2.0 |
| `x4plus` | Real-ESRGAN x4plus | ×4 | 68,3 Mo | BSD-3 |
| `plksr4` | RealPLKSR Fidèle x4 | ×4 | 28,3 Mo | MIT |
| `plksr2` | RealPLKSR Fidèle x2 | ×2 | 28,3 Mo | MIT |
| `nomos2` | Nomos2 | ×4 | 69,1 Mo | CC BY 4.0 |
| `remacri` | Remacri | ×4 | 68,3 Mo | CC BY-NC-SA (non commercial) |
| `swin2sr` | Swin2SR anti-JPEG | ×4 | 52,5 Mo | Apache 2.0 |
| `anime` | Real-ESRGAN Aplats | ×4 | 4,9 Mo | BSD-3 |
| `apisr4` | APISR x4 | ×4 | 6,2 Mo | GPL-3.0 |
| `apisr2` | APISR x2 | ×2 | 17,1 Mo | GPL-3.0 |
| `animesharp` | AnimeSharp V3 | ×2 | 63,9 Mo | CC BY-NC-SA (non commercial) |
| `bicubic` | Bicubique (sans IA) | libre | — | — |
| `nearest` | Pixel art (sans IA) | libre | — | — |

Rapides pour tester ou traiter un lot : `clear`, `clearsoft`, `general`, `anime`.

---

## 5. État persistant

| Emplacement | Clé | Contenu |
| --- | --- | --- |
| `localStorage` | `binks-upscaler-v1` | réglages JSON : `model`, `factor`, `customW`, `denoise`, `alpha`, `mix`, `sharp`, `grain`, `ep`, `tile`, `fmt`, `qual`, `dpi`, `compare` |
| `localStorage` | `binks-upscaler-hw` | profil matériel du mini-test |
| `localStorage` | `binks-upscaler-speed` | vitesses mesurées par modèle et moteur |
| `localStorage` | `binks-upscaler-running` | repère posé pendant un calcul ; s’il reste au rechargement, l’app passe en mode prudent (processeur ou tuiles de 64 px) |
| Cache Storage | `binks-upscaler-models-v1` | fichiers `.onnx` téléchargés (`#clearCache` les supprime) |

**Les images et les résultats ne sont pas sauvegardés** : un rechargement les efface. Exporte avant de recharger ou de fermer.

---

## 6. L’objet interne `window.UP`

L’app expose, tel quel, un objet interne utile pour **lire** l’état. Ce n’est pas une API publique : pas de garantie de stabilité, et modifier ses valeurs directement ne met pas l’interface à jour ni n’enregistre les réglages.

```js
UP.items          // images importées : {id, name, w, h, alpha, results, res, …}
UP.cur            // image sélectionnée (ou null)
UP.cur.res        // dernier résultat : {model, name, F, W, H, secs, …} (ou null)
UP.S              // réglages courants (même contenu que binks-upscaler-v1)
UP.Engine.ready   // true quand le moteur ONNX est chargé
UP.Engine.hw      // matériel détecté : {gpu, cores, mem, threads}
UP.Engine.backend // 'webgpu' ou 'wasm' pour le dernier calcul
UP.pickModel(id)  // choisit un modèle (équivaut au clic sur sa carte)
UP.run(UP.cur)    // lance l'agrandissement (Promise ; rejette en cas d'erreur)
```

Préfère les clics pour tout ce qui modifie l’état ; utilise `UP` pour vérifier (ex. `UP.cur.res.W`).

---

## 7. Exemple complet (Playwright, Python)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page.goto("http://127.0.0.1:8000/app.html")
    page.wait_for_function("window.UP && UP.Engine.ready", timeout=120_000)

    page.set_input_files("#file", "photo.jpg")
    page.click('.tab[data-tab="model"]')
    page.click('.m-card[data-id="clear"]')
    page.click('.tab[data-tab="set"]')
    page.click('#factorSeg button:has-text("×4")')
    page.click("#runBtn")
    page.wait_for_function(
        "document.querySelector('#toast').textContent.startsWith('Terminé')",
        timeout=900_000)
    print(page.inner_text("#dims"))          # ex. 260 × 390 → 1 040 × 1 560

    page.click('.tab[data-tab="out"]')
    page.click('#fmtSeg button[data-v="png"]')
    page.click('#dpiSeg button[data-v="300"]')
    with page.expect_download() as d:
        page.click("#exportOne")
    d.value.save_as("photo_x4_clear.png")
    b.close()
```

---

## 8. Vérifications avant de rendre le travail

* Le fichier téléchargé existe, s’ouvre, a le bon format et **les dimensions attendues** (largeur × facteur, ou la largeur précise demandée).
* Le modèle utilisé est celui demandé (`UP.cur.res.model`), et sa licence convient à l’usage (commercial ou non).
* Regarde le résultat à 100 % ou 200 % : artefacts, détails inventés, lettres déformées, bords d’un logo. Signale ce que tu vois.
* Si la retouche (`#mix`, `#sharp`, `#grain`) a été modifiée, dis-le : elle est appliquée à l’export.
* Rappelle à l’utilisateur que le résultat est une image pixel, pas un vectoriel.

---

## 9. Limites et erreurs

* **Taille maximale** : 16 384 px de côté ; en mégapixels selon la mémoire (24 Mpx jusqu’à 2 Go, 48 jusqu’à 4 Go, 80 au-delà, 64 si inconnue ; 16 sur iPhone/iPad, 16 ou 24 sur Android ; 200 Mpx pour `bicubic` et `nearest` sur ordinateur). Au-delà, `#runBtn` affiche « Trop grand : … » et ne lance rien.
* **Plusieurs passes** : un modèle ×4 fait deux passes pour ×8, un modèle ×2 en fait trois ; le temps augmente fortement.
* **Retouche en direct** : nécessite WebGL 2 et est désactivée au-delà de 60 Mpx (ordinateur).
* Messages d’erreur possibles dans `#toast` :
  * « Le moteur IA n’a pas pu se charger (connexion ou bloqueur de pubs ?). Recharge la page. »
  * « Téléchargement du modèle impossible. Vérifie ta connexion. »
  * « Plus assez de mémoire : réduis l’agrandissement ou la taille des tuiles. »
  * « Le calcul s’est arrêté (mémoire ?). Réessaie avec un facteur plus petit. »
  * « Agrandis d’abord au moins une image » (ZIP sans résultat).
  * « Annulé ».
* Si la carte graphique cale, l’app bascule sur le processeur et affiche « La carte graphique a calé, je continue sur le processeur (plus lent). ».

---

## 10. Logique à suivre pour chaque tâche

1. Identifie l’image et l’usage (écran, impression, client, commercial ou non).
2. Choisis le modèle selon le guide : photo propre → `usv2lite` (ou `clear` si rapide) ; photo abîmée → `nomos2` ; très compressée → `swin2sr` ; logo/aplats → `anime` ; ne rien inventer → `plksr4` ; pixel art → `nearest`. Vérifie la licence.
3. Fixe le facteur ou la largeur cible ; lis `#outInfo` (taille, passes, temps).
4. Agrandis, attends « Terminé », vérifie `#dims`.
5. Contrôle visuellement ; ajuste `#mix` si le rendu est trop artificiel.
6. Exporte dans le format et la résolution demandés ; vérifie le fichier.
7. Rends le fichier avec : modèle utilisé, facteur, dimensions, format, dpi, et toute réserve (détails inventés, licence non commerciale, pas un vectoriel).

---
---

# UPSCALER — AI AGENT GUIDE

This document is for AI agents (Claude Code, Codex, or any agent driving a browser through Playwright / CDP). It explains how to use **Upscaler** (`app.html`), Binks Design’s AI image upscaler: import images, pick a model, upscale, compare, fine-tune and export.

It lives in two places, always identical: `AGENTS.md` (Markdown, French then English) and the `agent/index.html` page. Short summary: `llms.txt`.

Entry points discoverable without JavaScript: `index.html` and `docs.html` declare `<link rel="alternate" type="text/markdown" href="AGENTS.md">`, `<link rel="help" href="agent/">` and `<link rel="alternate" type="text/plain" href="llms.txt">`, and contain an HTML comment and a `<noscript>` pointing here. `robots.txt` allows everything and mentions `llms.txt` and `AGENTS.md`.

---

## 1. Golden rule

Upscaler **enlarges** images the user provides. It is not an image generator nor a logo tool.

* **Never invent** an image, a logo, a colour, a font or brand copy. Files provided by the user **are the reference**: never replace them with a “similar” image found or generated elsewhere.
* Never present an upscale as a **vector**: the result is still a raster image. Do not redraw a provided logo or SVG; for a client logo, point out that the original vector file is preferable.
* AI can invent detail (texture, strokes, letters). When fidelity matters (packshot, document, archive, logo), use a faithful model (`plksr4`, `plksr2`) or lower **AI strength**, and tell the user.
* **Licences**: five models are **non-commercial** (CC BY-NC-SA): `usv2lite`, `ultrasharp`, `usv2`, `remacri`, `animesharp`. For commercial work, use another model or ask the user.
* **No API key, no account.** The app uses none; never ask the user for a key.
* **Images stay local**: nothing is uploaded to a server. Only the ONNX Runtime Web engine (jsDelivr CDN) and the models (Hugging Face) are **downloaded** to the browser.

After every action, check the state in the page (`#dims` text, `#toast`, `.m-card.sel`, downloaded file). **A click is not proof of success.**

---

## 2. Getting started

### Serve the app

The repository is static, with no build step: `index.html` (home), `app.html` (the app, one single file), `docs.html` (documentation), `agent/index.html` (this page), `AGENTS.md`, `llms.txt`, `robots.txt` and `assets/` (pages only).

```bash
python3 -m http.server 8000
# then open http://127.0.0.1:8000/app.html
```

* **http:// recommended.** `file://` also works, but only one CPU core is then used.
* **Internet connection required**: on load, the app downloads ONNX Runtime Web 1.30.0 from `cdn.jsdelivr.net`; the first time a model is used, it is downloaded from `huggingface.co` (1.7 to 69 MB) and kept in the browser cache. Without the engine, only `bicubic` and `nearest` work.
* On first launch, a hardware **mini-test** downloads ClearReality (1.7 MB) and measures speed: let it finish, or let the upscale wait for it.
* Use a window **at least 900 px wide, without touch**: below 900 px (or with a coarse pointer) the UI switches to mobile mode (sheets, tab bar) and export opens a share sheet instead of a direct download.
* Headless Chromium usually has no WebGPU: inference runs on the CPU, much more slowly. Allow long timeouts (several minutes for big models).
* Use a dedicated browser profile: settings are remembered per origin.

### No public API

Upscaler **has no public JavaScript API**. Drive it through the UI with the stable identifiers listed in § 4. To read state, the app also exposes an internal object `window.UP` (see § 6), not documented as an API: prefer read-only use.

---

## 3. Step by step

1. **Open** `app.html` and wait for the engine to load (`#engineHint` must not say “Moteur IA non chargé”).
2. **Import**: `setInputFiles('#file', [...])` (accepts `image/*`, several files). Or the samples: `#demoPhoto` / `#emptyDemo` (260 × 390 portrait), `#demoLogo` / `#emptyLogo` (170 × 170 logo, selects `anime`). The image shows up in `#queue` and becomes the selected image.
3. **Pick the model**: tab `.tab[data-tab="model"]`, then `.m-card[data-id="<id>"]` (or a `#guide` chip). Check `.m-card.sel`.
4. **Settings**: tab `.tab[data-tab="set"]`.
    * Factor: `#factorSeg button` whose text is `×2`, `×3`, `×4` or `×8` (the active button has class `on`).
    * Or exact width: fill `#customW` (16 to 32,000 px; empty or 0 = factor).
    * `#outInfo` shows the result size, number of passes and estimated time, or “Trop grand…”.
    * Sliders (`input type="range"`): `#denoise` (0–100, default 0), `#mix` AI strength (0–100, default 100), `#sharp` (0–100, default 0), `#grain` (0–100, default 0). To set one: `el.value = n; el.dispatchEvent(new Event('input', {bubbles: true}))`.
    * Transparency (only shown when the image has alpha): `#alphaSeg button[data-v="ai"|"fast"]`.
    * Engine: `#epSeg button[data-v="auto"|"webgpu"|"wasm"]`; tiles: `#tileSeg button[data-v="0"|"64"|"128"|"256"|"384"]`.
5. **Upscale**: `#runBtn` (or `Ctrl`/`Cmd` + `Enter`). While running, `#progress` is visible (`#pgTitle`, `#pgSub`: “tuile 8/15 · encore ~8 s”); `#pgCancel` cancels.
6. **Wait for the end**: `#toast` starts with “Terminé en … · W × H px”. `#dims` becomes `260 × 390 → 1 040 × 1 560`. A failure shows an error message in `#toast` (§ 9).
7. **Compare** (optional): `#compareBtn` (or key `C`), `#refSel` to choose the reference, zoom `[data-z="fit"|"1"|"2"|"4"]`.
8. **Export**: tab `.tab[data-tab="out"]`, format `#fmtSeg button[data-v="png"|"jpeg"|"webp"]`, quality `#qual` (50–100, JPEG/WebP), resolution `#dpiSeg button[data-v="72"|"150"|"300"]`, name `#fname`. Then `#exportOne` or `#exportBtn`: triggers a browser **download** (`download` event in Playwright).
9. **Batch**: `#runAll` (upscale all, skips images already done with this model and factor; final toast “N images agrandies”), then `#exportZip` or `#zipAll` → `upscaler-binks.zip`.

### Output files

* Default name: `<name>_x<factor>_<model-id>.<ext>`, e.g. `photo-exemple_x4_clear.png` (`#fname` changes it, without extension).
* Extension: `png`, `jpg` or `webp`. In JPEG, transparency becomes white.
* DPI is written into PNG (pHYs chunk) and JPEG (JFIF); it does not change pixels.
* ZIP: `upscaler-binks.zip`, one image per upscaled image, in the chosen format.
* Files go to the browser’s download folder: with Playwright, get them with `page.wait_for_event('download')` then `save_as()`.

---

## 4. Stable selectors

| Selector | Role |
| --- | --- |
| `#file` | hidden file input (`accept="image/*" multiple`) |
| `#drop` | “Importe tes images” zone (click or drop) |
| `#demoPhoto`, `#emptyDemo` | sample photo |
| `#demoLogo`, `#emptyLogo` | sample logo (switches to the `anime` model) |
| `#emptyImport` | opens the file picker (empty screen) |
| `#queue .q-item`, `.q-item.sel`, `.q-x` | image list, selected image, remove |
| `#clearAll` | remove all |
| `.tab[data-tab]` (`model`, `set`, `out`) | Model, Settings, Export tabs |
| `#guide .chip` | “Je veux agrandir…” guide |
| `.m-card[data-id]`, `.m-card.sel` | model cards, selected model |
| `#factorSeg button`, `#customW` | factor, exact width |
| `#denoise`, `#mix`, `#sharp`, `#grain`, `#qual` | sliders |
| `#alphaSeg`, `#epSeg`, `#tileSeg`, `#fmtSeg`, `#dpiSeg` (`button[data-v]`) | segmented choices |
| `#fname` | exported file name |
| `#runBtn`, `#runAll` | upscale, upscale all |
| `#pgCancel`, `#progress`, `#pgTitle`, `#pgSub`, `#pgBar` | progress |
| `#toast` | messages (done, export, errors) |
| `#dims`, `#outInfo`, `#printInfo` | sizes, estimated time, print size |
| `#exportBtn`, `#exportOne`, `#exportZip`, `#zipAll` | exports |
| `#compareBtn`, `#refSel`, `[data-z]` | compare, reference, zoom |
| `#hwBox`, `#benchBtn`, `#engineHint` | hardware, rerun mini-test, engine status |
| `#clearCache` | delete downloaded models |

### Model ids (`data-id`)

| id | Name | Factor | Size | Licence |
| --- | --- | --- | --- | --- |
| `general` | Real-ESRGAN General | ×4 | 4.9 MB | BSD-3 |
| `usv2lite` | UltraSharp V2 Lite | ×4 | 28.5 MB | CC BY-NC-SA (non-commercial) |
| `ultrasharp` | UltraSharp | ×4 | 64 MB | CC BY-NC-SA (non-commercial) |
| `usv2` | UltraSharp V2 Max | ×4 | 49.4 MB | CC BY-NC-SA (non-commercial) |
| `clear` | ClearReality | ×4 | 1.7 MB | Apache 2.0 |
| `clearsoft` | ClearReality Soft | ×4 | 1.7 MB | Apache 2.0 |
| `x4plus` | Real-ESRGAN x4plus | ×4 | 68.3 MB | BSD-3 |
| `plksr4` | RealPLKSR Fidèle x4 | ×4 | 28.3 MB | MIT |
| `plksr2` | RealPLKSR Fidèle x2 | ×2 | 28.3 MB | MIT |
| `nomos2` | Nomos2 | ×4 | 69.1 MB | CC BY 4.0 |
| `remacri` | Remacri | ×4 | 68.3 MB | CC BY-NC-SA (non-commercial) |
| `swin2sr` | Swin2SR anti-JPEG | ×4 | 52.5 MB | Apache 2.0 |
| `anime` | Real-ESRGAN Aplats | ×4 | 4.9 MB | BSD-3 |
| `apisr4` | APISR x4 | ×4 | 6.2 MB | GPL-3.0 |
| `apisr2` | APISR x2 | ×2 | 17.1 MB | GPL-3.0 |
| `animesharp` | AnimeSharp V3 | ×2 | 63.9 MB | CC BY-NC-SA (non-commercial) |
| `bicubic` | Bicubique (no AI) | free | — | — |
| `nearest` | Pixel art (no AI) | free | — | — |

Fast ones for testing or batches: `clear`, `clearsoft`, `general`, `anime`.

---

## 5. Persistent state

| Location | Key | Content |
| --- | --- | --- |
| `localStorage` | `binks-upscaler-v1` | JSON settings: `model`, `factor`, `customW`, `denoise`, `alpha`, `mix`, `sharp`, `grain`, `ep`, `tile`, `fmt`, `qual`, `dpi`, `compare` |
| `localStorage` | `binks-upscaler-hw` | hardware profile from the mini-test |
| `localStorage` | `binks-upscaler-speed` | measured speeds per model and engine |
| `localStorage` | `binks-upscaler-running` | marker set during a run; if still present on reload, the app switches to a safe mode (CPU or 64 px tiles) |
| Cache Storage | `binks-upscaler-models-v1` | downloaded `.onnx` files (`#clearCache` deletes them) |

**Images and results are not saved**: a reload clears them. Export before reloading or closing.

---

## 6. The internal `window.UP` object

The app exposes, as is, an internal object that is handy to **read** state. It is not a public API: no stability guarantee, and changing its values directly neither updates the UI nor saves settings.

```js
UP.items          // imported images: {id, name, w, h, alpha, results, res, …}
UP.cur            // selected image (or null)
UP.cur.res        // latest result: {model, name, F, W, H, secs, …} (or null)
UP.S              // current settings (same content as binks-upscaler-v1)
UP.Engine.ready   // true once the ONNX engine is loaded
UP.Engine.hw      // detected hardware: {gpu, cores, mem, threads}
UP.Engine.backend // 'webgpu' or 'wasm' for the last run
UP.pickModel(id)  // selects a model (same as clicking its card)
UP.run(UP.cur)    // starts the upscale (Promise; rejects on error)
```

Prefer clicks for anything that changes state; use `UP` to check (e.g. `UP.cur.res.W`).

---

## 7. Complete example (Playwright, Python)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    page.goto("http://127.0.0.1:8000/app.html")
    page.wait_for_function("window.UP && UP.Engine.ready", timeout=120_000)

    page.set_input_files("#file", "photo.jpg")
    page.click('.tab[data-tab="model"]')
    page.click('.m-card[data-id="clear"]')
    page.click('.tab[data-tab="set"]')
    page.click('#factorSeg button:has-text("×4")')
    page.click("#runBtn")
    page.wait_for_function(
        "document.querySelector('#toast').textContent.startsWith('Terminé')",
        timeout=900_000)
    print(page.inner_text("#dims"))          # e.g. 260 × 390 → 1 040 × 1 560

    page.click('.tab[data-tab="out"]')
    page.click('#fmtSeg button[data-v="png"]')
    page.click('#dpiSeg button[data-v="300"]')
    with page.expect_download() as d:
        page.click("#exportOne")
    d.value.save_as("photo_x4_clear.png")
    b.close()
```

---

## 8. Checks before handing back

* The downloaded file exists, opens, has the right format and **the expected dimensions** (width × factor, or the requested exact width).
* The model used is the one requested (`UP.cur.res.model`), and its licence fits the use (commercial or not).
* Look at the result at 100 % or 200 %: artefacts, invented detail, distorted letters, logo edges. Report what you see.
* If the live retouch (`#mix`, `#sharp`, `#grain`) was changed, say so: it is applied on export.
* Remind the user the result is a raster image, not a vector.

---

## 9. Limits and errors

* **Maximum size**: 16,384 px per side; in megapixels depending on memory (24 MP up to 2 GB, 48 up to 4 GB, 80 above, 64 if unknown; 16 on iPhone/iPad, 16 or 24 on Android; 200 MP for `bicubic` and `nearest` on desktop). Beyond that, `#runBtn` shows “Trop grand : …” and does nothing.
* **Multiple passes**: a ×4 model makes two passes for ×8, a ×2 model three; time grows sharply.
* **Live retouch**: needs WebGL 2 and is disabled above 60 MP (desktop).
* Possible error messages in `#toast`:
  * “Le moteur IA n’a pas pu se charger (connexion ou bloqueur de pubs ?). Recharge la page.” (engine failed to load)
  * “Téléchargement du modèle impossible. Vérifie ta connexion.” (model download failed)
  * “Plus assez de mémoire : réduis l’agrandissement ou la taille des tuiles.” (out of memory)
  * “Le calcul s’est arrêté (mémoire ?). Réessaie avec un facteur plus petit.” (worker died)
  * “Agrandis d’abord au moins une image” (ZIP with no result)
  * “Annulé” (cancelled)
* If the GPU stalls, the app falls back to the CPU and shows “La carte graphique a calé, je continue sur le processeur (plus lent).”.

---

## 10. Logic for every task

1. Identify the image and the use (screen, print, client, commercial or not).
2. Pick the model from the guide: clean photo → `usv2lite` (or `clear` for speed); damaged photo → `nomos2`; heavily compressed → `swin2sr`; logo/flat colours → `anime`; invent nothing → `plksr4`; pixel art → `nearest`. Check the licence.
3. Set the factor or target width; read `#outInfo` (size, passes, time).
4. Upscale, wait for “Terminé”, check `#dims`.
5. Inspect visually; lower `#mix` if the result looks too artificial.
6. Export in the requested format and resolution; check the file.
7. Hand back the file with: model used, factor, dimensions, format, DPI, and any caveat (invented detail, non-commercial licence, not a vector).
