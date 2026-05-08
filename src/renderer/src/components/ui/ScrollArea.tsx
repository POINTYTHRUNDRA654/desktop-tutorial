import * as React from 'react';
export const ScrollArea = ({ children, ...props }: any) => <div {...props}>{children}</div>;
ScrollArea.displayName = 'ScrollArea';
export const ScrollBar = ({ ...props }: any) => <div {...props} />;
ScrollBar.displayName = 'ScrollBar';
