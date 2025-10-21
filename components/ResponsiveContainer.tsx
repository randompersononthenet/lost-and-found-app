import React from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Variant = 'page' | 'modal';

export default function ResponsiveContainer({ children, variant = 'page' }: { children: React.ReactNode; variant?: Variant }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  let maxWidth: number | '100%' = '100%';
  if (isWeb) {
    if (width >= 1400) maxWidth = 1040;
    else if (width >= 1024) maxWidth = 920;
  }

  const isConstrained = isWeb && maxWidth !== '100%';
  const isFramed = isConstrained && variant !== 'modal';

  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        maxWidth,
        alignSelf: 'center',
        // Subtle framing only on wide web layouts for non-modal pages
        borderWidth: isFramed ? 1 : 0,
        borderColor: isFramed ? colors.border : 'transparent',
        borderRadius: isFramed ? 12 : 0,
        paddingTop: isFramed ? 8 : 0,
        paddingHorizontal: isFramed ? 12 : 0,
      }}
    >
      {children}
    </View>
  );
}
