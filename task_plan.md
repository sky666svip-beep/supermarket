# Task Plan: Parking Fee Calculator

## Objective
Implement a Parking Fee Calculator feature on the homepage.

## Phases

### [ ] Phase 1: Data Structure & Logic
- Define the parking rules for the 6 specified stores in a frontend utility file (`src/utils/parkingRules.ts`).
- Implement the fee calculation logic for each specific store's charging standard.

### [ ] Phase 2: Backend/API Enhancements
- Fetch all stores to populate the store selector.
- Use the existing location and distance calculation logic to find the nearest store among the 6 supported stores.

### [ ] Phase 3: Frontend UI Components
- Create a `ParkingCalculator.vue` component or add the section directly to `Home.vue`.
- Display the nearest store's parking info (Address, Capacity, Opening Hours, Rules text).
- Add a store selector (Dropdown/Picker) to switch between stores.
- Add input fields for parking duration (or start/end time).
- Display the calculated fee.

### [ ] Phase 4: Integration & Testing
- Integrate into `Home.vue`.
- Test the distance calculation and default store selection.
- Test the fee calculation logic.

## Errors Encountered
*(To be filled during execution)*
