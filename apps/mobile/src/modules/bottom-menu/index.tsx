import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { BottomMenu } from '../../components/ui/bottom-menu';

type BottomMenuModuleProps = Pick<BottomTabBarProps, 'descriptors' | 'navigation' | 'state'>;

/**
 * Module wrapper: keeps route->menu mapping in one place.
 * Consumers mount with one line: <BottomMenuModule {...props} />
 */
export function BottomMenuModule({ descriptors, navigation, state }: BottomMenuModuleProps) {
  const items = state.routes.map((route) => {
    const descriptor = descriptors[route.key];
    const label =
      descriptor && typeof descriptor.options.tabBarLabel === 'string'
        ? descriptor.options.tabBarLabel
        : descriptor?.options.title ?? route.name.toUpperCase();

    return {
      key: route.name,
      label,
    };
  });

  return (
    <BottomMenu
      activeKey={state.routes[state.index]?.name ?? 'index'}
      items={items}
      onSelect={(key) => {
        const target = state.routes.find((route) => route.name === key);
        if (target) {
          navigation.navigate(target.name, target.params);
        }
      }}
    />
  );
}
