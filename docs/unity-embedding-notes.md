# Unity Embedding Notes

Reference only. This is not current implementation scope.

## Concept

Cellular Death Match could become a subgame inside a larger Unity scene, presented as a playable simulation running on a screen in a spaceship. The Unity scene would own the room, camera, lighting, player movement, and interaction raycasts. The cellular game would own the dish simulation, dish rendering, tool state, discoveries, audio events, and progression state.

## Likely Approaches

### Native Unity Port

Port the simulation and game rules to C# and render the dish into a Unity texture.

This is the best long-term option if the spaceship game is Unity-native. It gives proper input, audio, save data, profiling, and build-platform control. The cost is that the TypeScript simulation and content need to be translated or generated into C#.

### Embedded Web View

Keep the Vite/TypeScript game running inside a browser or WebView texture in Unity.

This is faster for a prototype because the current game can be reused almost directly. The tradeoff is platform risk: WebView support varies by desktop, mobile, console, VR, and fullscreen setups. Input, audio focus, save data, and performance can also become awkward.

### Hybrid Data Port

Keep the design/content/rules in portable data files, then implement separate runtime shells for web and Unity.

This is probably the healthiest middle path if the game keeps evolving. The cellular rules, lifeforms, catalysts, objectives, and discovery recipes can be kept in data-driven form, while Unity and web each own their renderer, input, audio, and UI.

## Module Shape

The Unity-facing game should behave like a small engine module:

```csharp
public interface ICellularDeathMatchModule
{
    void StartRun(int seed);
    void Tick(float deltaTime);
    void ApplyTool(CellularTool tool, Vector2 uv);
    void SetSelectedLifeform(string lifeformId);
    CellularFrame ReadFrame();
    CellularEvent[] DrainEvents();
    CellularSaveData CreateSaveData();
    void LoadSaveData(CellularSaveData saveData);
}
```

The parent Unity scene should not need to know cellular automata internals. It should send UV input, select tools, tick the module, read events, and display the latest frame.

## Rendering To A Spaceship Screen

Use a `Texture2D` or `RenderTexture` assigned to the material on the spaceship monitor mesh.

For a pixel-art dish, a `Texture2D` backed by a `Color32[]` buffer is probably enough:

- Simulation grid writes cell IDs.
- Renderer maps cell IDs to colors.
- Texture uses point filtering.
- Material uses the texture on the screen mesh.
- Unity raycast reads mesh UVs and passes normalized UV coordinates to the module.

The current web renderer draws a 160 x 160 simulation into an 800 x 800 canvas. In Unity, that maps cleanly to a low-resolution texture that can be scaled up on the screen material.

## Input Mapping

Unity should raycast from the camera/controller/mouse to the spaceship screen mesh.

When the ray hits the screen:

1. Read the hit UV.
2. Convert UV to dish coordinates.
3. Pass the tool command to the cellular module.
4. Let the module decide whether the command is valid.

This keeps the subgame independent of whether the player is using mouse, controller, VR hands, or an in-world cursor.

## UI Strategy

Avoid carrying DOM UI concepts into Unity.

The web app currently has DOM panels for tools, lifeforms, debug, notebook, fullscreen, and HUD. In Unity these should become either:

- World-space UI panels around the spaceship monitor.
- Separate small monitor meshes around the dish screen.
- Diegetic buttons, toggles, and status lights.
- A debug-only Unity overlay for development.

The dish itself should remain a clean render target. The parent scene can decide how much UI surrounds it.

## Audio Strategy

Do not port browser `AudioContext` directly.

The cellular module should emit semantic events such as:

- `LifeformDiscovered`
- `CatalystTriggered`
- `MutationVisible`
- `CriticalFlare`
- `ToolApplied`
- `ObjectiveCompleted`

Unity can map those events to `AudioSource`, mixer groups, layered loops, and 3D/2D spatial behavior.

## Save Data

Use Unity-owned persistence rather than direct `localStorage`.

The module should expose serializable save data for:

- Discovery records.
- Run state.
- Debug reveal/clear state.
- Settings if needed.

For prototyping, `PlayerPrefs` is fine. For a real game, use a versioned JSON/binary save managed by the parent game.

## Determinism And Performance

Unity should own timing through `Update` or a fixed simulation accumulator. The cellular module should not schedule its own loop.

Important considerations:

- Seeded RNG for reproducible runs.
- Fixed tick rate for simulation stability.
- Minimal per-frame allocations.
- `Color32[]` texture buffers reused across frames.
- Consider `NativeArray`, Jobs, or Burst later if the grid grows.
- Keep debug rendering optional.

## Existing Web Code Seams

Useful current boundaries:

- `src/sim/` has lower-level cellular simulation logic.
- `src/game/arena.ts` owns ecosystem rules, tool effects, objectives, and per-tick orchestration.
- `src/content/` owns lifeforms, catalysts, objectives, and authored tuning.
- `src/ui/render.ts` renders the dish to a canvas.
- `src/main.ts` is currently the browser host shell and would not port directly.

The likely refactor before a Unity port would be to extract a browser-independent game controller from `src/main.ts`, then either port that controller to C# or use it as the contract for a Unity rewrite.

## Suggested Milestones

1. Define a small module API for tick, input, frame output, events, and save data.
2. Extract browser-specific DOM, fullscreen, localStorage, and audio from the core run loop.
3. Build a dish-only web host to prove the module boundary.
4. Port simulation/content to C# or prove WebView texture viability.
5. Render the dish to a Unity screen mesh with UV-mapped input.
6. Rebuild tool/lifeform/notebook UI as spaceship monitor UI.
7. Add Unity audio event mapping.
8. Add save/load and debug controls through the parent Unity game.

## Main Risk

The main risk is not rendering the dish to a polygon. That part is straightforward. The main risk is keeping the cellular game independent from its host: no direct DOM, no global loop ownership, no browser-only storage, no browser-only audio, and no UI assumptions that fight the spaceship scene.
