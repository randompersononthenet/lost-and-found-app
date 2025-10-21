import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

export default function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  let maxWidth: number | '100%' = '100%';
  if (isWeb) {
    if (width >= 1400) maxWidth = 1040;
    else if (width >= 1024) maxWidth = 920;
  }

  return (
    <View style={{ flex: 1, width: '100%', maxWidth, alignSelf: 'center' }}>
      {children}
    </View>
  );
}
