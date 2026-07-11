# musejam-desktop 🤘🎹

---

## 📌 Plan Initial - Comparaison des 3 Options

### 1. Le Conflit : Performance Brute vs Agilité de Dev

| Dimension | Option A : Le Full Native (Rust/C++) | Option B : Le Full Web (JS/Tauri Light) | Option C : L'Hybridation Assistée (Web + Moteur Rust Existant) |
| --- | --- | --- | --- |
| **Vitesse de Dev** | 🔴 **Très lente.** Courbe d'apprentissage brutale (gestion mémoire, compilation). | 🟢 **Ultra-rapide.** Tu maîtrises déjà, itérations instantanées avec les LLM. | 🟡 **Modérée.** Tu "vibe code" en demandant à l'IA d'adapter des structures existantes. |
| **Performance Audio** | 🟢 **Maximale.** <10ms, drivers ASIO, pas de saccades. | 🟡 **Moyenne.** 15 à 30ms, sujet aux micro-ralentissements du navigateur. | 🟢 **Maximale.** <10ms, le flux audio/MIDI critique reste dans le moteur Rust. |
| **Rendu Visuel** | 🔴 **Rigide.** Interfaces lourdes et complexes à coder à la main. | 🟢 **Fluide & Libre.** CSS/JS total pour tes touches de piano qui s'allument. | 🟢 **Fluide & Libre.** Le JS gère le visuel, le Rust lui envoie les événements. |

---

### 2. Les Dilemmes de l'Usage et de l'UX (L'Improvisation Live)

Pour intégrer un retour visuel en temps réel (type Synthesia) avec des boucles infinies et de la génération d'accords randomisés, chaque route a son prix :

```
[Option 1: L'Export]   Web App MuseJam ──(Export .mid)──> Logiciel Tiers (Neothesia) ──> Jeu
                       * Verdict : Tue l'inspiration. L'enchaînement "Export > Import" brise la spontanéité.

[Option 2: Le Pivot]  Web App encapsulée (Tauri Light) ──(Web MIDI API)──> Rendu CSS/JS ──> Jeu
                       * Verdict : 100% JS (0 Rust). Simple et rapide à coder, mais latence de 20ms+ instable.

[Option 3: L'Alpha]   Clavier MIDI ──> Moteur Rust (Inspiré du code Neothesia) ──> Audio (0 latence)
                                             │
                                             └──(Pont IPC Tauri <1ms)──> UI Web MuseJam (CSS)
                       * Verdict : Le compromis parfait. Audio pro sans latence + interface web dynamique.
```

---

### 3. Le Facteur LLM : Dompter le Biais de l'IA

- **La limite physique :** Ton agent IA est un expert abstrait. **Le monde physique (les microsecondes de latence, les interruptions de la carte son) lui échappe totalement**. Il ne "sent" pas le temps réel.
- **La stratégie du "Copy-Cat" (Option C) :** Pour éviter que l'IA ne génère du code système instable, la solution est de la nourrir avec le code source de projets open source existants (*Neothesia*, *Rusthesia*, *midir*). Tu l'utilises comme un traducteur/adaptateur : *"Voici un moteur MIDI stable en Rust. Ne touche pas à sa logique, crée simplement le pont Tauri pour envoyer ces données à mon interface JS."*

---

## 🎯 Analyse et Décision Stratégique

### Diagnostic Brut

L'Option C est un **piège à motivation** déguisé en solution parfaite.

```
Option C = Le Graal Technique = L'Enfer du Vibe Coding

Rust + MIDI + Tauri + Audio temps réel + IA qui hallucine
= 5 couches de complexité qui peuvent exploser en cascade
```

### Matrice Décisionnelle Réaliste

| Option | Durée Dev | Risque Abandon | Performance | Ce que tu Perds | Ce que tu Gagnes |
|--------|-----------|----------------|-------------|-----------------|------------------|
| **B1 : Full Web (Navigateur)** | 2-3 jours | 🟢 **Très Faible** | 20-30ms | Latence parfaite | Liberté totale, itérations infinies |
| **B2 : Tauri Light (JS uniquement)** | 3-5 jours | 🟢 **Faible** | 15-25ms | Un peu de perf | .exe standalone, Web MIDI natif |
| **C : Rust + Tauri** | 2-4 semaines | 🔴 **Très Élevé** | <10ms | Sanité mentale | La perf ultime |

