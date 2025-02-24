"use client"

import type { Theme } from "@/stores/Theme"
import ActivityTimeline from "../components/feedback/activityTimeline";

interface ComponentProps {
  theme: Theme;
}

const FeedbackContent = ({
    theme,
}: ComponentProps): JSX.Element => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold mb-4">Feedback</h2>
            <ActivityTimeline />
        </div>
    )
}

export default FeedbackContent;