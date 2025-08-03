import React from 'react';
import { cn } from '@root/lib/utils';
import { Power } from 'lucide-react';

export interface PowerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    checked?: boolean;
    loading?: boolean;
}

export const PowerButton = React.forwardRef<HTMLButtonElement, PowerButtonProps>(
    ({ className, checked = false, loading = false, ...props }, ref) => {
        const state = checked ? 'on' : 'off';

        return (
            <div className="relative flex items-center justify-center h-44 w-44">

                <div
                    className={cn(
                        'absolute h-28 w-28 rounded-full blur-3xl transition-all duration-500',
                        state === 'on' ? 'bg-green-400/60' : 'bg-red-500/40'
                    )}
                />

                <button
                    ref={ref}
                    type="button"
                    disabled={loading || props.disabled}
                    data-state={state}
                    className={cn(
                        'relative z-10 flex items-center justify-center h-36 w-36 rounded-full border-2',
                        'backdrop-blur-sm bg-white/10 border-white/20',
                        'text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]',
                        'data-[state=on]:text-green-500 dark:data-[state=on]:text-white',
                        'data-[state=on]:shadow-[0_0_50px_rgba(34,197,94,1)]',
                        'transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none',
                        className
                    )}
                    {...props}
                >
                    <Power className="h-20 w-20 transition-transform duration-300 active:scale-90" />
                </button>

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className={cn(
                            'h-full w-full animate-spin rounded-full border-4',
                            'border-transparent',
                            checked ? 'border-t-green-500' : 'border-t-red-500',
                            'blur-xs'
                        )} />
                    </div>
                )}
            </div>
        );
    }
);