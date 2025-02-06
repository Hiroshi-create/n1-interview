import ClientsideThemeCard from "@/context/components/ui/clientsideThemeCard";
import { Theme } from "@/stores/Theme";
import { useRouter } from "next/navigation";

interface ComponentProps {
    tab: string;
    theme: Theme;
    userId: string | string[]
}

const BreadcrumbComponent = ({
    tab,
    theme,
    userId
}: ComponentProps): JSX.Element => {
    const router = useRouter();
    return (
        // <div className="flex items-center gap-2 border-b border-gray-300 px-4 py-3 mb-4">
        <div className="flex items-center rounded-lg">
            <h3 className="text-sm font-semibold">
            <span
                className="cursor-pointer hover:text-primary transition-colors duration-300"
                onClick={() => 
                router.push(`/client-view/${userId}/${tab}`)
                }
            >
                {tab}
            </span>
            &nbsp;&gt;&nbsp;
            <span className="text-text">{theme.theme}</span>
            </h3>
        </div>
    );
};

export default BreadcrumbComponent;