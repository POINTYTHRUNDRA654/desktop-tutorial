import * as React from 'react';
const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => <textarea ref={ref} {...props} />
);
Textarea.displayName = 'Textarea';
export { Textarea };
