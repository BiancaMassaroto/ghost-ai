Wire the editor home sidebar and dialogs to the real project API.

### Data Fetching

The editor home page is a server component.

Fetch owned and shared projects server-side using the existing project data helper and pass both lists to the sidebar.

No client-side fetching for initial load.

### `Use Project Actions`

Create a hook in `hooks/` that manages dialog state and project mutations.

**Create**

- manage create dialog state
- manage project name input
- generate a short unique suffix
- slugify the name + suffix into a cosmetic preview string shown in the dialog
- call `POST /api/projects`
- navigate to `/editor/[project.id]`

The Prisma-generated `project.id` is the single source of truth for the
Liveblocks room ID. The slugified preview is display-only — it is never sent
to the API and never used to join a room. Any future canvas/Liveblocks
wiring must key the room off `project.id`, not off the slug preview.

**Rename**

- store target project id + current name
- call `PATCH /api/projects/[id]`
- refresh on success

**Delete**

- store target project
- call `DELETE /api/projects/[id]`
- redirect to `/editor` if deleting the active workspace
- otherwise refresh

### Wiring

Connect the hook to the sidebar and dialogs.

- create dialog shows the slugified name as a cosmetic preview (not the real ID)
- rename dialog pre-fills current name
- delete dialog shows project name

### Check When Done

- sidebar uses real project data, not the fake mock data it uses right now
- create navigates to workspace
- rename updates correctly
- delete refreshes or redirects correctly
- `npm run build` passes
