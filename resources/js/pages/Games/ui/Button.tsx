import React from 'react';
import classNames from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    ...props
}) => {
    const baseStyles = 'text-shadow cursor-pointer text-white disabled:cursor-not-allowed disabled:bg-neutral-500 transition-colors';

    const variants = {
        primary: 'bg-lime-500 hover:bg-lime-400 active:bg-lime-300',
        secondary: 'bg-blue-400 hover:bg-blue-300 active:bg-blue-200',
        danger: 'bg-red-500 hover:bg-red-400 active:bg-red-300',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-sm',
        md: 'px-4 py-2 text-xl',
        lg: 'px-8 py-3 text-2xl',
    };

    return (
        <button
            className={classNames(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
