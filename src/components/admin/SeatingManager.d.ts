// Type shim for the sibling plain-JSX component (props are intentionally loose).
import type { ComponentType } from 'react';

declare const Component: ComponentType<any>;
export default Component;
