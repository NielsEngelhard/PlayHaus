import AppText from '@/components/text/AppText';
import BigIntroText from '@/components/text/BigIntroText';
import Card from '@/components/ui/Card';
import { View } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={{ width: '100%' }}>
      <BigIntroText
        title='Tiny games,'
        accent='big fun.'
      />

      <AppText>
        <Card>
          yehes
        </Card>
      </AppText>
    </View>
  );
}
