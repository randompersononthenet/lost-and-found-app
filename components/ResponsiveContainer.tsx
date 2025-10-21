import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  let maxWidth: number | '100%' = '100%';
  if (isWeb) {
    if (width >= 1400) maxWidth = 1040;
    else if (width >= 1024) maxWidth = 920;
  }

  const isConstrained = isWeb && maxWidth !== '100%';

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        // Subtle framing only on wide web layouts
        borderWidth: isConstrained ? 1 : 0,
        borderColor: isConstrained ? colors.border : 'transparent',
        borderRadius: isConstrained ? 12 : 0,
        paddingTop: isConstrained ? 8 : 0,
        paddingHorizontal: isConstrained ? 12 : 0,
      }}
    >
      {children}
    </View>
  );
}
