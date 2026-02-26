

## ✅ Completed: Virtual PE Accounting, Inspector Expiry Timer, Dual PE Icons

All changes from the plan have been implemented:

1. **VPEIcon** (`src/components/ui/vpe-icon.tsx`) - Clock-based icon for virtual PE
2. **updatePeStatus** now accepts `isVirtualPe` flag - mirrors to virtual PE fields
3. **CommitResult** type includes `isVirtualPe` field
4. **BitplaceMap** + **usePaintQueue** pass `isVirtualPe` from commit result
5. **PixelInfoPanel** - Shows 0 PE for virtual stake pixels + expiry countdown
6. **StatusStrip** - Dual PE display, hides wallet for Google-only users
7. **WalletButton** - VPEIcon for virtual PE, dual display for 'both' users
8. **UserMenuPanel** - VPEIcon in Starter PE sections, separate VPE stats
