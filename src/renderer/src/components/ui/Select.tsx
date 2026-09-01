import * as React from 'react';
export const Select: any = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const SelectContent: any = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const SelectItem: any = ({ children, value, ...props }: any) => <option value={value} {...props}>{children}</option>;
export const SelectTrigger: any = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const SelectValue: any = ({ placeholder, ...props }: any) => <span {...props}>{placeholder}</span>;
