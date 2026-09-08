import type { PluginClientContext } from "@getpaseo/plugin/client";
import { MainSurface, switchDisplayListing } from "./client/main";

export default function contribute(client: PluginClientContext) {
  client.addSurface("main", MainSurface);

  client.addSidebarItem({
    id: "display-switcher",
    title: "Display Switcher",
    icon: "SlidersHorizontal",
    surface: "main",
  });

  client.addCommandCenterItem({
    id: "switch-status-listing",
    title: "Display: Switch to Status Listing",
    icon: "ListFilter",
    keywords: ["status", "listing", "display", "sidebar", "group", "sort", "view"],
    context: "global",
    async onSelect() {
      await switchDisplayListing("status");
    },
  });

  client.addCommandCenterItem({
    id: "switch-project-listing",
    title: "Display: Switch to Project Listing",
    icon: "FolderGit2",
    keywords: ["project", "projects", "listing", "display", "sidebar", "group", "sort", "view"],
    context: "global",
    async onSelect() {
      await switchDisplayListing("project");
    },
  });

  client.addCommandCenterItem({
    id: "toggle-display-listing",
    title: "Display: Toggle Listing (Project / Status)",
    icon: "SlidersHorizontal",
    keywords: ["toggle", "display", "listing", "switch", "mode"],
    context: "global",
    async onSelect() {
      await switchDisplayListing("toggle");
    },
  });

  return () => {};
}
