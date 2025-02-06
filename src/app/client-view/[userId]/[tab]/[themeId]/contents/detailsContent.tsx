"use client"

import type { Theme } from "@/stores/Theme"

interface ComponentProps {
  theme: Theme;
}

const DetailsContent = ({
    theme,
}: ComponentProps): JSX.Element => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold mb-4">Interview Details</h2>
            <p>Here you can display detailed information about the interview.</p>
        </div>
    )
}

export default DetailsContent;