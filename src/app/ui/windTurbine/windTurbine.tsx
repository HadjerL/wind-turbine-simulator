'use client';

import { useEffect, useRef } from 'react';

interface WindTurbineProps {
    windSpeed?: number;
    powerOutput?: number;
    isPlaying?: boolean;
}

export default function WindTurbine({ windSpeed = 0, powerOutput = 0, isPlaying = false }: WindTurbineProps) {
    const turbineRef = useRef<HTMLDivElement>(null);
    const windBarRef = useRef<HTMLDivElement>(null);
    const powerBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isPlaying) return;
        
        // Normalize values (adjust these ranges based on your expected data)
        const windPercentage = Math.min(100, (windSpeed / 17) * 100); // Assuming max 25 m/s
        const powerPercentage = Math.min(100, (powerOutput / 1) * 100); // Assuming max 5000 kW
    
        if (windBarRef.current) {
            windBarRef.current.style.width = `${windPercentage}%`;
            // Color gradient from green (0%) to red (100%)
            const hue = 120 - (windPercentage * 1.2); // 120 is green, 0 is red
            windBarRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        }
    
        if (powerBarRef.current) {
            // Create pulsing effect for power output
            powerBarRef.current.style.width = `${powerPercentage}%`;
            powerBarRef.current.style.animation = 'pulse 1s ease-in-out infinite alternate';
            // Color gradient from blue (0%) to purple (100%)
            const hue = 240 - (powerPercentage * 2.4); // 240 is blue, 120 is purple
            powerBarRef.current.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        }
    }, [windSpeed, powerOutput, isPlaying]);

    useEffect(() => {
        const turbine = turbineRef.current;
        if (!turbine) return;

        // Clear any existing animation
        turbine.style.animation = 'none';

        if (isPlaying && windSpeed > 0) {
            turbine.style.animation = `spin ${3}s linear infinite forwards`;
        }

        // Cleanup
        return () => {
            if (turbine) {
                turbine.style.animation = 'none';
            }
        };
    }, [windSpeed, isPlaying]);

    // Add CSS animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes pulse {
                from { opacity: 0.8; height: 90%; }
                to { opacity: 1; height: 100%; }
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-end w-full h-full p-4">
            <div>
                <div 
                    className="translate-y-2 relative"
                    ref={turbineRef}
                    style={{ transformOrigin: 'center center' }} // Ensure proper rotation origin
                >
                    <div className="rounded-full bg-white w-7 h-7 z-40 flex items-center justify-center">
                        <div className="rounded-full bg-slate-400 w-5 h-5 z-50"></div>
                    </div>
                    <div className="
                    h-32 border-r-[15px] border-r-gray-300 
                    border-t-[40px] border-b-[88px]
                    border-t-transparent border-b-transparent
                    absolute -translate-y-[14px] rotate-[60deg] origin-top-right -z-10
                    "></div>
                    <div className="
                    h-32 border-r-[15px] border-r-gray-300 
                    border-t-[40px] border-b-[88px]
                    border-t-transparent border-b-transparent
                    absolute -translate-y-[14px] -rotate-[60deg] origin-top-right -z-10
                    "></div>
                    <div className="
                    h-32 border-r-[15px] border-r-gray-300 
                    border-t-[40px] border-b-[88px]
                    border-t-transparent border-b-transparent
                    absolute -translate-y-[14px] -rotate-[180deg] origin-top-right -z-10
                    "></div>
                </div>
            </div>
            <div className="w-6 border-b-[220px] border-b-gray-400 border-l-[8px] border-r-[8px] border-l-transparent border-r-transparent"></div>
            <div className="w-full space-y-1">
                <div className="flex justify-between">
                    <span className="text-sm font-medium">Wind Speed</span>
                    <span className="text-sm">{windSpeed.toFixed(1)} m/s</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        ref={windBarRef}
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: '0%' }}
                    />
                </div>
            </div>
            <div className="w-full space-y-1">
                <div className="flex justify-between">
                    <span className="text-sm font-medium">Power Output</span>
                    <span className="text-sm">{powerOutput.toFixed(1)} kW</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        ref={powerBarRef}
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: '0%' }}
                    />
                </div>
            </div>
        </div>
    );
}
