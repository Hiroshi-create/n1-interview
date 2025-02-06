"use client"

import type { Theme } from "@/stores/Theme"

interface ComponentProps {
  theme: Theme;
}

const FeedbackContent = ({
    theme,
}: ComponentProps): JSX.Element => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold mb-4">Feedback</h2>
            <p>Here you can display feedback from the interview.</p>
        </div>
    )
}

export default FeedbackContent;