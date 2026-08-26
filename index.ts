import type { PluginContext } from "@getpaseo/plugin";
import { MainSurface, switchDisplayListing } from "./main.client";

export default function contribute(plugin: PluginContext) {
  plugin.addSurface("main", MainSurface);

  plugin.addSidebarItem({
    id: "display-switcher",
    title: "Display Switcher",
    icon: "SlidersHorizontal",
    surface: "main",
  });

  plugin.addCommandCenterItem({
    id: "switch-status-listing",
    title: "Display: Switch to Status Listing",
    icon: "ListFilter",
    keywords: ["status", "listing", "display", "sidebar", "group", "sort", "view"],
    context: "global",
    async onSelect() {
      await switchDisplayListing("status");
    },
  });

  plugin.addCommandCenterItem({
    id: "switch-project-listing",
    title: "Display: Switch to Project Listing",
    icon: "FolderGit2",
    keywords: ["project", "projects", "listing", "display", "sidebar", "group", "sort", "view"],
    context: "global",
    async onSelect() {
      await switchDisplayListing("project");
    },
  });

  plugin.addCommandCenterItem({
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
