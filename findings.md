# Findings: Parking Fee Calculator

## Requirements from plan2.md
- **Feature**: Parking Fee Calculator.
- **Rules provided for 6 stores**:
  1. 长申国际
  2. 盛德美新区店
  3. 景华店
  4. 金纱店
  5. 盛德美折扣店
  6. 大张会员超市

## Implementation Notes
- Store names map exactly to the `stores` table records imported earlier.
- The calculation logic involves free time thresholds, hourly rates, day/night differences, and maximum caps (usually 20元 for 24h).
- The calculator must allow switching stores and automatically select the nearest store initially.
- The UI should be available to unauthenticated users, which matches the Home page since `Home.vue` is usually accessible.
