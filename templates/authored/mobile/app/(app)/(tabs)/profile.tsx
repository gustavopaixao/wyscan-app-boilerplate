import { TabPlaceholder } from "@/components/home/TabPlaceholder";
import { useStrings } from "@/lib/i18n";

export default function ProfileTab() {
	const { t } = useStrings();
	return <TabPlaceholder icon="person-outline" title={t("nav_tab_profile")} />;
}
