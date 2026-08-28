import SimpleBar from "@/components/SimpleBar";
import './index.less';

export default function ScrollBox({ children, className = '' }: React.PropsWithChildren<{ className?: string }>){
    const mergedClassName = [className, 'scroll-box-wrapper']
        .filter(Boolean)
        .join(' ');

    return <SimpleBar className={mergedClassName}>
        {children}
    </SimpleBar>
}
