# Components Knowledge Base

**Scope:** `./components/`

## OVERVIEW
20 React components for word search UI. Default exports, PascalCase filenames, Tailwind styling.

## STRUCTURE

```
components/
├── Sidebar.tsx           # Main navigation sidebar
├── WordSearchGrid.tsx    # Interactive puzzle grid
├── WordList.tsx          # Word list display
├── Timer.tsx             # Game timer
├── StatusBar.tsx         # Status with timer
├── GameInfoPanel.tsx     # Game info display
├── HistoryPanel.tsx      # Game history viewer
├── LanguageSelector.tsx  # Language dropdown
├── PrintWorksheet.tsx    # PDF export button
├── AILog.tsx            # AI log main view
├── AILogCard.tsx        # Individual log entry
├── AILogDrawer.tsx      # Slide-out log panel
├── AILogHeader.tsx      # Log header
├── Icons.tsx            # SVG icon components
└── BottomTabBar.tsx     # Mobile navigation
```

## CONVENTIONS

- **Naming:** PascalCase files, default exports
- **Styling:** Tailwind classes inline, dark mode via `dark:` prefix
- **Props:** Interface named `{ComponentName}Props`
- **Icons:** Lucide-react for standard icons, custom SVG in Icons.tsx

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add game component | `./WordSearchGrid.tsx` |
| Add UI element | `./Sidebar.tsx`, `./BottomTabBar.tsx` |
| Add AI log component | `AILog*.tsx` files |
| Modify PDF export | `./PrintWorksheet.tsx` |
| Add icon | `./Icons.tsx` |
