# Bitplace Roadmap

## Phase 1: Foundation ✓
- [x] Project setup with React + TypeScript + Tailwind
- [x] Routing structure (/, /rules, /profile, /leaderboard)
- [x] Collapsible sidebar navigation
- [x] Clean minimal design system
- [x] Documentation (rules, architecture, roadmap)
- [x] Enable Lovable Cloud backend

## Phase 2: Map Integration
- [ ] Add MapLibre GL JS dependency
- [ ] Integrate OpenFreeMap tiles
- [ ] Basic map controls (zoom, pan)
- [ ] Responsive full-screen map layout
- [ ] Map style customization

## Phase 3: Pixel Canvas Overlay
- [ ] Create Canvas overlay component
- [ ] Pixel grid system with zoom scaling
- [ ] Pixel rendering based on ownership
- [ ] Color palette for pixel states
- [ ] Performance optimization for large grids

## Phase 4: Database Schema
- [ ] Create `pixels` table with RLS
- [ ] Create `wallets` table
- [ ] Create `stakes` table (DEF/ATK records)
- [ ] Create `floors` table (6h snapshots)
- [ ] Set up Realtime subscriptions

## Phase 5: Selection & Actions
- [ ] Drag-to-select multiple pixels
- [ ] Selection highlighting
- [ ] Action panel UI (Paint, Defend, Attack)
- [ ] Uniform PE distribution across selection
- [ ] All-or-nothing validation with error highlighting

## Phase 6: Stake Mechanics
- [ ] Takeover threshold calculation
- [ ] Floor value tracking (6h ticks)
- [ ] DEF/ATK one-side-per-wallet enforcement
- [ ] Owner reinforcement logic
- [ ] Immediate withdrawal for DEF/ATK

## Phase 7: Rebalance & Decay
- [ ] Collateral monitoring
- [ ] 3-day decay schedule (12 ticks)
- [ ] Uniform decay across owner pixels
- [ ] Re-collateralization detection
- [ ] Floor update cron job

## Phase 8: Polish & Launch
- [ ] Leaderboard implementation
- [ ] Profile page with stats
- [ ] Wallet connection (BTP token)
- [ ] Performance audit
- [ ] Mobile responsiveness
- [ ] Error handling & edge cases
- [ ] Launch!
