import type { ContentNavigationItem } from "@nuxt/content";
import { CHAINS } from "../utils/chains";

const NAV_ICONS: Record<string, string> = {
  "/guide": "i-lucide-book-open",
  "/guide/registry": "i-lucide-list-tree",
  "/guide/validation": "i-lucide-badge-check",
  "/guide/identify": "i-lucide-scan-search",
  "/guide/metadata": "i-lucide-sigma",
  "/guide/cli": "i-lucide-terminal",
  "/guide/agents": "i-lucide-bot",
  "/guide/custom": "i-lucide-plus",
  "/guide/playground": "i-lucide-flask-conical",
  "/chains": "i-lucide-link",
  "/playground": "i-lucide-flask-conical",
  ...Object.fromEntries(CHAINS.map((chain) => [chain.to, chain.icon])),
};

export function getFirstPagePath(item: ContentNavigationItem): string {
  let current = item;
  while (current.children?.length) {
    current = current.children[0]!;
  }
  return current.path;
}

function withIcons(items: ContentNavigationItem[]): ContentNavigationItem[] {
  return items.map((item) => ({
    ...item,
    icon: NAV_ICONS[item.path] ?? item.icon,
    /** Leaf pages match exactly, so /guide is not highlighted together with /guide/cli. */
    exact: !item.children?.length,
    children: item.children ? withIcons(item.children) : item.children,
  }));
}

export function useSubNavigation(
  providedNavigation?: Ref<ContentNavigationItem[] | null | undefined>,
) {
  const route = useRoute();
  const appConfig = useAppConfig();
  const navigation = providedNavigation ?? inject<Ref<ContentNavigationItem[]>>("navigation");

  const isDocsPage = computed(() => route.meta.layout === "docs");

  const subNavigationMode = computed(() => {
    if (!isDocsPage.value) return undefined;
    return (appConfig.navigation as { sub?: "header" | "aside" } | undefined)?.sub;
  });

  const currentSection = computed(() => {
    if (!subNavigationMode.value || !navigation?.value) return undefined;
    return navigation.value.find(
      (item) => route.path === item.path || route.path.startsWith(`${item.path}/`),
    );
  });

  const sections = computed(() => {
    if (!subNavigationMode.value || !navigation?.value) return [];
    return navigation.value
      .filter((item) => item.children?.length)
      .map((item) => ({
        label: item.title,
        icon: (NAV_ICONS[item.path] ?? item.icon) as string | undefined,
        to: getFirstPagePath(item),
        active: route.path === item.path || route.path.startsWith(`${item.path}/`),
      }));
  });

  const sidebarNavigation = computed(() => {
    const items =
      subNavigationMode.value && currentSection.value
        ? currentSection.value.children || []
        : navigation?.value || [];
    return withIcons(items);
  });

  return {
    subNavigationMode,
    sections,
    currentSection,
    sidebarNavigation,
  };
}
