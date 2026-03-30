# Shree Hari Dairy

## Current State
The app has persistent "operation failed" errors on every save/edit operation. The root cause is `useActor.ts` calling `actor._initializeAccessControlWithSecret()` whenever an Internet Identity session is found in the browser. This method does not exist in the backend (main.mo), so it crashes silently and blocks all data operations.

Additionally, `InventoryPage.tsx` exists in the codebase but is not used anywhere (not imported in App.tsx), adding dead weight.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- `useActor.ts`: Remove Internet Identity dependency entirely. Always create an anonymous actor. Never call `_initializeAccessControlWithSecret`.
- `main.tsx`: Remove `InternetIdentityProvider` wrapper — no longer needed.

### Remove
- `InventoryPage.tsx`: Unused component, not referenced anywhere.

## Implementation Plan
1. Rewrite `useActor.ts` to always return anonymous actor, no II session check, no `_initializeAccessControlWithSecret` call.
2. Update `main.tsx` to remove `InternetIdentityProvider` import and wrapper.
3. Delete `InventoryPage.tsx`.
4. Validate build passes.
