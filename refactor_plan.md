
## Phase 2: GameScreen Segmentation (Parallel-Safe)

### Objective
Reduce `webapp/src/components/GameScreen.tsx` to a thin orchestration shell by extracting:
- panel orchestration,
- question engine,
- shelter matching/guess flow,
- clue map filtering,
- HUD and overlay rendering blocks.

### New Branches
- `refactor/rf-11-gamescreen-contracts`
- `refactor/rf-12-panel-coordinator`
- `refactor/rf-13-question-engine`
- `refactor/rf-14-shelter-matching`
- `refactor/rf-15-clue-map-filtering`
- `refactor/rf-16-gamescreen-ui-blocks`
- `refactor/rf-17-gamescreen-cutover`
- `refactor/rf-18-gamescreen-tests`

### RF-11 Contract Freeze (Must Be First)
#### [ ] RF-11: Freeze GameScreen extraction contracts
- Files:
  - New: `webapp/src/features/gameplay/types/gameScreen.ts`
  - Edit: `webapp/src/components/GameScreen.tsx` (type-only usage)
- Deliverables:
  - Typed interfaces for:
    - panel coordinator input/output
    - question engine input/output
    - guess resolution input/output
    - clue filter service input/output
  - Stable function signatures for extracted hooks/services.
- Depends on: RF-01.
- Can run in parallel with: none.
- Done when:
  - All new extraction boundaries are represented as explicit types.
  - No behavior change.

## Parallel Lanes After RF-11

### Lane A (Domain Logic Extraction)
#### [ ] RF-12: Extract panel coordinator hook
- Files:
  - New: `webapp/src/features/gameplay/hooks/usePanelCoordinator.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - `activePanel`, `drawerOpen`, `cluesOpen`, layer panel open/close signals.
  - `activatePanel`, `handleLayerPanelButtonClick`, measure/panel interaction rule.
- Depends on: RF-11.
- Can run in parallel with: RF-14, RF-15, RF-16.

#### [ ] RF-13: Extract question engine hook
- Files:
  - New: `webapp/src/features/gameplay/hooks/useQuestionEngine.ts`
  - New: `webapp/src/features/gameplay/constants/questionAttributes.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - question text/template assembly
  - question list derivation and one-question-per-location lock logic
  - `handleAskQuestion` and `handleAskNearbyAmenity`
- Depends on: RF-11.
- Can run in parallel with: RF-14, RF-15, RF-16.

### Lane B (Matching + Filtering Services)
#### [ ] RF-14: Extract shelter identity/matching service
- Files:
  - New: `webapp/src/features/gameplay/services/shelterMatching.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - normalize/resolve name helpers
  - option/shelter/POI match helpers
  - match context builder and overlap checks used in guess resolution
- Depends on: RF-11.
- Can run in parallel with: RF-12, RF-13, RF-16.

#### [ ] RF-15: Extract clue map filtering service
- Files:
  - New: `webapp/src/features/gameplay/services/clueMapFiltering.ts`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - filter-by-single-clue flow (currently inline in `GameplayPanel.onFilterByClue`)
  - apply-wrong-clues flow (`handleApplyWrongClueFilter`)
  - shared designated-shelter filtering utility path
- Depends on: RF-11, RF-14.
- Can run in parallel with: RF-12, RF-13, RF-16.

### Lane C (UI Block Extraction)
#### [ ] RF-16: Extract GameScreen UI blocks into presentational components
- Files:
  - New: `webapp/src/components/layout/GameTopBar.tsx`
  - New: `webapp/src/components/controls/MapHudControls.tsx`
  - New: `webapp/src/components/overlays/GameOverlayStack.tsx`
  - New: `webapp/src/components/overlays/ExitConfirmDialog.tsx`
  - Edit: `webapp/src/components/GameScreen.tsx`
- Move out:
  - top bar and timer UI block
  - floating map HUD controls (layers, gameplay, measure, elevation pill)
  - overlay stack rendering and exit confirm modal
- Constraints:
  - No visual styling changes.
- Depends on: RF-11.
- Can run in parallel with: RF-12, RF-13, RF-14, RF-15.

## Integration + Stabilization
#### [ ] RF-17: GameScreen cutover and cleanup
- Files:
  - Edit: `webapp/src/components/GameScreen.tsx`
  - Edit: extracted files as needed
- Do:
  - wire all new hooks/services/components
  - delete obsolete in-file helpers/constants duplicated by extracted modules
  - keep current behavior parity
- Depends on: RF-12 through RF-16.
- Can run in parallel with: none (single owner).

#### [ ] RF-18: Add targeted tests for extracted GameScreen domains
- Files:
  - New tests under:
    - `webapp/src/features/gameplay/hooks/*.test.ts`
    - `webapp/src/features/gameplay/services/*.test.ts`
    - integration test for GameScreen orchestration path
- Focus:
  - panel exclusivity rules
  - question lock + cooldown behavior parity
  - clue filtering parity for single-clue and wrong-clue flows
  - guess resolution parity (correct/wrong/penalty/final)
- Depends on: RF-17.

## Conflict Avoidance (Phase 2)
- `webapp/src/components/GameScreen.tsx`:
  - Single active owner at a time.
  - Preferred model: each lane delivers new files first; tech lead performs/queues cutovers.
- `webapp/src/features/gameplay/types/gameScreen.ts`:
  - RF-11 only (contract freeze).
- `webapp/src/features/gameplay/services/*`:
  - Lane B exclusive ownership.
- `webapp/src/components/layout|controls|overlays/*`:
  - Lane C exclusive ownership.

## Merge Order (Phase 2)
1. RF-11
2. RF-14 and RF-16 in parallel
3. RF-12 and RF-13 in parallel
4. RF-15
5. RF-17
6. RF-18
