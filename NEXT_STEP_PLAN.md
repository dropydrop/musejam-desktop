🎯 Plan Post-MVP


🟡 Haute : Contraintes \& Défi enrichis

Objectif : Remplacer les textes actuels (parfois trop techniques) par des invites simples, inspirantes, actionnables.


Exemples :

"Joue une note par temps" → "Tiens-toi au rythme"

"Syncope obligatoire" → "Joue une note en décalé sur le 2e temps"

"Varie les nuances" → "Joue une phrase forte puis une phrase douce"


À faire :

Réécrire les listes CONTRAINTES et DEFIS dans main.ts

Ajouter 5-6 invites par niveau (doux, medium, spicy)

Les textes doivent parler à un musicien débutant/intermédiaire


🟡 Haute : Export MIDI (+ 3h optionnel pour plus tard)

Objectif : Exporter la progression + patterns en fichier .mid (standard MIDI file).

À faire :

Bibliothèque : midi-file (npm) ou générer manuellement

Exporter : notes jouées sur les temps marqués "1"

Bouton dans la topbar : "💾 Export MIDI"

Sauvegarde automatique dans \~/Downloads/musejam-session-xxx.mid



🟡 Moyenne : Rendu des notes défilantes

Objectif : Affiner le rendu visuel (moins de scintillement, plus de clarté).

À faire :

Envoie-moi des screenshots → je te dirai précisément ce qui cloche

Peut-être un problème d'anti-aliasing, de vitesse, ou de couleurs


🔵 Basse : Zoom/Dézoom UI

Objectif : Agrandir/réduire la taille des touches de piano et des notes défilantes.

À faire :

Molette de souris ou boutons + / -

Modifier l'échelle du canvas/défilement



⚪ À éclaircir : Intégration VST

Usages possibles :

Jouer le séquenceur avec un vrai synthé (ex: Vital, Serum) plutôt qu'avec l'oscillateur basique de Web Audio

Envoyer le MIDI vers un VST externe via loopMIDI

Bref : Pas du tout prioritaire, on oublie pour l'instant.


📋 Ordre d'Attaque Recommandé

🟡 Contraintes \& Défi enrichis (1h)

🟡 Rendu des notes défilantes plus joli

🟡 Export MIDI (+3h et optionnel musejam est fait pour jouer en impro en synchro avec le clavier MIDI pas pour exporter, a reporter pour plus tard)

🔵 Zoom (optionnel)


(optionnel) UNE FOIS SORTI DU MODE MVP SEULEMENT (APP ASSEZ PROCHE DE SON ETAT FINAL) :

1.  \*\*Gestion d'État centralisée\*\* : Toute la logique d'état (séquenceur, piano, audio) est dans `main.ts`. À mesure que de nouvelles fonctionnalités arrivent, ce fichier risque de devenir très dense. Une réflexion vers un store simple ou une séparation plus granulaire serait bienvenue.

2\.  \*\*Typage TypeScript\*\* : Le `@ts-nocheck` en haut de `main.ts` est un signal d'alerte : le typage n'est pas encore totalement maîtrisé sur les parties complexes. C'est une dette technique mineure mais qu'il faudra rembourser pour sécuriser les évolutions.

PAS de refactoring avant une version avancé et stable, ni de chasse au @ts-nocheck. Dans une dynamique de flux et de fonctionnalités (le visuel orange, les invites textuelles poétiques, l'export). Nettoyer le code maintenant, c'est le meilleur moyen de casser l'élan. Laisse le gros fichier et le nocheck tranquille tant que l'IA s'y retrouve en un seul prompt. Plus tard.