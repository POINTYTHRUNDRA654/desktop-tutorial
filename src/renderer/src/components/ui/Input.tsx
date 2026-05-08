import * as React from 'react';
export const Input: any = React.forwardRef((props: any, ref: any) => (
  <input ref={ref} {...props} />
));
Input.displayName = 'Input';
