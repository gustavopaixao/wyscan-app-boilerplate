import { TabPlaceholder } from "@/components/home/TabPlaceholder";
import { useStrings } from "@/lib/i18n";

export default function ExploreTab() {
	const { t } = useStrings();
	return <TabPlaceholder icon="compass-outline" title={t("nav_tab_explore")} />;
}
