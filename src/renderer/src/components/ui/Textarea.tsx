import * as React from 'react';
export const Textarea: any = React.forwardRef((props: any, ref: any) => (
  <textarea ref={ref} {...props} />
));
(Textarea as any).displayName = 'Textarea';