### Le Vrai Dilemme

> **"Est-ce que 10ms de latence en moins valent le risque de tout abandonner ?"**

**Test de Réalité :**
- **Full Web** : Tu as **déjà** un séquenceur qui fonctionne
- **Full Web** : Tu peux itérer en **30 secondes** (F5)
- **Full Web** : L'IA comprend **parfaitement** le code
- **Full Web** : Si tu bloques, tu changes 3 lignes et ça repart

**Rust** : La moindre erreur de borrowing = 2h de debug
**Rust** : L'IA te sortira des solutions qui ne compilent pas
**Rust** : Tu vas passer plus de temps à "faire compiler" qu'à "créer"

---

## 🏆 Décision Finale : Option B2 - Tauri v2 Light

### Pourquoi c'est le **meilleur compromis** :

```
┌────────────────────────────────────────────────┐
│              TAURI LIGHT (JS Only)             │
│                                                │
│  ┌──────────────────┐   ┌──────────────────┐   │
│  │  NAVIGATEUR WEB  │   │  TAURI SHELL     │   │
│  │  (MuseJam UI)    │◄──│  (.exe wrapper)  │   │
│  │                  │   │                  │   │
│  │  Web MIDI API    │   │  Fichier unique  │   │
│  │  AudioContext    │   │  Pas de Rust     │   │
│  └──────────────────┘   └──────────────────┘   │
└────────────────────────────────────────────────┘
```

### Avantages Concrets :

1. **✅ Zéro Rust** = Zéro frustration système
2. **✅ Ton code MuseJam actuel** = Copier-coller direct
3. **✅ Web MIDI API** = Support natif des claviers MIDI
4. **✅ 15-20ms** = Parfaitement jouable pour l'improvisation
5. **✅ .exe portable** = Partageable avec tes potes
6. **✅ IA maîtrise JS/Web Audio** = Elle te sort des solutions en 1 prompt

### Inconvénients Acceptables :
- ❌ Latence un peu plus élevée que Rust
- ❌ Pas de drivers ASIO natifs
- ❌ Gestion audio dépend du navigateur

---

## 📋 Plan d'Action (3 Jours Max)

### Jour 1 : L'Installation 🚀

```bash
# Créer le projet Tauri v2
npm create tauri-app@latest musejam-desktop -- --template vanilla-ts --manager npm

# Installer les dépendances
cd musejam-desktop
npm install

# Lancer en mode dev (hot-reload activé)
npm run tauri dev
```

**Vérifications :**
- [ ] La fenêtre Tauri s'ouvre
- [ ] Le message "Hello World" s'affiche
- [ ] Hot-reload fonctionne (modifie le HTML, ça se rafraîchit)

---

### Jour 2 : Le Portage de MuseJam 🎨

```bash
# Copier ton code MuseJam existant dans src/
cp -r ../musejam-web/* src/

# Adapter index.html si nécessaire
# Vérifier que tout s'affiche
npm run tauri dev
```

**Points d'attention :**
- Adapter les chemins des assets (images, polices)
- Vérifier que les imports fonctionnent
- Tester l'interface sans MIDI (mode souris/clavier)

**Fréquence de sauvegarde :** Toutes les 15 min, commit Git après chaque étape

---

### Jour 3 : MIDI + Finalisation 🎹

**Ajouter le support MIDI :**

```typescript
// src/components/midi.ts - Web MIDI API
export class MIDIManager {
    private midiAccess: MIDIAccess | null = null;
    
    async init(): Promise<void> {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupInputs();
            console.log('✅ MIDI initialisé');
        } catch (error) {
            console.warn('⚠️ MIDI non disponible:', error);
        }
    }
    
    private setupInputs(): void {
        if (!this.midiAccess) return;
        
        const inputs = this.midiAccess.inputs.values();
        for (const input of inputs) {
            input.onmidimessage = (event) => {
                const [status, note, velocity] = event.data;
                if (status === 0x90 && velocity > 0) {
                    this.handleNoteOn(note, velocity);
                } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
                    this.handleNoteOff(note);
                }
            };
        }
    }
    
    private handleNoteOn(note: number, velocity: number): void {
        window.dispatchEvent(new CustomEvent('midi-note-on', {
            detail: { note, velocity }
        }));
    }
    
    private handleNoteOff(note: number): void {
        window.dispatchEvent(new CustomEvent('midi-note-off', {
            detail: { note }
        }));
    }
}
```

