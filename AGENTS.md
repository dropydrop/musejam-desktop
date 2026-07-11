# agents.md - MuseJam-Desktop

## 🎯 Vision du Projet

**MuseJam-Desktop** est un outil d'entraînement musical pour l'improvisation en session live. Il transforme la pratique instrumentale en jeu interactif où la génération aléatoire d'accords et le feedback visuel en temps réel créent un environnement d'apprentissage immersif.

> *"Un compagnon de pratique qui pousse à l'improvisation sans jamais juger, seulement guider."*

---

## 📦 Description Technique

### Stack Technologique
```
Frontend : HTML/CSS/TypeScript (Vanilla)
Framework : Tauri v2 (encapsulation desktop)
Audio : Web Audio API + Web MIDI API
Build : Vite + Tauri CLI
Langage : TypeScript (frontend) / Rust (backend Tauri, inchangé)
```

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                  MuseJam-Desktop                       │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │         TAURI SHELL (v2)                   │     │
│  │  ┌────────────────────────────────────┐    │     │
│  │  │    NAVIGATEUR EMBARQUÉ (WebView)   │    │     │
│  │  │  ┌──────────────────────────────┐  │    │     │
│  │  │  │     MUSEJAM APPLICATION       │  │    │     │
│  │  │  │                              │  │    │     │
│  │  │  │  • Séquenceur d'accords      │  │    │     │
│  │  │  │  • Piano roll visuel         │  │    │     │
│  │  │  │  • Générateur aléatoire      │  │    │     │
│  │  │  │  • Web MIDI API              │  │    │     │
│  │  │  │  • Web Audio API             │  │    │     │
│  │  │  └──────────────────────────────┘  │    │     │
│  │  └────────────────────────────────────┘    │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  Sortie : .exe / .dmg / .deb (fichier unique)      │
└─────────────────────────────────────────────────────┘
```

---

## 🎹 Fonctionnalités Clés

### 1. Séquenceur d'Accords
- Génération aléatoire d'accords (majeur, mineur, 7e, etc.)
- Personnalisation manuelle des accords
- Défilement rythmique des accords
- Indicateur visuel de l'accord courant

### 2. Feedback Visuel (Synthesia-like)
- Piano virtuel qui s'illumine en temps réel
- Visualisation des notes jouées
- Indicateur de progression rythmique
- Mode "guidé" avec notes à jouer

### 3. Interface de Contrôle
- Tempo ajustable (40-200 BPM)
- Sélection de la gamme/tonalité
- Paramètres de génération aléatoire
- Boutons de contrôle (Play/Pause/Stop)

### 4. Support MIDI
- Connexion automatique aux périphériques MIDI
- Détection des notes jouées
- Affichage des notes en temps réel
- Mapping dynamique des canaux MIDI

---

## 🧠 Philosophie d'Improvisation

### Pour l'Utilisateur
- **Zero Jugement** : Pas de score, pas de fautes, seulement des suggestions
- **Flow State** : Interface épurée, feedback immédiat
- **Progression Naturelle** : Complexité qui s'adapte au niveau

### Pour le Développeur
- **Code Simple** : JS/HTML/CSS, pas de sur-ingénierie
- **Iterations Rapides** : Hot-reload, modifications instantanées
- **Maintenable** : Structure claire, composants isolés

---

## 📁 Structure du Code

```
MuseJam-Desktop/
├── src-tauri/                    # Backend Tauri (inchangé)
│   ├── src/
│   │   └── main.rs              # On ne touche pas (sauf si besoin)
│   ├── Cargo.toml               # On ne touche pas
│   └── tauri.conf.json          # Configuration (fenêtre, permissions)
│
├── src/                          # Application MuseJam
│   ├── main.ts                  # Point d'entrée
│   ├── index.html               # Template HTML
│   │
│   ├── core/                    # Logique métier
│   │   ├── sequencer.ts        # Gestion du séquenceur
│   │   ├── chord-generator.ts  # Génération d'accords aléatoires
│   │   └── audio-engine.ts     # Web Audio API
│   │
│   ├── midi/                    # Gestion MIDI
│   │   └── midi-manager.ts     # Web MIDI API
│   │
│   ├── ui/                      # Interface utilisateur
│   │   ├── piano.ts            # Piano visuel
│   │   ├── controls.ts         # Contrôles (tempo, gamme, etc.)
│   │   └── display.ts          # Affichage des informations
│   │
│   ├── styles/
│   │   └── app.css             # Styles globaux
│   │
│   └── types/                   # Types TypeScript
│       └── index.ts            # Interfaces partagées
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Workflow de Développement

