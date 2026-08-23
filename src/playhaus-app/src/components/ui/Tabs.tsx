import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { View } from "react-native"

interface Props {
    activeTab: string
    tabs: string[]
    onClick: (tab: string) => void
}

export default function Tabs({ activeTab, tabs, onClick}: Props) {
    const styles = useStyles();
    
    return (
        <View>

        </View>
    )
}

const useStyles = createThemedStyles(theme => ({

}))