**Build final :**
```bash
npm run tauri build
# -> Le .exe est dans src-tauri/target/release/
```

---

## 🧠 Stratégie IA pour Tauri Light

### Prompt Magic (À Copier-Coller Exactement)

```
J'ai une application web MuseJam existante avec :
- Un séquenceur d'accords aléatoires
- Une interface piano visuelle
- Un lecteur audio (Web Audio API)
- Du CSS personnalisé

Je veux l'encapsuler dans Tauri v2 (JS uniquement, pas de Rust).

Structure :
- Projet créé avec : npm create tauri-app@latest -- --template vanilla-ts
- Je veux garder mon code frontend existant
- Ajouter le support MIDI via Web MIDI API
- L'application doit s'ouvrir en plein écran

Voici mon code actuel :
[COLLER ICI : index.html, sequencer.js, piano.js, app.css]

Génère-moi les fichiers modifiés pour que tout fonctionne dans Tauri v2.
```

### L'IA va te donner :
- ✅ Du code qui **fonctionne du premier coup**
- ✅ Des solutions **standards** (pas d'expérimentation Rust)
- ✅ Une **documentation** automatique
- ✅ Des **fixes rapides** si bug (parce qu'elle connaît le domaine)

---

## 🛡️ Configuration Tauri v2

### Permissions (tauri.conf.json)

```json
{
  "tauri": {
    "windows": [
      {
        "title": "MuseJam-Desktop",
        "width": 1280,
        "height": 720,
        "fullscreen": true,
        "resizable": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    },
    "allowlist": {
      "all": false,
      "window": {
        "all": false,
        "setFullscreen": true,
        "setDecorations": true,
        "setResizable": true
      }
    }
  }
}
```

**Important :** La Web MIDI API est **native** au navigateur, pas besoin de permissions spéciales dans Tauri !

---

## 📂 Structure Finale

```
musejam-desktop/
├── src-tauri/              ← LAISSE TRANQUILLE
│   ├── src/
│   │   └── main.rs         ← On ne touche pas
│   ├── Cargo.toml          ← On ne touche pas
│   └── tauri.conf.json     ← Configuration (fenêtre, permissions)
│
├── src/                    ← TON CODE MUSEJAM ICI
│   ├── main.ts             ← Point d'entrée
│   ├── index.html          ← Template HTML
│   ├── components/
│   │   ├── sequencer.ts    ← Ton séquenceur existant
│   │   ├── piano.ts        ← Visualisation piano
│   │   └── midi.ts         ← Web MIDI API (à créer)
│   ├── styles/
│   │   └── app.css         ← Ton CSS existant
│   └── types/
│       └── index.ts        ← Types partagés
│
├── package.json
└── vite.config.ts          ← Config Vite (transparent)
```

---

## 🆘 En Cas de Blocage

### Si l'IA te donne du code qui ne marche pas :

```bash
# 1. Copier l'erreur complète
# 2. Dans le prompt, ajouter :
"Voici l'erreur que j'obtiens : [COLLER L'ERREUR]
Corrige le code en fonction."

# 3. Si ça persiste, demander une approche alternative :
"Est-ce qu'on peut faire ça différemment ? Peut-être avec une approche plus simple ?"
```

### Si Tauri refuse de compiler :

```bash
# Nettoyer et réinstaller
npm run tauri clean
rm -rf node_modules
npm install
npm run tauri dev
```

### Si le MIDI ne fonctionne pas :

```javascript
// Vérifier que le navigateur supporte Web MIDI API
if (navigator.requestMIDIAccess) {
    console.log('✅ MIDI supporté');
} else {
    console.warn('⚠️ MIDI non supporté par ce navigateur');
}

// Ajouter un fallback (clavier virtuel)
document.addEventListener('keydown', (e) => {
    // Simuler une note MIDI avec le clavier QWERTY
    const note = mapKeyToNote(e.key);
    if (note) handleNoteOn(note, 100);
});
```

---

## 🎯 Ce Que Tu Auras

```
✅ musejam-desktop.exe (Windows) / .dmg (Mac) / .deb (Linux)
✅ Interface MuseJam identique
✅ Support MIDI plug-and-play (détection automatique)
✅ Latence ~15-20ms (parfaitement jouable pour l'impro)
✅ Pas de code Rust à maintenir
✅ Source modifiable à l'infini
✅ Fichier unique, portable, sans installation
```

---

## 💪 La Mentalité Gagnante

> **"Je ne touche pas à Rust. Je construis une application qui fonctionne. La perfection technique, c'est pour plus tard si j'en ai envie."**

**Rappelle-toi :**
- MuseJam **existe déjà** et fonctionne en web
- Tauri Light c'est juste **emballer** ce qui existe
- Le MIDI en JS c'est **solide** et bien documenté
- Tu vas **finir** ce projet et être **fier**

---

## 🚨 Derniers Conseils de Pro

1. **Fais un commit Git après chaque étape fonctionnelle**
2. **Garde ton projet MuseJam original intact** (copie pas, clone)
3. **Teste avec et sans clavier MIDI** (fallback si pas de MIDI)
4. **Ajoute un petit loader** pour que l'utilisateur sache que l'app démarre
5. **Ajoute `"fullscreen": true`** dans `tauri.conf.json` pour l'immersion
6. **Pense à l'icône de l'application** (remplace `icon.png` par défaut)

---

## 🚀 Commence Maintenant

```bash
# Ne réfléchis plus. Tape ça :
npm create tauri-app@latest musejam-desktop -- --template vanilla-ts --manager npm

cd musejam-desktop
npm install
npm run tauri dev

# Dans 72h, tu auras ton .exe
```

**La perfection est l'ennemie du bien. 15ms de latence, c'est déjà du bonheur.**

---

```markdown

# musejam-desktop 🤘🎹

---

## 🎯 Vision Produit : MuseThesia

**Objectif :** Mode "MuseThesia" = vue Synthesia-like avec défilement des notes du séquenceur, synchronisé BPM, loop infinie, plein écran.

**Architecture MVP :**
```
Séquenceur MuseJam → Scheduler Audio → UI MuseThesia (piano + notes défilantes)
```

**Choix techniques :**
- Génération MIDI : Stream en temps réel (Option B)
- Moteur audio : Web MIDI API + AudioContext (Option A)
- UI : Canvas ou DOM (à définir)

---

## 📋 Plan d'Action Réalisé

### ✅ Étape 1 : Projet Tauri + Portage
- [x] Création projet Tauri v2
- [x] Portage de MuseJam (single-file HTML → src/)
- [x] CSS/UI fonctionnelle

### ✅ Étape 2 : MIDI
- [x] Web MIDI API avec `midi-manager.ts`
- [x] Détection périphériques (2 claviers détectés)
- [x] Écouteurs `midi-note-on/off` sur document (fix du bug window→document)
- [x] Indicateur MIDI en bas à droite

### 🚧 Étape 3 : Lecture Audio du Séquenceur (en cours)
- [ ] Jouer les notes des accords sur les temps marqués "1"
- [ ] Synchronisation BPM
- [ ] Web Audio API (oscillateurs)

### ⏳ Étape 4 : UI MuseThesia
- [ ] Piano 88 touches
- [ ] Notes défilantes (style Synthesia)
- [ ] Bascule entre vue séquenceur et vue Thesia
- [ ] Plein écran, loop infinie

---

## 🛠️ Structure du Code

```
src/
├── main.ts          # Code MuseJam + audio + MIDI (single file pour l'instant)
├── midi-manager.ts  # Web MIDI API
├── index.html       # UI complète
└── styles.css       # CSS
```

---

## 🔧 Problèmes Résolus

1. **MIDI CustomEvents** : window.dispatchEvent → document.dispatchEvent (pour que main.ts les capte)
2. **Portage single-file** : tout dans `main.ts` + `index.html`

---

## 📝 Prochaines Étapes

1. Terminer lecture audio du séquenceur (en cours avec agent)
2. Créer vue MuseThesia
3. Synchroniser séquenceur ↔ Thesia ↔ BPM
4. Boucle infinie + plein écran
5. Build final `.exe`

---

## 🚀 Commandes

```bash
npm run tauri dev   # Dev avec hot-reload
npm run tauri build # Build .exe
```

---

*Let's Jam ! 🤘🎹*
```
