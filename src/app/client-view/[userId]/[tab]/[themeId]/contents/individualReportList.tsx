import { useAppsContext } from "@/context/AppContext";
import { IndividualReport } from "@/stores/IndividualReport";
import { Theme } from "@/stores/Theme";
import { useRouter } from "next/navigation";

interface ComponentProps {
    individualReports: IndividualReport[];
    interviewIds: string[];
    theme: Theme;
    temporaryIds: (string | null)[];
    confirmedUserIds: string[];
}

const IndividualReportList = ({
    individualReports,
    interviewIds,
    theme,
    temporaryIds,
    confirmedUserIds,
}: ComponentProps): JSX.Element => {
    const router = useRouter();
    const { userId, setSelectedInterviewId } = useAppsContext();

    const selectIndividualReport = (individualReportId: string, themeId: string, index: number) => {
        setSelectedInterviewId(interviewIds[index]);
        router.push(`/client-view/${userId}/Report/${themeId}/${individualReportId}`);
    }

    return (
        <ul className="">
            {individualReports.map((individualReport, index) => (
                <li 
                    key={individualReport.individualReportId}
                    className='cursor-pointer border-b border-gray-300 p-4 hover:bg-gray-100 transition-colors duration-300'
                    onClick={() => selectIndividualReport(
                        individualReport.individualReportId,
                        theme.themeId,
                        index
                    )}
                >
                    <span className="text-gray-800">{individualReport.individualReportId}</span>
                    <div className="text-gray-800">
                        {temporaryIds[index] 
                            ? `ワンタイムコード：${temporaryIds[index]}`
                            : confirmedUserIds[index]
                            ? "確認済み ✔️"
                            : "未確認"}
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default IndividualReportList;