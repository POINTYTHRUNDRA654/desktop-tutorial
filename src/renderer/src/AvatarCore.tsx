import React from 'react';
import { useLive } from './LiveContext';
import MossyFaceAvatar from './MossyFaceAvatar';

interface AvatarCoreProps {
    className?: string;
    showRings?: boolean; 
}

const AvatarCore: React.FC<AvatarCoreProps> = ({ className = "w-full h-full", showRings = true }) => {
    const { isActive, mode } = useLive();
    
    return (
        <MossyFaceAvatar 
            className={className} 
            isActive={isActive} 
            mode={mode}
            showRings={showRings}
        />
    );
};

export default AvatarCore;
