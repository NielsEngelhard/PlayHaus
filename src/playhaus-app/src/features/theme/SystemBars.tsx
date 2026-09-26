import { useSystemBarToneValue } from '@/components/layout/PageToneContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Relative luminance above which dark status bar icons read better than light ones.
const LIGHT_LUMINANCE = 0.5;

function isLight(hex: string): boolean | null {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (match === null) {
        return null;
    }

    const value = parseInt(match[1], 16);
    const [r, g, b] = [value >> 16, (value >> 8) & 0xff, value & 0xff].map(channel => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b > LIGHT_LUMINANCE;
}

// Colours the phone's status bar to match the top of the page.
export default function SystemBars() {
    const theme = useTheme();
    const color = useSystemBarToneValue() ?? theme.colors.background;
    const light = isLight(color) ?? theme.scheme !== 'dark';

    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        // Browsers and installed web apps paint their status bar with this, and pick up changes to it live.
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    }, [color]);

    return <StatusBar style={light ? 'dark' : 'light'} />;
}
