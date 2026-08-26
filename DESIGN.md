---
version: alpha
colors:
  primary: "#5be9d6"
  void: "#04080a"
  panelSolid: "#0a1316"
  life: "#5be9d6"
  highlight: "#6bcfe8"
  discovery: "#f0c35a"
  rare: "#b084eb"
  critical: "#ff7b5c"
  text: "#e7f6f4"
  textMuted: "#9fc3c2"
typography:
  display:
    fontFamily: '"Michroma", ui-sans-serif, system-ui, sans-serif'
  data:
    fontFamily: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace'
  observation:
    fontFamily: '"Newsreader", Georgia, "Times New Roman", serif'
rounded:
  panel: "14px"
  control: "11px"
  specimen: "999px"
spacing:
  grid: "8px"
  gap: "12px"
components:
  caseDocket: {}
  professorBeat: {}
  petriDish: {}
  researchNotebook: {}
  specimenPopover: {}
---

# Cellular Death Match Design

## Overview

The interface is a deep-sea microbiology instrument assembled by a brilliant,
slightly dangerous professor. It is product-first during play and more
expressive at authored Lab breaks. The memorable signature is the living dish
surrounded by physical research artefacts: sample slots, reagent racks,
handwritten observations, and the Professor entering only when a hypothesis or
result deserves a voice.

It must never resemble a generic sci-fi dashboard, a neon casino, a mobile
currency funnel, or a sequence of story cards placed in front of the game.

Runtime token ownership remains `src/styles.css :root`. This document records
their semantic intent; values change in both places in the same changeset.

## Colors

The near-black void preserves contrast for the cellular simulation. Teal means
life, current action, and progress. Amber means a logged discovery or sealed
result. Violet is reserved for rare or volatile biology; coral communicates
actual danger or collapse. Large filled accent surfaces are avoided so the
cells remain the brightest material.

## Typography

Michroma labels apparatus, Trials, and irreversible moments. IBM Plex Mono is
the working laboratory language for controls and data. Newsreader is the
Professor's observation voice and should appear sparingly in hypotheses,
annotations, and result remarks.

## Layout

The Lab is the meta-space. It uses a workbench/docket composition rather than a
dashboard grid. Each Case owns a row of five sample slots; each slot resolves
to one Petri-dish Trial. During a Trial the dish remains centered, large, and
touch-first, with controls under the thumb on portrait screens.

The Professor may enter at the title, hypothesis, discovery, and result beats.
On small screens the portrait compresses to a partial bust inside the guidance
strip. It never covers the dish input area, reagent rack, or required HUD.

## Elevation & Depth

Depth comes from cover glass, restrained internal highlights, dark drop
shadows, and biological glow. Static content uses one panel elevation. Strong
glows belong only to the active sample, a live discovery, or a selected tool.

## Shapes

Circular shapes mean cells, samples, and Trial seals. Rounded instrument panels
use 11–18px radii. Avoid a page made entirely of interchangeable rounded cards;
connected rails and physical racks should explain relationships.

## Components

The Case Docket shows Case identity, five sequential Trial samples, the active
hypothesis, and sealed history. The Method screen is the Lab bench between
Trials and clearly labels temporary Methods versus permanent Atlas discoveries.
Professor beats are event-driven and skippable; they disappear when the player
demonstrates the requested action.

The Specimen Freezer is the canonical home for selectable lifeforms. On phones
it is a bounded, two-column popover physically anchored to the Egg tool by a
visible specimen lead. Pressing Egg opens it only when more than one specimen
is available; the compact Eggs shortcut opens the same canonical surface. On
desktop it remains the right-side specimen rack. Closing it must immediately
return the whole dish to the player.

The Research Notebook is the game's goal spine. Its default Study page holds
one active hypothesis, live evidence, and optional long-form Field Studies.
Findings record what the player has actually observed; Atlas silhouettes tease
what remains unknown. Hypotheses are questions rather than exact recipes, and
ordinary dishes stay open until the player banks evidence, reaches equilibrium,
or suffers ecological collapse. Only explicitly labelled pressure experiments
use an expiring observation window. After the Atlas is complete, Field Studies
become repeatable prompts for expressive play rather than a score economy.

The mobile reagent rack is horizontally scrollable and keeps a visible arrow
control as the non-drag alternative. The first authored Trial that needs an
off-screen reagent has a Professor beat that teaches both gestures.

Options uses the laboratory cog as a persistent secondary action, including on
the title screen. “Reveal all” is a reversible testing route into a fully
stocked procedural Trial. “Delete data” is destructive and always requires an
in-product confirmation that names the progress, specimens, settings, and
tutorial state it will erase.

## Do's and Don'ts

- Do let the real simulation teach through immediate response.
- Do introduce one meaningful feature when a Trial requires it.
- Do keep one-click entry from the Lab into the active dish.
- Do respect reduced motion and visible keyboard focus.
- Don't interrupt with dialogue trees, claim screens, or fake minigames.
- Don't use the Professor as constant commentary or let him obscure play.
- Don't imply real medical efficacy; ailments and outcomes stay clearly
  fictional and playful.
