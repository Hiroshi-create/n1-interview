import { Interviews } from "@/stores/Interviews";
import { Theme } from "@/stores/Theme";
import { FieldValue, Timestamp } from "firebase/firestore";

export function isValidInterviewData(data: unknown): data is Interviews {
    return (
        typeof data === 'object' &&
        data !== null &&
        'interviewId' in data &&
        'intervieweeId' in data &&
        'answerInterviewId' in data &&
        'manageThemeId' in data &&
        'createdAt' in data &&
        'questionCount' in data &&
        'reportCreated' in data &&
        'interviewCollected' in data &&
        'interviewDurationMin' in data &&
        'themeId' in data &&
        'temporaryId' in data &&
        'confirmedUserId' in data &&
        typeof (data as any).interviewId === 'string' &&
        typeof (data as any).intervieweeId === 'string' &&
        typeof (data as any).answerInterviewId === 'string' &&
        typeof (data as any).manageThemeId === 'string' &&
        ((data as any).createdAt instanceof Timestamp || (data as any).createdAt instanceof FieldValue) &&
        typeof (data as any).questionCount === 'number' &&
        typeof (data as any).reportCreated === 'boolean' &&
        typeof (data as any).interviewCollected === 'boolean' &&
        typeof (data as any).interviewDurationMin === 'number' &&
        typeof (data as any).themeId === 'string' &&
        typeof (data as any).temporaryId === 'string' || (data as any).interviewResponseURL === null &&
        typeof (data as any).confirmedUserId === 'string' || (data as any).confirmedUserId === null
    );
}

export function isValidThemeData(data: unknown): data is Theme {
    return (
        typeof data === 'object' &&
        data !== null &&
        'themeId' in data &&
        'theme' in data &&
        'createUserId' in data &&
        'createdAt' in data &&
        'clientId' in data &&
        'interviewsRequestedCount' in data &&
        'collectInterviewsCount' in data &&
        'interviewDurationMin' in data &&
        'isPublic' in data &&
        'maximumNumberOfInterviews' in data &&
        'interviewResponseURL' in data &&
        typeof (data as any).themeId === 'string' &&
        typeof (data as any).theme === 'string' &&
        typeof (data as any).createUserId === 'string' &&
        (data as any).createdAt instanceof Timestamp &&
        typeof (data as any).clientId === 'string' &&
        typeof (data as any).interviewsRequestedCount === 'number' &&
        typeof (data as any).collectInterviewsCount === 'number' &&
        typeof (data as any).interviewDurationMin === 'number' &&
        typeof (data as any).isPublic === 'boolean' &&
        typeof (data as any).maximumNumberOfInterviews === 'number' &&
        typeof (data as any).interviewResponseURL === 'string' || (data as any).interviewResponseURL === null
    );
}