### Commandes Essentielles
```bash
# Développement (hot-reload)
npm run tauri dev

# Build de production
npm run tauri build

# Clean (si problème)
npm run tauri clean

# Lancer en mode debug
npm run tauri dev -- -- --debug
```

### Cycle de Développement
1. **Modification du code** dans `/src`
2. **Sauvegarde** → Hot-reload automatique
3. **Test** avec clavier MIDI ou souris
4. **Commit Git** après chaque fonctionnalité
5. **Build** pour tester l'application finale

---

## 🎨 Design Principles

### UI/UX
- **Minimaliste** : Seul l'essentiel est visible
- **Dark Theme** : Confort visuel pour les sessions nocturnes
- **Feedback Immédiat** : Chaque action a une réponse visuelle
- **Fullscreen** : Immersion totale (optionnelle)

### Accessibilité
- **Contrastes élevés** pour les couleurs
- **Polices lisibles** même à distance
- **Raccourcis clavier** pour les actions fréquentes

---

## 🔧 Configuration Tauri v2

### Permissions MIDI (tauri.conf.json)
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
    }
  }
}
```

### Points d'Attention
- **Web MIDI API** : Disponible nativement dans WebView
- **Web Audio** : Aucune permission spéciale requise
- **Fichiers locaux** : Accès via `fs` si nécessaire (à éviter)

---

## 🧪 Tests & Validation

### Scénarios de Test
1. **Démarrage** : L'application s'ouvre en plein écran
2. **MIDI** : Connexion automatique au clavier
3. **Audio** : Son correct, pas de crackling
4. **Séquenceur** : Les accords changent au rythme défini
5. **Visuel** : Le piano s'illumine en synchronisation
6. **Contrôles** : Tous les boutons répondent
7. **Performance** : CPU < 20%, RAM < 200MB

### Métriques de Performance
- **Latence MIDI → Audio** : < 30ms (acceptable)
- **Temps de démarrage** : < 2 secondes
- **Taille du .exe** : < 10MB (Tauri est léger)

---

## 🛠️ Maintenance & Évolutions

### Short Term (V1)
- ✅ Séquenceur d'accords
- ✅ Support MIDI
- ✅ Interface piano
- ✅ Contrôles de base

### Medium Term (V2)
- 🔄 Enregistrement des sessions
- 🔄 Export MIDI
- 🔄 Thèmes personnalisables
- 🔄 Mode "exercice" avec progression

### Long Term (V3)
- 🔄 Collaboration en réseau
- 🔄 Plugins d'effets audio
- 🔄 Intelligence artificielle (suggestions avancées)

---

## 📚 Ressources & Références

### Documentation
- [Tauri v2](https://v2.tauri.app/)
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Inspirations
- **Neothesia** : Visualisation piano en temps réel
- **Synthesia** : Apprentissage ludique du piano
- **iReal Pro** : Génération de grilles d'accords

---

## 🎯 Critères de Réussite

### Pour l'Utilisateur
- [ ] Pratique 15+ minutes par session
- [ ] S'améliore visiblement en improvisation
- [ ] Revient régulièrement pour s'entraîner

### Pour le Développeur
- [ ] Code maintenable et documenté
- [ ] Build fonctionnel (Windows, Mac, Linux)
- [ ] Temps de développement < 72 heures

---

## 💡 Philosophie du Vibe Coding

> *"Le code doit servir la créativité, pas l'inverse."*

- **Prototypage Rapide** : Faire fonctionner d'abord, optimiser ensuite
- **Simplicité** : Utiliser ce qu'on maîtrise (JS/HTML/CSS)
- **Pragmatisme** : Le "bon" code est celui qui marche aujourd'hui
- **Itération** : Améliorer progressivement, fonction par fonction

---

## 🚨 Risques & Mitigations

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Bug MIDI | Moyenne | Logs clairs, fallback (pas de MIDI = mode souris) |
| Latence audio | Faible | Web Audio API optimisée, buffer size adapté |
| Crash Tauri | Faible | Clean & rebuild, vérifier les permissions |
| Abandon | Élevée | MVP en 3 jours, dopamine immédiate |

---

## 📝 Note Finale

**MuseJam-Desktop** n'est pas juste une application. C'est un **compagnon musical**, un **outil de flow**, une **porte vers l'improvisation**.

Construis-le avec amour, utilise-le avec passion, partage-le avec générosité.

---

*"La musique, c'est l'espace entre les notes."* — Claude Debussy
