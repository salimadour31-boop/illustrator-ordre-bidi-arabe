# Ordre des nombres et du latin dans le texte arabe — script Adobe Illustrator

**OrdreBidiArabe.jsx** v1.0.0 — remet dans le bon ordre, à l'intérieur des paragraphes arabes, les numéros de téléphone, les nombres à espaces, les quantités avec unité latine, les noms et codes latins avec chiffres, les @comptes et #mots-dièse que l'algorithme bidirectionnel affiche à l'envers (« +213 550 12 34 56 » lu « 56 34 12 550 213+ »). Le texte n'est jamais modifié : seule la Direction des caractères change, et seulement là où l'affichage est réellement faux.
*Puts phone numbers, space-grouped numbers, quantities with Latin units, Latin names/codes with digits, @handles and #hashtags back in reading order inside Arabic paragraphs, where the bidi algorithm scrambles them. Text is never changed: only Character Direction, and only where the display is really wrong (FR/EN dialog).*

## Le problème

Dans un paragraphe arabe (sens de droite à gauche), Illustrator applique l'algorithme bidirectionnel Unicode. Les chiffres, les espaces, « + », « - », « % » et les mots latins n'ont pas de sens propre fort, et l'algorithme les range parfois dans un ordre que personne n'a voulu :

| Tapé | Ce que le lecteur voit dans un paragraphe arabe |
|---|---|
| `الهاتف: +213 550 12 34 56` | `56 34 12 550 213+` |
| `(021) 23 45 67` | `67 45 23 (021)` |
| `السعر 1 500 000 دج` | `000 500 1` |
| `30 x 40 cm` | `x 40 cm 30` |
| `1 500 DA` / `500 ml` | `DA 500 1` / `ml 500` |
| `-5 °C` / `+20%` | `C° 5-` / `%20+` |
| `100% Natural` / `7 Up` / `2 en 1` | `Natural %100` / `Up 7` / `en 1 2` |
| `@amwanes_2026` / `#Algerie2026` | `amwanes_2026@` / `Algerie2026#` |
| `٠٥٥٠ ١٢ ٣٤ ٥٦` | `٥٦ ٣٤ ١٢ ٠٥٥٠` |

La seule solution est de sélectionner chaque séquence **à la main**, puis menu du panneau Caractère > **Direction des caractères de gauche à droite**. Sur une carte de visite, un menu, une affiche ou un emballage bilingue (ingrédients, valeurs nutritives, numéros de lot, contacts), c'est long, facile à oublier, et impossible à vérifier pour un graphiste ou un imprimeur qui ne lit pas l'arabe. L'erreur inverse est fréquente aussi : on règle « De droite à gauche » sur tout un bloc ou dans un style, et les chiffres s'inversent (`2026` affiché `6202`).

## Ce que fait le script

1. Pour chaque paragraphe arabe (sens du paragraphe **de droite à gauche**, composeur Moyen-Orient), il repère les séquences qui doivent se lire de gauche à droite, par catégorie :
   - **Téléphones / fax** : `+213 550 12 34 56`, `00213…`, `0550 12 34 56`, `(021) 23 45 67`, `021.23.45.67`, aussi en chiffres ٠١٢٣ ;
   - **Nombres à espaces ou à signe** : `1 500 000`, `-5`, `+20%` ;
   - **Quantités avec unité latine** : `500 ml`, `1,5 L`, `30 x 40 cm`, `1 500 DA`, `-5 °C`, `25 kg`, `4 Go`… ;
   - **Noms, modèles et codes latins** : `100% Natural`, `7 Up`, `2 en 1`, `3 Suisses`, références et codes ;
   - **E-mails, sites, @comptes, #mots-dièse** ;
   - **Plages et listes** (`10 - 20`, `08:00 – 17:00`, `3, 5, 7`, `E330, E202`) : **décoché par défaut**, car en arabe une plage ou une liste se lit normalement de droite à gauche (le premier élément à droite). Sans cette option, le script coupe les séquences aux séparateurs de liste et de plage, et ne colle pas des nombres voisins qui ne sont pas des milliers.
