import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    icon: LucideIcon;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, icon: Icon }) => {
    return (
        <h1 className="text-3xl font-semibold text-secondary flex items-center gap-3">
            {Icon && <Icon className="w-8 h-8 text-primary" />}
            {title}
        </h1>
    );
};

export default PageHeader;
