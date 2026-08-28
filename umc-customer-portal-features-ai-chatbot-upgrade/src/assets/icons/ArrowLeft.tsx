
export default function ArrowLeft({
    onClick,
    className
}: React.SVGProps<SVGSVGElement>){
    return <svg className={className} onClick={onClick} width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_10015_31666)">
        <path d="M12.6455 23.4365C12.1732 23.9088 11.4088 23.9088 10.9365 23.4365L0.456056 12.9561C0.177913 12.7305 9.97045e-07 12.3861 1.0308e-06 12C1.4416e-05 11.6141 0.178172 11.2705 0.456056 11.0449L10.9365 0.563476C11.4088 0.091199 12.1732 0.0912257 12.6455 0.563476C13.1178 1.03577 13.1178 1.80017 12.6455 2.27246L4.14942 10.7695L22.7695 10.7695C23.4493 10.7695 24 11.3203 24 12C24 12.6797 23.4493 13.2305 22.7695 13.2305L4.14941 13.2305L12.6455 21.7275C13.1178 22.1998 13.1178 22.9642 12.6455 23.4365Z" />
        </g>
        <defs>
        <clipPath id="clip0_10015_31666">
            <rect width="24" height="24" fill="white" transform="translate(24 24) rotate(-180)"/>
        </clipPath>
        </defs>
    </svg>

}
