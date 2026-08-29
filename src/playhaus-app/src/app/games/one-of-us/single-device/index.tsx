import SimpleTextHero from "@/components/text/SimpleTextHero";
import { useT } from "@/features/i18n/LanguageContext";
import { View } from "react-native";

export default function OneOfUsSingleDeviceIndexPage() {
    const t = useT();

    return (
        <View>
            <SimpleTextHero
                title={t('oneOfUs.singleDevice.title')}
                description={t('oneOfUs.singleDevice.description')}
            />            
        </View>
    )
}