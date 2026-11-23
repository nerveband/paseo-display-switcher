import type { PluginClientContext, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { Icon, SidebarRow } from "@getpaseo/plugin/client/ui";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  MainSurface,
  switchDisplayListing,
  useCurrentGroupMode,
  useSidebarSelectorEnabled,
} from "./client/main";

function DisplaySwitcherItem({ currentScreen, openScreen, theme, layout }: PluginSidebarItemProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const showSelector = useSidebarSelectorEnabled();
  const currentMode = useCurrentGroupMode(showSelector);
  const showOptionLabels = !layout.compact && rowWidth >= 420;

  const openSettings = () => openScreen({ screenId: "main" });

  const selector = showSelector ? (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 8 }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: currentMode === "project" }}
        accessibilityLabel="Project view"
        onPress={() => void switchDisplayListing("project")}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 6 }}
      >
        <Icon
          name="FolderTree"
          size={16}
          color={currentMode === "project" ? theme.colors.accent : theme.colors.foregroundMuted}
        />
        {showOptionLabels ? (
          <Text
            style={{
              color: currentMode === "project" ? theme.colors.foreground : theme.colors.foregroundMuted,
              fontSize: 12,
            }}
          >
            Project
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: currentMode === "status" }}
        accessibilityLabel="Status view"
        onPress={() => void switchDisplayListing("status")}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 6 }}
      >
        <Icon
          name="List"
          size={16}
          color={currentMode === "status" ? theme.colors.accent : theme.colors.foregroundMuted}
        />
        {showOptionLabels ? (
          <Text
            style={{
              color: currentMode === "status" ? theme.colors.foreground : theme.colors.foregroundMuted,
              fontSize: 12,
            }}
          >
            Status
          </Text>
        ) : null}
      </Pressable>
    </View>
  ) : null;

  return (
    <View
      style={{ width: "100%" }}
      onLayout={({ nativeEvent }) => setRowWidth(nativeEvent.layout.width)}
    >
      <SidebarRow
        icon="SlidersHorizontal"
        active={currentScreen?.screenId === "main"}
        onPress={openSettings}
        trailing={selector}
      />
    </View>
  );
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "main", title: "Display Switcher", Component: MainSurface });
  client.addSidebarHeaderItem({
    id: "display-switcher",
    title: "Display Switcher",
    Component: DisplaySwitcherItem,
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
