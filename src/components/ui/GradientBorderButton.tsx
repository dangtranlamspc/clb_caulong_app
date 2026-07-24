'use client';
import React, { ElementType, ReactNode } from 'react';

type GradientBorderButtonProps = {
    as?: ElementType;
    className?: string;
    children: ReactNode;
    [key: string]: any;
};

export default function GradientBorderButton({
    as: Component = 'button',
    className,
    children,
    ...rest
}: GradientBorderButtonProps) {
    return (
        <span className="gradient-border-wrap relative isolate inline-block rounded-xl">
            <Component
                className={`relative z-10 ${className ?? ''}`}
                {...rest}
            >
                {children}
            </Component>
        </span>
    );
}