2. Il **simule l'algorithme bidirectionnel Unicode (UAX #9)** sur le paragraphe entier — classes de caractères, règles W1–W7, paires de parenthèses N0, N1–N2, niveaux, réordonnancement par ligne aux sauts de ligne forcés, directions déjà forcées — et ne garde que les séquences **réellement affichées dans le désordre**. `iPhone 15 Pro`, `Windows 11`, `EXP 12/2027`, `contact@site.dz`, `Coca Cola` ou `Tél : 0550 12 34 56` s'affichent déjà bien (la lettre latine qui précède « tire » les chiffres) : ils ne sont pas touchés.
3. Il applique à ces séquences, et à elles seules, la **Direction des caractères : de gauche à droite** (la méthode recommandée par les experts Adobe), puis revérifie par simulation que le résultat se lit bien de gauche à droite. Les parenthèses qui entourent une séquence restent au texte arabe (elles sont retournées correctement par l'algorithme).
4. Option (cochée) : il **annule les directions forcées qui inversent** — chiffres ou latin forcés « de droite à gauche » (`2026` vu `6202`), mots arabes forcés « de gauche à droite » (lettres à l'envers) — en les remettant en direction par défaut, puis refait l'étape 3.

**Boutons** :
- **Analyser** : ne modifie rien ; liste, pour chaque bloc, ce que le lecteur voit aujourd'hui et ce qu'il verra après (« vu « 56 34 12 550 213+ » → « +213 550 12 34 56 » »), avec les totaux par catégorie ; propose ensuite « Appliquer maintenant » ;
- **Sélectionner les textes** : sélectionne les blocs à corriger ;
- **Rétablir** : remet les directions d'origine des caractères modifiés (sauvegardées dans une étiquette invisible du bloc), si le texte n'a pas changé de longueur depuis ;
- **Appliquer**.

Options : repères sur un calque non imprimable (cadre orange = à corriger, vert = corrigé, rouge = séquence non corrigeable), rapport .txt. Portée : sélection (blocs, groupes, ou texte sélectionné à l'outil Texte → tout l'article), calque actif ou document. Objets et calques verrouillés ou masqués ignorés ; blocs liés traités une fois par article. Le contenu du texte, la police et les autres attributs ne sont jamais touchés. Les réglages sont mémorisés dans un petit fichier local (dossier des données utilisateur). Aucun appel réseau, aucune collecte de données.

Paragraphes ignorés et signalés : paragraphes arabes sans composeur Moyen-Orient (lettres non liées : à régler d'abord, par exemple avec ReparerTexteArabeRTL.jsx), paragraphes surtout arabes mais en sens de gauche à droite.

## Pourquoi c'est nouveau

Vérifié le 17 octobre 2026 :

- **Illustrator** n'a pas de GREP ni de styles GREP ; la seule méthode documentée est manuelle (Aide Adobe « Texte arabe et hébreu » : « pour insérer des dates ou des nombres, spécifiez la direction au niveau du caractère »). Adobe Community : « Arabic typing number » (sélectionner les chiffres et le tiret, appliquer la direction gauche à droite à la main), « Problems with digits in arabic and other RTL languages » (un studio d'emballage qui ne lit pas l'arabe, règle une barre de fraction en LTR par un style « en espérant ne rien casser »), « Apply Character direction to textframe characters via Extendscript » (sttk3, 2024 : comment écrire la propriété `dirOverride` sur une sélection, sans détection). Demande UserVoice « Arabic language management in non-Arabic versions » : texte d'emballage arabe « très frustrant » dès qu'il contient un nombre ou un point.
- **GitHub** : recherche de code `DirOverrideType` et `dirOverride` : uniquement des fichiers d'auto-complétion / typages, le code interne des Bibliothèques CC (application d'un style enregistré) et un serveur MCP qui expose l'attribut ; aucun script qui repère ou corrige les séquences mal ordonnées. Aucun dépôt « bidi illustrator », « arabic numbers illustrator », « rtl numbers indesign script ».
- **Scripteurs connus** (creold, Hiroyuki Sato, John Wundes, Alexander Ladygin, wckdtall, Kelso, Josh Duncan, sttk3, ten-artai) et **boutiques** (aescripts, Astute Graphics) : rien sur le sens des nombres dans l'arabe ; Astute QuickOps « Text-Aware Reflect » inverse une mise en page, autre sujet.
- **Ailleurs** : InDesign règle cela par des styles GREP avec un style de caractère « gauche à droite » ; sur le web, `unicode-bidi: isolate` / balises `<bdi>` (W3C « Inline bidi markup », RTL-Ready) — rien de tout cela n'existe dans Illustrator.
- Distinct des autres scripts du même auteur : ReparerTexteArabeRTL.jsx (composeur, sens du paragraphe, texte collé en ordre visuel), TypographieArabe.jsx (ponctuation, espaces, caractères invisibles), CoherenceLangues.jsx (compare les nombres entre versions linguistiques).

Rejeté cette exécution car déjà existant : recherche des polices installées qui contiennent tous les caractères d'un texte (kabyle ɛ ɣ, tifinagh, ڨ ڥ) — BabelMap « Font Coverage » (Windows), Visualiseur de caractères de macOS (« Variantes de police »), Adobe Fonts « Glyph Finder », astuce du menu des polices (Adobe Community « Find a font that has specific glyph », 2026) ; correction verticale des signes arabes empilés — options natives de position des signes diacritiques des fonctions Moyen-Orient (`DiacVPosType` dans l'API).

## Installation

- **Ponctuelle** : Fichier > Scripts > Autre script…, puis choisir `OrdreBidiArabe.jsx`.
- **Permanente** : copier le fichier dans le dossier `Presets/<langue>/Scripts` d'Illustrator (par exemple `Adobe Illustrator 2026/Presets/fr_FR/Scripts`, ou `ar_AE`, `en_US`…), puis redémarrer Illustrator. Le script apparaît dans Fichier > Scripts.

## Utilisation

1. Travaillez sur une **copie** du document.
2. Sélectionnez des blocs de texte, ou rien et choisissez Calque actif ou Document.
3. Lancez le script, laissez les catégories cochées (cochez « Plages et listes » seulement si vous voulez aussi `10 - 20` de gauche à droite), cliquez sur **Analyser** et lisez la colonne « vu → après ».
4. **Appliquer** (ou « Appliquer maintenant » depuis l'analyse). Ctrl+Z / Cmd+Z annule ; selon la version d'Illustrator, plusieurs annulations peuvent être nécessaires — sinon utilisez **Rétablir**.

## Version cible et statut des tests

- Cible : Adobe Illustrator CC 2018 à 2026 (ExtendScript ES3), Windows et macOS, **avec les fonctions de texte Moyen-Orient** (direction des caractères et sens des paragraphes ; version Moyen-Orient, ou options de droite à gauche activées dans Préférences > Texte des versions récentes). Sans elles, le script s'arrête avec un message.
- **Non testé dans Illustrator.**
- Vérifié :
  - syntaxe ES3 et ES5 (acorn) ;
  - moteur bidirectionnel comparé à **bidi-js** (implémentation de référence d'UAX #9) sur 6 000 paragraphes aléatoires (arabe, hébreu, latin, chiffres ASCII et arabes-indiens, signes diacritiques, ponctuation, parenthèses, espaces insécables, tabulations, une à trois plages de direction forcée gauche à droite ou droite à gauche) : niveaux et ordre d'affichage **identiques dans 6 000 cas sur 6 000**, plus 7 phrases réelles ;
  - 105 tests du repérage et du plan de correction : 16 cas à corriger (catégorie, « vu » attendu, résultat), 16 cas à ne pas toucher, catégories décochées, plages, paragraphes LTR, directions forcées nuisibles, sauts de ligne forcés, et **3 000 phrases aléatoires** (séquences corrigées toujours lues de gauche à droite, aucune lettre arabe forcée, aucun changement hors séquences, second passage sans changement) ;
  - 34 tests sur des objets Illustrator simulés : analyse sans écriture, application exacte caractère par caractère, bloc verrouillé et calque verrouillé ignorés, repères non imprimables RVB / CMJN, second passage, Rétablir (y compris quand Illustrator ignore une valeur égale à celle du style de caractère), refus de rétablir un texte modifié, texte non indexable, composeur latin, portées calque / sélection / groupe / texte sélectionné / blocs liés, sélection des blocs, et `main()` de bout en bout avec un ScriptUI factice (FR et EN, aucun document ouvert).
  
  Ces simulations ne remplacent pas un essai réel. En particulier, le script suppose que le moteur de texte d'Illustrator suit UAX #9 ; s'il diffère sur un cas limite, le script peut laisser passer une séquence ou en corriger une qui s'affichait déjà bien (sans dommage : elle reste lue de gauche à droite).

```
cd tests
npm install        # bidi-js, seulement pour le test de comparaison
npm test           # ou : node test-bidi.js && node test-islands.js && node test-simulation.js
```

## Limites

- Le retour à la ligne automatique n'est pas simulé (seuls les sauts de ligne forcés le sont) : une séquence coupée entre deux lignes est tout de même corrigée, mais la vérification porte sur le paragraphe.
- Le réglage « Chiffres » (arabes / hindis / farsis) appliqué par attribut n'est pas pris en compte dans la simulation (le code des caractères l'est).
- Les paragraphes de gauche à droite ne reçoivent pas d'îlots (seules les directions forcées nuisibles y sont annulées).
- Avec l'outil Texte, tout l'article sélectionné est traité, pas seulement les caractères sélectionnés.

## Licence

MIT — © 2026 Amirouche Amwanes. Idée de contournement pour les valeurs égales au style appliqué : sttk3 (Adobe Community, 2024), réécrite, aucun code copié.
